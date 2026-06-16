import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DURATION_DAYS = 365;

// Compute remaining credit in rial. For downgrade, use new (lower) plan rate.
// For renewal/upgrade, use the original (current) plan rate.
function computeCredit(args: {
  current_per_unit_rial: number;
  current_quota: number;
  new_per_unit_rial: number;
  days_remaining: number;
}): number {
  const { current_per_unit_rial, current_quota, new_per_unit_rial, days_remaining } = args;
  if (days_remaining <= 0 || current_quota <= 0) return 0;
  const isDowngrade = new_per_unit_rial < current_per_unit_rial;
  const ratePerUnit = isDowngrade ? new_per_unit_rial : current_per_unit_rial;
  const credit = (days_remaining / DURATION_DAYS) * ratePerUnit * current_quota;
  return Math.max(0, Math.round(credit));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const { plan_id, unit_count } = await req.json();
    if (!plan_id) return new Response(JSON.stringify({ error: "plan_id required" }), { status: 400, headers: corsHeaders });
    const units = Math.max(1, parseInt(String(unit_count ?? 1), 10));

    const { data: plan, error: planErr } = await supabase
      .from("subscription_plans").select("*").eq("id", plan_id).eq("is_active", true).single();
    if (planErr || !plan) return new Response(JSON.stringify({ error: "plan not found" }), { status: 404, headers: corsHeaders });

    if (plan.is_contact_only) {
      return new Response(JSON.stringify({ error: "این پلن نیازمند تماس با پشتیبانی است" }), { status: 400, headers: corsHeaders });
    }

    const newPerUnit = Math.round(Number(plan.price_per_unit_rial ?? 0));

    // Load current active subscription to compute credit & validate downgrade rules
    const { data: existing } = await supabase.from("customer_subscriptions")
      .select("*, subscription_plans(price_per_unit_rial)")
      .eq("user_id", user.id).order("expires_at", { ascending: false }).limit(1).maybeSingle();

    const now = new Date();
    const hasActive = existing && existing.is_active && new Date(existing.expires_at) > now;
    const currentPerUnit = hasActive
      ? Math.round(Number((existing as any).subscription_plans?.price_per_unit_rial ?? 0))
      : 0;
    const currentQuota = hasActive ? Number(existing.unit_quota || 0) : 0;
    const daysRemaining = hasActive
      ? Math.max(0, Math.floor((new Date(existing.expires_at).getTime() - now.getTime()) / 86400000))
      : 0;

    // Block downgrade to free
    if (hasActive && currentPerUnit > 0 && newPerUnit <= 0) {
      return new Response(JSON.stringify({ error: "امکان تنزل به پلن رایگان وجود ندارد" }), { status: 400, headers: corsHeaders });
    }

    const newAmount = newPerUnit * units;
    const creditRial = hasActive
      ? computeCredit({
          current_per_unit_rial: currentPerUnit,
          current_quota: currentQuota,
          new_per_unit_rial: newPerUnit,
          days_remaining: daysRemaining,
        })
      : 0;
    const payable = Math.max(0, newAmount - creditRial);

    const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "";

    // Zero payable (free plan OR fully covered by credit) → activate immediately
    if (payable <= 0) {
      const { data: payRow } = await supabase.from("subscription_payments").insert([{
        user_id: user.id, plan_id: plan.id,
        amount_rial: 0,
        gateway: newAmount > 0 ? "credit" : "free",
        status: "pending",
        meta: { unit_count: units, per_unit_rial: newPerUnit, credit_used_rial: creditRial, gross_rial: newAmount },
      }]).select().single();
      await activateSubscription(supabase, user.id, plan, units, payRow!.id,
        (newAmount > 0 ? "CR-" : "FREE-") + payRow!.id.slice(0, 8));
      return new Response(JSON.stringify({
        redirect_url: `${origin}/dashboard?tab=subscription&payment=ok`,
        free: true, credit_used_rial: creditRial,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const merchantId = Deno.env.get("ZARINPAL_MERCHANT_ID");
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/subscription-payment-callback?return=${encodeURIComponent(origin)}`;

    const { data: payRow, error: payErr } = await supabase
      .from("subscription_payments").insert([{
        user_id: user.id, plan_id: plan.id, amount_rial: payable,
        gateway: "zarinpal", status: "pending",
        meta: { unit_count: units, per_unit_rial: newPerUnit, credit_used_rial: creditRial, gross_rial: newAmount },
      }]).select().single();
    if (payErr) throw payErr;

    if (!merchantId) {
      await activateSubscription(supabase, user.id, plan, units, payRow.id, "TEST-" + payRow.id.slice(0, 8));
      return new Response(JSON.stringify({
        redirect_url: `${origin}/dashboard?tab=subscription&payment=ok`, sandbox: true,
        credit_used_rial: creditRial,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const zpRes = await fetch("https://api.zarinpal.com/pg/v4/payment/request.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: payable,
        callback_url: callbackUrl,
        description: `پلن ${plan.name} - ${units} واحد` + (creditRial > 0 ? ` (اعتبار قبلی: ${creditRial} ریال)` : ""),
        metadata: { payment_id: payRow.id, user_id: user.id },
      }),
    });
    const zpData = await zpRes.json();
    if (!zpData?.data?.authority) {
      await supabase.from("subscription_payments").update({ status: "failed", meta: { ...(payRow.meta as any), zp: zpData } }).eq("id", payRow.id);
      return new Response(JSON.stringify({ error: "zarinpal request failed", details: zpData }),
        { status: 500, headers: corsHeaders });
    }
    await supabase.from("subscription_payments").update({ authority: zpData.data.authority }).eq("id", payRow.id);

    return new Response(JSON.stringify({
      redirect_url: `https://www.zarinpal.com/pg/StartPay/${zpData.data.authority}`,
      authority: zpData.data.authority,
      credit_used_rial: creditRial,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});

// Always reset expiry to today + 365 days. Deactivate any existing subscription
// (credit already deducted on the new payment row).
async function activateSubscription(supabase: any, userId: string, plan: any, units: number, paymentId: string, refId: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DURATION_DAYS * 86400000);

  // Deactivate any prior subscription
  await supabase.from("customer_subscriptions")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  const { data: subNew } = await supabase.from("customer_subscriptions").insert([{
    user_id: userId, plan_id: plan.id, unit_quota: units,
    starts_at: now.toISOString(), expires_at: expiresAt.toISOString(), is_active: true,
  }]).select().single();
  await supabase.from("subscription_payments").update({
    status: "paid", payment_date: now.toISOString(), ref_id: refId, subscription_id: subNew?.id,
  }).eq("id", paymentId);
}
