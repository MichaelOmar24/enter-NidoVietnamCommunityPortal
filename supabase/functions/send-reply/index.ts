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
    const { to, toName, subject, replyText, originalMessage } = await req.json();

    if (!to || !subject || !replyText) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, replyText' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="padding: 32px 0 16px;">
          <p style="font-size: 16px; line-height: 1.7; white-space: pre-wrap; margin: 0;">${replyText.replace(/\n/g, '<br/>')}</p>
        </div>
        ${originalMessage ? `
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <div style="color: #6b7280; font-size: 14px;">
          <p style="margin: 0 0 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px;">Original Message</p>
          <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${originalMessage.replace(/\n/g, '<br/>')}</p>
        </div>
        ` : ''}
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [to],
        subject: `Re: ${subject}`,
        html: htmlBody,
        reply_to: 'onboarding@resend.dev',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend error:', data);
      return new Response(
        JSON.stringify({ error: data.message ?? 'Failed to send email' }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
