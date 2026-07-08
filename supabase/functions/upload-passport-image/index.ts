import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "passport-images";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Use service role to bypass RLS for storage operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.id === BUCKET);

    if (!bucketExists) {
      const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/jpg"],
      });
      if (createErr && !createErr.message.includes("already exists")) {
        throw createErr;
      }
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file || !userId) {
      return new Response(JSON.stringify({ error: "Missing file or userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${userId}_passport.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);

    // Cache-bust: upsert reuses the same file path, so without a unique query
    // param browsers/CDNs keep serving the previously cached image after a
    // replacement upload, making it look like the new photo never saved.
    const cacheBustedUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    return new Response(JSON.stringify({ url: cacheBustedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
