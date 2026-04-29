// Test SMS edge function — sends a single test SMS using provided credentials
// without saving anything. Used by admin to verify provider configuration.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestSmsRequest {
  provider: "kavenegar" | "smsir" | "melipayamak" | "faraz";
  phone: string;
  message?: string;
  // provider credentials
  api_key?: string;
  sender?: string;
  line_number?: string;
  username?: string;
  password?: string;
  api_url?: string;
}

async function sendKavenegar(apiKey: string, sender: string, receptor: string, message: string, customUrl?: string) {
  const baseUrl = (customUrl && customUrl.trim())
    ? customUrl.replace("{API_KEY}", apiKey)
    : `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
  const params = new URLSearchParams({ receptor, sender, message });
  const res = await fetch(`${baseUrl}?${params}`);
  const data = await res.json();
  if (!res.ok || data?.return?.status !== 200) {
    throw new Error(data?.return?.message || `HTTP ${res.status}`);
  }
  return data?.entries?.[0]?.messageid?.toString() ?? null;
}

async function sendSmsIr(apiKey: string, lineNumber: string, receptor: string, message: string, customUrl?: string) {
  if (!lineNumber) throw new Error("شماره خط (Line Number) sms.ir وارد نشده است");
  const cleanLine = String(lineNumber).replace(/\D/g, "");
  const cleanPhone = String(receptor).replace(/\D/g, "");
  const url = (customUrl && customUrl.trim()) ? customUrl.trim() : "https://api.sms.ir/v1/send/bulk";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/plain",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      lineNumber: Number(cleanLine),
      messageText: message,
      mobiles: [cleanPhone],
    }),
  });

  let data: any = null;
  let rawText = "";
  try {
    rawText = await res.text();
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    // not JSON
  }

  if (!res.ok || !data || data.status !== 1) {
    const errMsg = data?.message
      || data?.Message
      || rawText
      || `HTTP ${res.status} ${res.statusText}`;
    throw new Error(`SMS.ir: ${errMsg}`);
  }
  return data?.data?.packId?.toString() ?? null;
}

async function sendMelipayamak(username: string, password: string, sender: string, receptor: string, message: string, customUrl?: string) {
  const url = (customUrl && customUrl.trim()) ? customUrl.trim() : "https://rest.payamak-panel.com/api/SendSMS/SendSMS";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      to: receptor,
      from: sender,
      text: message,
      isflash: false,
    }),
  });
  const data = await res.json();
  if (!res.ok || (data?.RetStatus !== 1 && data?.Value === undefined)) {
    throw new Error(data?.StrRetStatus || `HTTP ${res.status}`);
  }
  return data?.Value?.toString() ?? null;
}

async function sendFaraz(username: string, password: string, sender: string, receptor: string, message: string, customUrl?: string) {
  const url = (customUrl && customUrl.trim()) ? customUrl.trim() : "https://ippanel.com/api/select";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "send",
      user: username,
      pass: password,
      fromNum: sender,
      toNum: [receptor],
      message,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.errorMessage || `HTTP ${res.status}`);
  }
  return data?.data?.bulk_id?.toString() ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as TestSmsRequest;
    const { provider, phone } = body;
    const message = body.message?.trim() || "این یک پیامک تست از سامانه شارژان است.";

    if (!provider || !phone) {
      return new Response(JSON.stringify({ success: false, error: "سرویس و شماره موبایل الزامی است" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^09\d{9}$/.test(phone)) {
      return new Response(JSON.stringify({ success: false, error: "فرمت شماره موبایل صحیح نیست (مثال: 09121234567)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let providerMsgId: string | null = null;

    if (provider === "kavenegar") {
      if (!body.api_key) throw new Error("API Key کاوه‌نگار وارد نشده است");
      providerMsgId = await sendKavenegar(body.api_key, body.sender ?? "", phone, message, body.api_url);
    } else if (provider === "smsir") {
      if (!body.api_key) throw new Error("API Key سرویس SMS.ir وارد نشده است");
      providerMsgId = await sendSmsIr(body.api_key, body.line_number ?? body.sender ?? "", phone, message, body.api_url);
    } else if (provider === "melipayamak") {
      if (!body.username || !body.password) throw new Error("نام کاربری و رمز ملی‌پیامک وارد نشده است");
      providerMsgId = await sendMelipayamak(body.username, body.password, body.sender ?? "", phone, message, body.api_url);
    } else if (provider === "faraz") {
      if (!body.username || !body.password) throw new Error("نام کاربری و رمز فراز وارد نشده است");
      providerMsgId = await sendFaraz(body.username, body.password, body.sender ?? "", phone, message, body.api_url);
    } else {
      throw new Error(`سرویس نامعتبر: ${provider}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider,
        phone,
        message,
        provider_message_id: providerMsgId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200, // 200 so client can read body easily
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
