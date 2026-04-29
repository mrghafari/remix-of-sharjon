// Callback for SMS payment - verifies and approves the request
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function htmlRedirect(targetUrl: string, message: string, success: boolean) {
  const color = success ? "#16a34a" : "#dc2626";
  return `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>نتیجه پرداخت</title>
  <meta http-equiv="refresh" content="3;url=${targetUrl}">
  <style>body{font-family:Tahoma,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
  .card{background:white;padding:32px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center;max-width:420px}
  .icon{font-size:48px;margin-bottom:12px;color:${color}}
  h1{color:${color};margin:0 0 8px;font-size:20px}
  p{color:#475569;margin:8px 0}
  a{color:#2563eb;text-decoration:none}
  </style></head><body><div class="card">
  <div class="icon">${success ? "✓" : "✕"}</div>
  <h1>${success ? "پرداخت موفق" : "پرداخت ناموفق"}</h1>
  <p>${message}</p>
  <p style="font-size:13px;color:#94a3b8">در حال انتقال به سامانه...</p>
  <p><a href="${targetUrl}">اگر منتقل نشدید کلیک کنید</a></p>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const requestId = url.searchParams.get("req");
  const origin = url.searchParams.get("origin") || "";
  const returnUrl = `${origin}/?sms_payment=done`;

  try {
    if (!requestId) throw new Error("شناسه درخواست یافت نشد");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: reqRow, error: reqErr } = await admin
      .from("sms_credit_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (reqErr || !reqRow) throw new Error("درخواست یافت نشد");

    if (reqRow.status === "approved" || reqRow.status === "paid") {
      return new Response(htmlRedirect(returnUrl, "این پرداخت قبلاً تأیید شده است", true), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Load gateway config used at init time
    const { data: customerSetting } = await admin
      .from("customer_settings")
      .select("setting_value, is_enabled")
      .eq("setting_key", "payment_gateways")
      .eq("user_id", reqRow.requested_by)
      .maybeSingle();
    const { data: platformSetting } = await admin
      .from("platform_settings")
      .select("setting_value, is_enabled")
      .eq("setting_key", "payment_gateways")
      .maybeSingle();
    const gatewayConfig: any =
      (customerSetting?.is_enabled && customerSetting?.setting_value) ||
      platformSetting?.setting_value ||
      {};

    const provider = reqRow.gateway as "zarinpal" | "idpay" | "nextpay";
    const amount = Math.round(Number(reqRow.amount));
    let verified = false;
    let refId = "";
    let failReason = "";

    if (provider === "zarinpal") {
      const status = url.searchParams.get("Status");
      const authority = url.searchParams.get("Authority") || reqRow.authority;
      if (status !== "OK") {
        failReason = "پرداخت لغو شد";
      } else {
        const sandbox = gatewayConfig.zarinpal?.sandbox ?? true;
        const apiBase = sandbox ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
        const r = await fetch(`${apiBase}/pg/v4/payment/verify.json`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            merchant_id: gatewayConfig.zarinpal?.merchant_id,
            amount,
            authority,
          }),
        });
        const j = await r.json();
        if (j?.data?.code === 100 || j?.data?.code === 101) {
          verified = true;
          refId = String(j.data.ref_id ?? "");
        } else {
          failReason = "تأیید ناموفق: " + JSON.stringify(j?.errors || j);
        }
      }
    } else if (provider === "idpay") {
      const status = url.searchParams.get("status");
      const trackId = url.searchParams.get("track_id");
      const id = url.searchParams.get("id") || reqRow.authority;
      if (status !== "10") {
        failReason = "پرداخت ناموفق (status=" + status + ")";
      } else {
        const sandbox = gatewayConfig.idpay?.sandbox ?? true;
        const r = await fetch("https://api.idpay.ir/v1.1/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": gatewayConfig.idpay?.api_key,
            "X-SANDBOX": sandbox ? "1" : "0",
          },
          body: JSON.stringify({ id, order_id: requestId }),
        });
        const j = await r.json();
        if (j?.status === 100 || j?.status === 101) {
          verified = true;
          refId = String(j.track_id ?? trackId ?? "");
        } else {
          failReason = "تأیید ناموفق: " + JSON.stringify(j);
        }
      }
    } else if (provider === "nextpay") {
      const transId = url.searchParams.get("trans_id") || reqRow.authority;
      const orderId = url.searchParams.get("order_id") || requestId;
      const r = await fetch("https://nextpay.org/nx/gateway/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          api_key: gatewayConfig.nextpay?.api_key || "",
          trans_id: transId,
          order_id: orderId,
          amount: String(amount),
          currency: "TMN",
        }),
      });
      const j = await r.json();
      if (j?.code === 0) {
        verified = true;
        refId = String(j.Shaparak_Ref_Id ?? transId);
      } else {
        failReason = "تأیید ناموفق: " + JSON.stringify(j);
      }
    }

    if (verified) {
      await admin
        .from("sms_credit_requests")
        .update({
          status: "approved",
          paid_at: new Date().toISOString(),
          ref_id: refId,
          admin_note: `پرداخت آنلاین موفق - ${provider} - شماره مرجع: ${refId}`,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return new Response(
        htmlRedirect(returnUrl, `پرداخت با موفقیت انجام شد. شماره مرجع: ${refId}`, true),
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    } else {
      await admin
        .from("sms_credit_requests")
        .update({
          status: "payment_failed",
          admin_note: failReason,
        })
        .eq("id", requestId);

      return new Response(htmlRedirect(returnUrl, failReason || "پرداخت تأیید نشد", false), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  } catch (e: any) {
    console.error("sms-payment-callback error:", e);
    return new Response(htmlRedirect(returnUrl, e.message || "خطای داخلی", false), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
