import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const DURATION_DAYS = 365;

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
      .update({ status: "failed", meta: { ...(payRow.meta as any), verify: verifyData } }).eq("id", payRow.id);
    return fail("verify_failed");
  }

  const refId = String(verifyData.data.ref_id);
  const { data: plan } = await supabase.from("subscription_plans").select("*").eq("id", payRow.plan_id).single();
  if (!plan) return fail("plan_missing");

  const units = Math.max(1, parseInt(String((payRow.meta as any)?.unit_count ?? 1), 10));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DURATION_DAYS * 86400000);

  // Deactivate prior, then insert fresh subscription (always reset to 365 days)
  await supabase.from("customer_subscriptions")
    .update({ is_active: false })
    .eq("user_id", payRow.user_id)
    .eq("is_active", true);

  const { data: newSub } = await supabase.from("customer_subscriptions").insert([{
    user_id: payRow.user_id, plan_id: plan.id, unit_quota: units,
    starts_at: now.toISOString(), expires_at: expiresAt.toISOString(), is_active: true,
  }]).select().single();

  await supabase.from("subscription_payments").update({
    status: "paid", payment_date: now.toISOString(), ref_id: refId, subscription_id: newSub!.id,
  }).eq("id", payRow.id);

  return ok();
});
