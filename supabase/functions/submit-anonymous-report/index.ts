import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      case_type,
      title,
      description,
      incident_date,
      incident_location,
      reported_name,
      reported_email,
      reported_phone,
      reported_relationship,
      contact_email,  // optional follow-up contact — stored separately
      evidence_urls,
    } = body;

    // Validate required fields
    if (!case_type || !title || !description || !reported_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: case_type, title, description, reported_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (description.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Description must be at least 50 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a unique reference code
    const refCode = `ANON-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Build full description with extra fields
    const fullDescription = [
      description,
      incident_date ? `\n\n**Incident Date:** ${incident_date}` : '',
      incident_location ? `**Incident Location:** ${incident_location}` : '',
      contact_email ? `\n\n**Confidential Follow-up Contact:** ${contact_email}` : '',
    ].filter(Boolean).join('');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase.from('case_reports').insert({
      reporter_name: 'Anonymous',
      reporter_email: null,
      reporter_phone: null,
      reporter_user_id: null,
      reported_name,
      reported_email: reported_email || null,
      reported_phone: reported_phone || null,
      reported_relationship: reported_relationship || 'unknown',
      case_type,
      title,
      description: fullDescription,
      evidence_urls: evidence_urls || [],
      status: 'pending',
      is_anonymous: true,
      admin_notes: `Reference: ${refCode}`,
    });

    if (error) {
      console.error('Insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to submit report. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, reference: refCode }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
