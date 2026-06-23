import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIXED_OTP = "123456";

function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, "");
  if (p.startsWith("+98")) p = "0" + p.slice(3);
  if (p.startsWith("98") && p.length === 12) p = "0" + p.slice(2);
  return p;
}

async function findUserByEmail(admin: any, email: string) {
  const e = email.toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users ?? [];
    const exact = users.find((u: any) => u.email?.toLowerCase() === e);
    if (exact) return exact;
    if (users.length < 200) break;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, phone, otp, full_name, agency_name, city, national_code, license_number } = body;
    if (!phone) throw new Error("شماره موبایل الزامی است");

    const normalizedPhone = normalizePhone(phone);
    const email = `${normalizedPhone}@agent.local`;

    if (action === "request") {
      // Don't leak whether the agent exists
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (otp !== FIXED_OTP) {
        return new Response(JSON.stringify({ success: false, message: "کد اشتباه است" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let user = await findUserByEmail(admin, email);
      let isNew = false;

      if (!user) {
        if (!full_name) {
          return new Response(JSON.stringify({ success: false, needs_signup: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        isNew = true;
        const { data: newUser, error } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { phone: normalizedPhone, full_name, is_agent: true },
        });
        if (error) throw error;
        user = newUser.user;

        // Ensure profile
        await admin.from("profiles").upsert(
          { user_id: user!.id, full_name, phone: normalizedPhone },
          { onConflict: "user_id" }
        );

        // Create real_estate_agent record (pending)
        await admin.from("real_estate_agents").insert({
          user_id: user!.id,
          full_name,
          mobile: normalizedPhone,
          agency_name: agency_name || null,
          city: city || null,
          national_code: national_code || null,
          license_number: license_number || null,
          status: "pending",
        });
      }

      // Check agent status
      const { data: agentRow } = await admin
        .from("real_estate_agents")
        .select("status, full_name")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!agentRow) {
        return new Response(JSON.stringify({ success: false, needs_signup: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate magic link token
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (linkErr) throw linkErr;
      const tokenHash = linkData.properties?.hashed_token;
      if (!tokenHash) throw new Error("خطا در ایجاد توکن");

      return new Response(
        JSON.stringify({
          success: true,
          token_hash: tokenHash,
          email,
          is_new: isNew,
          status: agentRow.status,
          full_name: agentRow.full_name,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
