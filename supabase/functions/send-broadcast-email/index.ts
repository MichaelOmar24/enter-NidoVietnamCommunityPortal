import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? 're_AnVAMsY1_EytJw1fRxRV5U446w1p7os2t';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { subject, message, senderName } = await req.json();

    if (!subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subject, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all active/pending members with emails
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .not('email', 'is', null)
      .neq('email', '');

    if (error) throw error;

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No members found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const from = senderName
      ? `${senderName} <info@nidovietnam.com>`
      : 'NIDO Vietnam <info@nidovietnam.com>';

    // Build batch payload — one email per recipient for privacy
    const batch = profiles.map((p: { first_name: string; last_name: string; email: string }) => ({
      from,
      to: [p.email],
      reply_to: 'info@nidovietnam.com',
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <div style="background: #008751; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">NIDO Vietnam</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Nigerians in Diaspora Organization</p>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #374151; margin: 0 0 8px;">Dear ${p.first_name} ${p.last_name},</p>
            <div style="font-size: 15px; line-height: 1.8; color: #374151; white-space: pre-wrap; margin: 16px 0;">${message.replace(/\n/g, '<br/>')}</div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">This message was sent to all NIDO Vietnam members. For enquiries, contact info@nidovietnam.com</p>
          </div>
        </div>
      `,
    }));

    // Send in batches of 100 (Resend batch limit)
    let sent = 0;
    let failed = 0;
    const batchSize = 100;

    for (let i = 0; i < batch.length; i += batchSize) {
      const chunk = batch.slice(i, i + batchSize);
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const data = await res.json();
      if (res.ok) {
        sent += chunk.length;
      } else {
        console.error('Resend batch error:', data);
        failed += chunk.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: profiles.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
