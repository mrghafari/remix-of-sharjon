// Auto-apply monthly charges for buildings with auto_charge_enabled.
// Triggered daily by pg_cron. Applies charges when today's Jalali day matches
// the building's auto_charge_day (or last day of month if configured day > last day).
// Skips if already applied for the current Jalali month.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gregorian -> Jalali conversion (returns {jy, jm, jd})
function toJalali(gy: number, gm: number, gd: number) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // Esfand: 29 or 30 (leap)
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  let jp = breaks[0];
  let jump = 0;
  let leap = 0;
  for (let i = 1; i < breaks.length; i++) {
    const jm2 = breaks[i];
    jump = jm2 - jp;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get current Tehran date (Jalali)
  const now = new Date();
  const tehranStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [gy, gm, gd] = tehranStr.split("-").map(Number);
  const { jy, jm, jd } = toJalali(gy, gm, gd);
  const lastDay = jalaliMonthLength(jy, jm);

  // Fetch buildings with auto enabled
  const { data: buildings, error: bErr } = await supabase
    .from("buildings")
    .select("*")
    .eq("auto_charge_enabled", true);

  if (bErr) {
    return new Response(JSON.stringify({ error: bErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];

  for (const b of buildings || []) {
    const configuredDay = Math.max(1, Math.min(31, b.auto_charge_day || 1));
    const effectiveDay = Math.min(configuredDay, lastDay);

    // Only run on the effective day
    if (jd !== effectiveDay) {
      results.push({ building: b.name, skipped: "not the day", jd, effectiveDay });
      continue;
    }

    const chargeAmt = Number(b.default_charge_amount) || 0;
    const extraAmt = Number(b.default_extra_charge_amount) || 0;
    if (chargeAmt <= 0 && extraAmt <= 0) {
      results.push({ building: b.name, skipped: "no amounts" });
      continue;
    }

    const fundTypes: ("charge" | "extra_charge")[] = [];
    if (chargeAmt > 0) fundTypes.push("charge");
    if (extraAmt > 0) fundTypes.push("extra_charge");

    // Skip if already applied this month
    const { data: existing } = await supabase
      .from("unit_charges")
      .select("id")
      .eq("building_id", b.id)
      .eq("month", jm)
      .eq("year", jy)
      .in("fund_type", fundTypes)
      .limit(1);
    if (existing && existing.length > 0) {
      results.push({ building: b.name, skipped: "already applied" });
      continue;
    }

    // Load units
    const { data: units } = await supabase
      .from("units")
      .select("*")
      .eq("building_id", b.id);
    if (!units || units.length === 0) {
      results.push({ building: b.name, skipped: "no units" });
      continue;
    }

    // Load active manager with unit_id (for manager discount)
    const todayISO = tehranStr;
    const { data: managers } = await supabase
      .from("managers")
      .select("unit_id,charge_discount_percent,extra_charge_discount_percent")
      .eq("building_id", b.id)
      .eq("is_active", true)
      .lte("start_date", todayISO)
      .or(`end_date.is.null,end_date.gte.${todayISO}`);

    const mgr = (managers || []).find((m) => m.unit_id);
    const vacChargeDisc = b.vacant_charge_discount_percent || 0;
    const vacExtraDisc = b.vacant_extra_charge_discount_percent || 0;
    const mgrUnitId = mgr?.unit_id;
    const mgrChargeDisc = mgr?.charge_discount_percent || 0;
    const mgrExtraDisc = mgr?.extra_charge_discount_percent || 0;

    const JALALI_MONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
    const monthLabel = `${JALALI_MONTHS[jm - 1]} ${jy}`;

    const records: any[] = [];
    const buildRecords = (baseAmount: number, fundType: "charge" | "extra_charge") => {
      if (baseAmount <= 0) return;
      const vDisc = fundType === "charge" ? vacChargeDisc : vacExtraDisc;
      const mDisc = fundType === "charge" ? mgrChargeDisc : mgrExtraDisc;
      const desc = (fundType === "charge" ? "شارژ " : "فوق‌شارژ ") + monthLabel + " (اعمال خودکار)";
      for (const u of units) {
        let amount = baseAmount;
        if (!u.is_occupied && vDisc > 0) amount = amount * (1 - vDisc / 100);
        if (mgrUnitId && u.id === mgrUnitId && mDisc > 0) amount = amount * (1 - mDisc / 100);
        if (amount > 0) {
          records.push({
            building_id: b.id,
            unit_id: u.id,
            amount: Math.round(amount),
            fund_type: fundType,
            month: jm,
            year: jy,
            description: desc,
            owner_name: u.owner_name || null,
            resident_name: u.resident_name || null,
          });
        }
      }
    };

    buildRecords(chargeAmt, "charge");
    buildRecords(extraAmt, "extra_charge");

    if (records.length === 0) {
      results.push({ building: b.name, skipped: "no records" });
      continue;
    }

    const { error: insErr } = await supabase.from("unit_charges").insert(records);
    if (insErr) {
      results.push({ building: b.name, error: insErr.message });
    } else {
      results.push({ building: b.name, applied: records.length });
    }
  }

  return new Response(
    JSON.stringify({ date: { jy, jm, jd }, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
