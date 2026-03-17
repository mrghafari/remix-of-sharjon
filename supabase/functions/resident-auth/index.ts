import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIXED_OTP = "123456";

function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, "");
  if (p.startsWith("+98")) p = "0" + p.slice(3);
  if (p.startsWith("98") && p.length === 12) p = "0" + p.slice(2);
  return p;
}

async function findAuthUserByEmail(adminClient: any, email: string) {
  const normalizedEmail = email.toLowerCase();

  const { data: filteredData, error: filteredError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 200,
    filter: normalizedEmail,
  });

  if (filteredError) throw filteredError;

  const exactFilteredMatch = filteredData?.users?.find(
    (user: any) => user.email?.toLowerCase() === normalizedEmail,
  );

  if (exactFilteredMatch) return exactFilteredMatch;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) throw error;

    const users = data?.users ?? [];
    const exactMatch = users.find(
      (user: any) => user.email?.toLowerCase() === normalizedEmail,
    );

    if (exactMatch) return exactMatch;
    if (users.length < 200) break;
  }

  return null;
}

async function ensureProfile(adminClient: any, userId: string, fullName: string, phone: string) {
  const { data: existingProfile, error: profileLookupError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileLookupError) throw profileLookupError;

  if (!existingProfile) {
    const { error: insertProfileError } = await adminClient.from("profiles").insert({
      user_id: userId,
      full_name: fullName,
      phone,
    });

    if (insertProfileError) throw insertProfileError;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { action, phone, otp } = await req.json();
    if (!phone) throw new Error("شماره موبایل الزامی است");

    const normalizedPhone = normalizePhone(phone);

    if (action === "request") {
      // Look up phone in units table (phone or resident_phone)
      const { data: units, error: unitsErr } = await adminClient
        .from("units")
        .select("id, unit_number, building_id, owner_name, resident_name, phone, resident_phone")
        .or(`phone.eq.${normalizedPhone},resident_phone.eq.${normalizedPhone}`);

      if (unitsErr) throw unitsErr;
      if (!units || units.length === 0) {
        return new Response(
          JSON.stringify({ found: false, message: "شماره موبایل در هیچ واحدی ثبت نشده است" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get building names
      const buildingIds = [...new Set(units.map((u: any) => u.building_id))];
      const { data: buildings } = await adminClient
        .from("buildings")
        .select("id, name")
        .in("id", buildingIds);

      const buildingMap: Record<string, string> = {};
      (buildings || []).forEach((b: any) => { buildingMap[b.id] = b.name; });

      // Check if this phone belongs to a manager
      const { data: managers } = await adminClient
        .from("managers")
        .select("id, building_id, unit_id, mobile")
        .eq("mobile", normalizedPhone)
        .eq("is_active", true);

      const managerBuildingIds = new Set((managers || []).map((m: any) => m.building_id));

      const matches = units.map((u: any) => {
        const isOwner = u.phone === normalizedPhone;
        const isResident = u.resident_phone === normalizedPhone;
        return {
          unit_id: u.id,
          unit_number: u.unit_number,
          building_id: u.building_id,
          building_name: buildingMap[u.building_id] || "",
          owner_name: u.owner_name,
          resident_name: u.resident_name,
          role: isOwner ? "owner" : "resident",
          isManager: isResident ? managerBuildingIds.has(u.building_id) : managerBuildingIds.has(u.building_id),
        };
      });

      return new Response(
        JSON.stringify({ found: true, matches }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      if (otp !== FIXED_OTP) {
        return new Response(
          JSON.stringify({ success: false, message: "کد تأیید اشتباه است" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Re-lookup units for this phone
      const { data: units } = await adminClient
        .from("units")
        .select("id, unit_number, building_id, owner_name, resident_name, phone, resident_phone")
        .or(`phone.eq.${normalizedPhone},resident_phone.eq.${normalizedPhone}`);

      if (!units || units.length === 0) {
        throw new Error("واحدی یافت نشد");
      }

      // Check if manager
      const { data: managers } = await adminClient
        .from("managers")
        .select("id, building_id, unit_id, mobile")
        .eq("mobile", normalizedPhone)
        .eq("is_active", true);

      const managerBuildingIds = new Set((managers || []).map((m: any) => m.building_id));
      const isManager = managerBuildingIds.size > 0;

      let userId: string;
      let userEmail: string;

      if (isManager) {
        // Find the manager's user account via building_members
        const managerBuildingId = [...managerBuildingIds][0];
        const { data: memberData } = await adminClient
          .from("building_members")
          .select("user_id")
          .eq("building_id", managerBuildingId)
          .eq("role", "manager")
          .limit(1)
          .single();

        if (memberData) {
          userId = memberData.user_id;
          // Get their email
          const { data: userData } = await adminClient.auth.admin.getUserById(userId);
          if (!userData?.user) throw new Error("حساب مدیر یافت نشد");
          userEmail = userData.user.email!;
        } else {
          throw new Error("اطلاعات مدیر یافت نشد");
        }
      } else {
        // Create or find resident/owner user
        userEmail = `${normalizedPhone}@resident.local`;

        const firstMatchingUnit = units.find(
          (unit: any) => unit.phone === normalizedPhone || unit.resident_phone === normalizedPhone,
        ) || units[0];

        const isOwnerPhone = firstMatchingUnit.phone === normalizedPhone;
        const displayName = isOwnerPhone
          ? (firstMatchingUnit.owner_name || firstMatchingUnit.resident_name || normalizedPhone)
          : (firstMatchingUnit.resident_name || firstMatchingUnit.owner_name || normalizedPhone);

        let existingUser = await findAuthUserByEmail(adminClient, userEmail);

        if (existingUser) {
          userId = existingUser.id;
        } else {
          const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
            email: userEmail,
            email_confirm: true,
            user_metadata: {
              is_resident: true,
              phone: normalizedPhone,
              full_name: displayName,
            },
          });

          if (createErr) {
            const isEmailExistsError =
              createErr.message?.includes("already been registered") ||
              createErr.message?.includes("email address") ||
              (createErr as any)?.status === 422;

            if (!isEmailExistsError) throw createErr;

            existingUser = await findAuthUserByEmail(adminClient, userEmail);
            if (!existingUser) throw createErr;
            userId = existingUser.id;
          } else {
            userId = newUser.user.id;
          }
        }

        await ensureProfile(adminClient, userId, displayName, normalizedPhone);

        // Ensure building_members entries exist for resident role
        for (const unit of units) {
          const { data: existingMember } = await adminClient
            .from("building_members")
            .select("id")
            .eq("user_id", userId)
            .eq("building_id", unit.building_id)
            .limit(1)
            .maybeSingle();

          if (!existingMember) {
            await adminClient.from("building_members").insert({
              user_id: userId,
              building_id: unit.building_id,
              role: "resident",
              unit_id: unit.id,
            });
          }
        }
      }

      // Generate magic link to create session
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail,
      });

      if (linkErr) throw linkErr;

      const tokenHash = linkData.properties?.hashed_token;
      if (!tokenHash) throw new Error("خطا در ایجاد توکن ورود");

      // Get building info for response
      const buildingIds = [...new Set(units.map((u: any) => u.building_id))];
      const { data: buildings } = await adminClient
        .from("buildings")
        .select("id, name")
        .in("id", buildingIds);
      const buildingMap: Record<string, string> = {};
      (buildings || []).forEach((b: any) => { buildingMap[b.id] = b.name; });

      const matches = units.map((u: any) => ({
        unit_id: u.id,
        unit_number: u.unit_number,
        building_id: u.building_id,
        building_name: buildingMap[u.building_id] || "",
        owner_name: u.owner_name,
        resident_name: u.resident_name,
        role: u.phone === normalizedPhone ? "owner" : "resident",
        isManager: managerBuildingIds.has(u.building_id),
      }));

      return new Response(
        JSON.stringify({
          success: true,
          token_hash: tokenHash,
          email: userEmail,
          is_manager: isManager,
          matches,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("عملیات نامعتبر");
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});