import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const companyId = formData.get("companyId") as string | null;
    const docType = formData.get("docType") as string | null;

    if (!file || !companyId || !docType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: file, companyId, docType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ext = file.name.split(".").pop() || "pdf";
    const fileName = `${companyId}/${docType}_${Date.now()}.${ext}`;
    const bucket = "company-docs";

    // Ensure bucket exists
    await supabase.storage.createBucket(bucket, { public: false }).catch(() => {});

    const arrayBuffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (error) {
      console.error("Storage upload error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a signed URL (valid for 10 years)
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(data.path, 315360000);

    if (signedError || !signedData) {
      return new Response(
        JSON.stringify({ error: "Could not generate document URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: signedData.signedUrl, path: data.path }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
