// Auto-apply monthly late penalties for buildings with policy.late_penalty_enabled
// and policy.late_penalty_auto_apply. Triggered daily by pg_cron.
// For each past Jalali month (up to late_penalty_max_months back), computes
// end-of-month debt per unit (excluding penalty rows) and inserts a penalty
// record for each debtor unit if not already applied.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JALALI_MONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];

// Gregorian -> Jalali
function toJalali(gy: number, gm: number, gd: number) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

// Jalali -> Gregorian
function toGregorian(jy: number, jm: number, jd: number) {
  const jy1 = jy + 1595;
  let days =
    -355668 + 365 * jy1 + Math.floor(jy1 / 33) * 8 +
    Math.floor(((jy1 % 33) + 3) / 4) + jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 1; gm <= 12 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return { gy, gm, gd };
}

function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  let jp = breaks[0]; let jump = 0; let leap = 0;
  for (let i = 1; i < breaks.length; i++) {
    const jm2 = breaks[i]; jump = jm2 - jp;
    if (jy < jm2) break;
    jp = jm2;
  }
  let n = jy - jp;
  if (n < jump) {
    if (jump - n < 6) n = n - jump + ((jump + 4) / 33 | 0) * 33;
    leap = (((n + 1) % 33) - 1) % 4;
    if (leap === -1) leap = 4;
  }
  return leap === 0 ? 30 : 29;
}

function endOfJalaliMonthIso(jy: number, jm: number): string {
  const last = jalaliMonthLength(jy, jm);
  const { gy, gm, gd } = toGregorian(jy, jm, last);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

const isPenaltyDescription = (d?: string | null) =>
  !!d && (d.startsWith("جریمه تأخیر") || d.startsWith("جریمه "));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Current Tehran Jalali date
  const tehranStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const [gy, gm, gd] = tehranStr.split("-").map(Number);
  const { jy: curY, jm: curM } = toJalali(gy, gm, gd);

  // All buildings with policies enabled for auto-apply
  const { data: policies, error: pErr } = await supabase
    .from("building_payment_policies")
    .select("building_id, late_penalty_enabled, late_penalty_auto_apply, late_penalty_percent_per_month, late_penalty_max_months")
    .eq("late_penalty_enabled", true)
    .eq("late_penalty_auto_apply", true);

  if (pErr) {
    return new Response(JSON.stringify({ error: pErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];

  for (const pol of policies || []) {
    const buildingId = pol.building_id;
    const pct = Number(pol.late_penalty_percent_per_month) || 0;
    if (pct <= 0) { results.push({ buildingId, skipped: "no percent" }); continue; }
    const maxMonths = Math.max(1, pol.late_penalty_max_months || 1);

    // Build target periods (past months only)
    const periods: { y: number; m: number }[] = [];
    for (let i = 1; i <= maxMonths; i++) {
      let m = curM - i; let y = curY;
      while (m <= 0) { m += 12; y -= 1; }
      periods.push({ y, m });
    }

    // Load data once per building
    const [{ data: units }, { data: payments }, { data: shares }, { data: expenses }, { data: charges }] = await Promise.all([
      supabase.from("units").select("id, owner_name, resident_name, late_penalty_exempt").eq("building_id", buildingId),
      supabase.from("payments").select("unit_id, amount, payment_date").eq("building_id", buildingId),
      supabase.from("expense_unit_shares").select("unit_id, expense_id, allocated_amount, created_at").eq("building_id", buildingId),
      supabase.from("expenses").select("id, expense_date").eq("building_id", buildingId),
      supabase.from("unit_charges").select("unit_id, amount, month, year, description").eq("building_id", buildingId),
    ]);

    if (!units || units.length === 0) {
      results.push({ buildingId, skipped: "no units" }); continue;
    }

    const expenseDateMap = new Map<string, string>();
    for (const e of expenses || []) {
      if (e.expense_date) expenseDateMap.set(e.id, String(e.expense_date).split("T")[0]);
    }

    let inserted = 0;
    const perPeriod: any[] = [];

    for (const { y, m } of periods) {
      const cutoffIso = endOfJalaliMonthIso(y, m);

      const paySum = new Map<string, number>();
      for (const p of payments || []) {
        if (p.payment_date && String(p.payment_date) <= cutoffIso) {
          paySum.set(p.unit_id, (paySum.get(p.unit_id) || 0) + Number(p.amount || 0));
        }
      }
      const chargeSum = new Map<string, number>();
      for (const c of charges || []) {
        const within = c.year < y || (c.year === y && c.month <= m);
        if (!within) continue;
        if (isPenaltyDescription(c.description)) continue;
        chargeSum.set(c.unit_id, (chargeSum.get(c.unit_id) || 0) + Number(c.amount || 0));
      }


      const records: any[] = [];
      for (const u of units) {
        if (u.late_penalty_exempt) continue;
        const already = (charges || []).some((c: any) =>
          c.unit_id === u.id && c.month === m && c.year === y && isPenaltyDescription(c.description)
        );
        if (already) continue;
        const paid = paySum.get(u.id) || 0;
        const ch = chargeSum.get(u.id) || 0;
        const balance = paid - ch;

        if (balance >= 0) continue;
        const debt = Math.abs(balance);
        const penalty = Math.round((debt * pct) / 100);
        if (penalty <= 0) continue;
        records.push({
          building_id: buildingId,
          unit_id: u.id,
          amount: penalty,
          fund_type: "charge",
          month: m,
          year: y,
          description: `جریمه ${JALALI_MONTHS[m - 1]} ${y}`,
          owner_name: u.owner_name || null,
          resident_name: u.resident_name || null,
        });
      }

      if (records.length > 0) {
        const { error: insErr } = await supabase.from("unit_charges").insert(records);
        if (insErr) {
          perPeriod.push({ y, m, error: insErr.message });
        } else {
          inserted += records.length;
          perPeriod.push({ y, m, applied: records.length });
          // also mirror into local `charges` array so subsequent periods see them
          for (const r of records) {
            (charges as any[]).push({
              unit_id: r.unit_id, amount: r.amount,
              month: r.month, year: r.year, description: r.description,
            });
          }
        }
      }
    }

    results.push({ buildingId, inserted, perPeriod });
  }

  return new Response(
    JSON.stringify({ date: { jy: curY, jm: curM }, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
