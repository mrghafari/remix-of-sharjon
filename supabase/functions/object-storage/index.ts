// Liara S3-compatible Object Storage helper.
// Actions:
//   - "test"          → checks credentials by listing 1 object in the bucket
//   - "sign-upload"   → returns a presigned PUT URL for direct browser upload
//   - "sign-download" → returns a presigned GET URL for direct browser download
//
// Auth: requires a logged-in Lovable user (we validate the JWT).
// Secrets: LIARA_S3_ENDPOINT, LIARA_S3_BUCKET, LIARA_S3_ACCESS_KEY, LIARA_S3_SECRET_KEY

import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ---- auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    // ---- config ----
    const endpoint = Deno.env.get("LIARA_S3_ENDPOINT");
    const bucket = Deno.env.get("LIARA_S3_BUCKET");
    const accessKeyId = Deno.env.get("LIARA_S3_ACCESS_KEY");
    const secretAccessKey = Deno.env.get("LIARA_S3_SECRET_KEY");
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      return json({ error: "Object Storage credentials are not configured" }, 500);
    }
    const baseUrl = `https://${endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
    const client = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: "us-east-1", // Liara accepts any region
    });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    if (action === "test") {
      const url = `${baseUrl}/${bucket}/?list-type=2&max-keys=1`;
      const signed = await client.sign(url, { method: "GET" });
      const res = await fetch(signed);
      const text = await res.text();
      if (!res.ok) {
        return json({
          ok: false,
          status: res.status,
          message: `اتصال ناموفق (HTTP ${res.status})`,
          details: text.slice(0, 500),
        }, 200);
      }
      return json({
        ok: true,
        status: res.status,
        message: `اتصال موفق به باکت «${bucket}»`,
        sample: text.slice(0, 300),
      });
    }

    if (action === "sign-upload") {
      const key = String(body.key ?? "").replace(/^\/+/, "");
      const contentType = String(body.contentType ?? "application/octet-stream");
      if (!key) return json({ error: "key is required" }, 400);
      const url = `${baseUrl}/${bucket}/${encodeURI(key)}`;
      const signed = await client.sign(url, {
        method: "PUT",
        headers: { "content-type": contentType },
        aws: { signQuery: true },
      });
      return json({
        url: signed.url,
        method: "PUT",
        headers: { "content-type": contentType },
        publicUrl: `${baseUrl}/${bucket}/${encodeURI(key)}`,
      });
    }

    if (action === "sign-download") {
      const key = String(body.key ?? "").replace(/^\/+/, "");
      if (!key) return json({ error: "key is required" }, 400);
      const url = `${baseUrl}/${bucket}/${encodeURI(key)}`;
      const signed = await client.sign(url, {
        method: "GET",
        aws: { signQuery: true },
      });
      return json({ url: signed.url, method: "GET" });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("object-storage error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
