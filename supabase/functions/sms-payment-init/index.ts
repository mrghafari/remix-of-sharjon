// Initiates payment for SMS package purchase
// Returns redirect URL to selected gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // user-scoped client (validate caller)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const user = userData.user;

    const body = await req.json();
    const { building_id, package_id, manager_note } = body;
    if (!building_id || !package_id) throw new Error("اطلاعات ناقص");

    // service client for trusted reads/writes
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller is manager
    const { data: isMgr } = await admin.rpc("is_building_manager", {
      _user_id: user.id,
      _building_id: building_id,
    });
    if (!isMgr) throw new Error("شما مدیر این ساختمان نیستید");

    // Load package
    const { data: pkg, error: pkgErr } = await admin
      .from("sms_packages")
      .select("*")
      .eq("id", package_id)
      .eq("is_active", true)
      .maybeSingle();
    if (pkgErr || !pkg) throw new Error("بسته یافت نشد");

    const amount = Math.round(Number(pkg.price));
    if (!amount || amount < 1000) throw new Error("مبلغ نامعتبر");

    // Find an enabled gateway (customer-specific overrides platform)
    const { data: customerSetting } = await admin
      .from("customer_settings")
      .select("setting_value, is_enabled")
      .eq("setting_key", "payment_gateways")
      .eq("user_id", user.id)
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

    // Pick first enabled provider with priority: zarinpal > idpay > nextpay
    let provider: "zarinpal" | "idpay" | "nextpay" | null = null;
    if (gatewayConfig.zarinpal?.enabled && gatewayConfig.zarinpal?.merchant_id) provider = "zarinpal";
    else if (gatewayConfig.idpay?.enabled && gatewayConfig.idpay?.api_key) provider = "idpay";
    else if (gatewayConfig.nextpay?.enabled && gatewayConfig.nextpay?.api_key) provider = "nextpay";

    if (!provider) {
      throw new Error("هیچ درگاه پرداختی فعال نشده است. لطفاً با مدیر سامانه تماس بگیرید.");
    }

    // Create the credit request row first (status pending, gateway recorded)
    const { data: reqRow, error: reqErr } = await admin
      .from("sms_credit_requests")
      .insert({
        building_id,
        requested_by: user.id,
        package_count: pkg.package_count,
        manager_note: manager_note || null,
        status: "pending_payment",
        gateway: provider,
        amount,
      })
      .select("id")
      .single();
    if (reqErr) throw reqErr;

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const callbackUrl = `${SUPABASE_URL}/functions/v1/sms-payment-callback?req=${reqRow.id}&origin=${encodeURIComponent(origin)}`;
    const description = `خرید بسته ${pkg.package_count} پیامک`;

    let redirectUrl = "";

    if (provider === "zarinpal") {
      const sandbox = gatewayConfig.zarinpal?.sandbox ?? true;
      const apiBase = sandbox ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
      const startBase = sandbox ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
      const res = await fetch(`${apiBase}/pg/v4/payment/request.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          merchant_id: gatewayConfig.zarinpal.merchant_id,
          amount, // toman * 10 for IRR? ZarinPal v4 expects amount in IRR (rial). We use toman in DB so multiply.
          currency: "IRT",
          description,
          callback_url: callbackUrl,
        }),
      });
      const j = await res.json();
      if (!j?.data?.authority) {
        throw new Error("خطا در ارتباط با زرین‌پال: " + JSON.stringify(j?.errors || j));
      }
      await admin.from("sms_credit_requests").update({ authority: j.data.authority }).eq("id", reqRow.id);
      redirectUrl = `${startBase}/pg/StartPay/${j.data.authority}`;
    } else if (provider === "idpay") {
      const sandbox = gatewayConfig.idpay?.sandbox ?? true;
      const res = await fetch("https://api.idpay.ir/v1.1/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": gatewayConfig.idpay.api_key,
          "X-SANDBOX": sandbox ? "1" : "0",
        },
        body: JSON.stringify({
          order_id: reqRow.id,
          amount: amount * 10, // IDPay uses Rial
          callback: callbackUrl,
          desc: description,
        }),
      });
      const j = await res.json();
      if (!j?.link || !j?.id) throw new Error("خطا در ارتباط با IDPay: " + JSON.stringify(j));
      await admin.from("sms_credit_requests").update({ authority: j.id }).eq("id", reqRow.id);
      redirectUrl = j.link;
    } else if (provider === "nextpay") {
      const res = await fetch("https://nextpay.org/nx/gateway/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          api_key: gatewayConfig.nextpay.api_key,
          order_id: reqRow.id,
          amount: String(amount), // NextPay supports toman with currency param
          callback_uri: callbackUrl,
          customer_phone: "",
          currency: "TMN",
        }),
      });
      const j = await res.json();
      if (j?.code !== -1 || !j?.trans_id) throw new Error("خطا در ارتباط با NextPay: " + JSON.stringify(j));
      await admin.from("sms_credit_requests").update({ authority: j.trans_id }).eq("id", reqRow.id);
      redirectUrl = `https://nextpay.org/nx/gateway/payment/${j.trans_id}`;
    }

    return new Response(JSON.stringify({ redirect_url: redirectUrl, request_id: reqRow.id, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("sms-payment-init error:", e);
    return new Response(JSON.stringify({ error: e.message || "خطای ناشناخته" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
