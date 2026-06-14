import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DURATION_DAYS = 365;

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

    const perUnitRial = Math.round(Number(plan.price_per_unit_rial ?? 0));
    const amountRial = perUnitRial * units;

    if (amountRial <= 0) {
      // Free plan: activate directly
      const { data: payRow } = await supabase.from("subscription_payments").insert([{
        user_id: user.id, plan_id: plan.id, amount_rial: 0, gateway: "free", status: "pending",
        meta: { unit_count: units },
      }]).select().single();
      await activateSubscription(supabase, user.id, plan, units, payRow!.id, "FREE-" + payRow!.id.slice(0, 8));
      const origin = req.headers.get("origin") || "";
      return new Response(JSON.stringify({ redirect_url: `${origin}/dashboard?tab=subscription&payment=ok`, free: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const merchantId = Deno.env.get("ZARINPAL_MERCHANT_ID");
    const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "";
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/subscription-payment-callback?return=${encodeURIComponent(origin)}`;

    const { data: payRow, error: payErr } = await supabase
      .from("subscription_payments").insert([{
        user_id: user.id, plan_id: plan.id, amount_rial: amountRial,
        gateway: "zarinpal", status: "pending",
        meta: { unit_count: units, per_unit_rial: perUnitRial },
      }]).select().single();
    if (payErr) throw payErr;

    if (!merchantId) {
      await activateSubscription(supabase, user.id, plan, units, payRow.id, "TEST-" + payRow.id.slice(0, 8));
      return new Response(JSON.stringify({
        redirect_url: `${origin}/dashboard?tab=subscription&payment=ok`, sandbox: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const zpRes = await fetch("https://api.zarinpal.com/pg/v4/payment/request.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: amountRial,
        callback_url: callbackUrl,
        description: `خرید پلن ${plan.name} - ${units} واحد`,
        metadata: { payment_id: payRow.id, user_id: user.id },
      }),
    });
    const zpData = await zpRes.json();
    if (!zpData?.data?.authority) {
      await supabase.from("subscription_payments").update({ status: "failed", meta: zpData }).eq("id", payRow.id);
      return new Response(JSON.stringify({ error: "zarinpal request failed", details: zpData }),
        { status: 500, headers: corsHeaders });
    }
    await supabase.from("subscription_payments").update({ authority: zpData.data.authority }).eq("id", payRow.id);

    return new Response(JSON.stringify({
      redirect_url: `https://www.zarinpal.com/pg/StartPay/${zpData.data.authority}`,
      authority: zpData.data.authority,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});

async function activateSubscription(supabase: any, userId: string, plan: any, units: number, paymentId: string, refId: string) {
  const { data: existing } = await supabase.from("customer_subscriptions")
    .select("*").eq("user_id", userId).order("expires_at", { ascending: false }).limit(1).maybeSingle();
  const now = new Date();
  if (existing && existing.is_active && new Date(existing.expires_at) > now) {
    const expiresAt = new Date(new Date(existing.expires_at).getTime() + DURATION_DAYS * 86400000);
    await supabase.from("customer_subscriptions").update({
      plan_id: plan.id, unit_quota: Math.max(existing.unit_quota, units),
      expires_at: expiresAt.toISOString(), is_active: true,
    }).eq("id", existing.id);
    await supabase.from("subscription_payments").update({
      status: "paid", payment_date: now.toISOString(), ref_id: refId, subscription_id: existing.id,
    }).eq("id", paymentId);
  } else {
    const expiresAt = new Date(now.getTime() + DURATION_DAYS * 86400000);
    const { data: subNew } = await supabase.from("customer_subscriptions").insert([{
      user_id: userId, plan_id: plan.id, unit_quota: units,
      starts_at: now.toISOString(), expires_at: expiresAt.toISOString(), is_active: true,
    }]).select().single();
    await supabase.from("subscription_payments").update({
      status: "paid", payment_date: now.toISOString(), ref_id: refId, subscription_id: subNew?.id,
    }).eq("id", paymentId);
  }
}
