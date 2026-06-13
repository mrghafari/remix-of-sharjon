import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const authority = url.searchParams.get("Authority");
  const status = url.searchParams.get("Status");
  const returnUrl = url.searchParams.get("return") || "";

  const fail = (reason = "failed") =>
    Response.redirect(`${returnUrl}/dashboard?tab=subscription&payment=failed&reason=${reason}`, 302);
  const ok = () =>
    Response.redirect(`${returnUrl}/dashboard?tab=subscription&payment=ok`, 302);

  if (!authority) return fail("no_authority");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: payRow } = await supabase
    .from("subscription_payments").select("*").eq("authority", authority).maybeSingle();
  if (!payRow) return fail("not_found");

  if (status !== "OK") {
    await supabase.from("subscription_payments").update({ status: "failed" }).eq("id", payRow.id);
    return fail("user_cancelled");
  }

  const merchantId = Deno.env.get("ZARINPAL_MERCHANT_ID");
  if (!merchantId) return fail("misconfigured");

  const verifyRes = await fetch("https://api.zarinpal.com/pg/v4/payment/verify.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant_id: merchantId, amount: payRow.amount_rial, authority }),
  });
  const verifyData = await verifyRes.json();
  if (verifyData?.data?.code !== 100 && verifyData?.data?.code !== 101) {
    await supabase.from("subscription_payments")
      .update({ status: "failed", meta: verifyData }).eq("id", payRow.id);
    return fail("verify_failed");
  }

  const refId = String(verifyData.data.ref_id);
  const { data: plan } = await supabase.from("subscription_plans").select("*").eq("id", payRow.plan_id).single();
  if (!plan) return fail("plan_missing");

  // Extend or create subscription
  const { data: existing } = await supabase.from("customer_subscriptions")
    .select("*").eq("user_id", payRow.user_id).order("expires_at", { ascending: false }).limit(1).maybeSingle();
  const now = new Date();
  let subId: string;
  if (existing && existing.is_active && new Date(existing.expires_at) > now) {
    const newExp = new Date(new Date(existing.expires_at).getTime() + plan.duration_days * 86400000);
    await supabase.from("customer_subscriptions").update({
      plan_id: plan.id,
      unit_quota: Math.max(existing.unit_quota, plan.unit_quota),
      expires_at: newExp.toISOString(),
      is_active: true,
    }).eq("id", existing.id);
    subId = existing.id;
  } else {
    const exp = new Date(now.getTime() + plan.duration_days * 86400000);
    const { data: newSub } = await supabase.from("customer_subscriptions").insert([{
      user_id: payRow.user_id, plan_id: plan.id, unit_quota: plan.unit_quota,
      starts_at: now.toISOString(), expires_at: exp.toISOString(), is_active: true,
    }]).select().single();
    subId = newSub!.id;
  }

  await supabase.from("subscription_payments").update({
    status: "paid", payment_date: now.toISOString(), ref_id: refId, subscription_id: subId,
  }).eq("id", payRow.id);

  return ok();
});
