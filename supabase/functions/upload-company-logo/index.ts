import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "company-logos";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.id === BUCKET);
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"],
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const companyId = formData.get("companyId") as string || `logo_${Date.now()}`;

    if (!file) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${companyId}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileName, arrayBuffer, { contentType: file.type, upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);

    return new Response(JSON.stringify({ url: urlData.publicUrl }), {
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
