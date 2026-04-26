// SMS sending edge function — supports Kavenegar, SMS.ir, Melipayamak
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmsRequest {
  building_id: string;
  template_key: string;
  recipients: Array<{
    phone: string;
    name?: string;
    role?: "owner" | "resident";
    unit_id?: string;
    variables: Record<string, string | number>;
  }>;
}

function renderTemplate(body: string, vars: Record<string, string | number>): string {
  let out = body;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v ?? ""));
  }
  return out;
}

async function sendKavenegar(apiKey: string, sender: string, receptor: string, message: string) {
  const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
  const params = new URLSearchParams({ receptor, sender, message });
  const res = await fetch(`${url}?${params}`);
  const data = await res.json();
  if (!res.ok || data?.return?.status !== 200) {
    throw new Error(`Kavenegar: ${data?.return?.message || res.statusText}`);
  }
  return data?.entries?.[0]?.messageid?.toString() ?? null;
}

async function sendSmsIr(apiKey: string, sender: string, receptor: string, message: string) {
  const res = await fetch("https://api.sms.ir/v1/send/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      lineNumber: sender,
      messageText: message,
      mobiles: [receptor],
    }),
  });
  const data = await res.json();
  if (!res.ok || data?.status !== 1) {
    throw new Error(`SMS.ir: ${data?.message || res.statusText}`);
  }
  return data?.data?.packId?.toString() ?? null;
}

async function sendMelipayamak(username: string, password: string, sender: string, receptor: string, message: string) {
  const res = await fetch("https://rest.payamak-panel.com/api/SendSMS/SendSMS", {
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
    throw new Error(`Melipayamak: ${data?.StrRetStatus || res.statusText}`);
  }
  return data?.Value?.toString() ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as SmsRequest;
    const { building_id, template_key, recipients } = body;

    if (!building_id || !template_key || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load settings + template
    const [{ data: settings }, { data: template }] = await Promise.all([
      supabase.from("sms_settings").select("*").eq("building_id", building_id).maybeSingle(),
      supabase.from("sms_templates").select("*").eq("building_id", building_id).eq("template_key", template_key).maybeSingle(),
    ]);

    if (!settings || !settings.is_enabled) {
      return new Response(JSON.stringify({ error: "SMS service not enabled", skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!template || !template.is_active) {
      return new Response(JSON.stringify({ error: "Template not found or inactive", skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provider = settings.active_provider as string;
    const results: Array<{ phone: string; status: string; error?: string }> = [];

    for (const rcpt of recipients) {
      if (!rcpt.phone) continue;
      const message = renderTemplate(template.body, rcpt.variables ?? {});
      let status = "sent";
      let providerMsgId: string | null = null;
      let errorMessage: string | null = null;

      try {
        if (provider === "kavenegar") {
          if (!settings.kavenegar_api_key) throw new Error("Kavenegar API key not configured");
          providerMsgId = await sendKavenegar(settings.kavenegar_api_key, settings.kavenegar_sender ?? "", rcpt.phone, message);
        } else if (provider === "smsir") {
          if (!settings.smsir_api_key) throw new Error("SMS.ir API key not configured");
          providerMsgId = await sendSmsIr(settings.smsir_api_key, settings.smsir_sender ?? "", rcpt.phone, message);
        } else if (provider === "melipayamak") {
          if (!settings.melipayamak_username || !settings.melipayamak_password) throw new Error("Melipayamak credentials not configured");
          providerMsgId = await sendMelipayamak(settings.melipayamak_username, settings.melipayamak_password, settings.melipayamak_sender ?? "", rcpt.phone, message);
        } else {
          throw new Error(`Unknown provider: ${provider}`);
        }
      } catch (e) {
        status = "failed";
        errorMessage = e instanceof Error ? e.message : String(e);
      }

      await supabase.from("sms_logs").insert({
        building_id,
        template_key,
        recipient_phone: rcpt.phone,
        recipient_name: rcpt.name ?? null,
        recipient_role: rcpt.role ?? null,
        unit_id: rcpt.unit_id ?? null,
        message_body: message,
        provider,
        status,
        provider_message_id: providerMsgId,
        error_message: errorMessage,
      });

      results.push({ phone: rcpt.phone, status, error: errorMessage ?? undefined });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
