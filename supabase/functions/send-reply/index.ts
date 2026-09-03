import nodemailer from "npm:nodemailer@6";

// SMTP config — organization's domain mailbox (cPanel: mail.supremecluster.com)
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "mail.supremecluster.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USER = Deno.env.get("SMTP_USER") || "info@nidovietnam.com";
const FROM_EMAIL = `NIDO Vietnam <${SMTP_USER}>`;

async function sendSmtpMail(options: { to: string | string[]; subject: string; html: string }) {
  const password = Deno.env.get("SMTP_PASSWORD");
  if (!password) throw new Error("SMTP_PASSWORD secret is not configured");
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: password },
    tls: { rejectUnauthorized: false },
  });
  const info = await transporter.sendMail({
    from: FROM_EMAIL,
    to: options.to,
    replyTo: SMTP_USER,
    subject: options.subject,
    html: options.html,
  });
  return { id: info.messageId };
}

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

    try {
      const result = await sendSmtpMail({
        to: [to],
        subject: `Re: ${subject}`,
        html: htmlBody,
      });

      return new Response(
        JSON.stringify({ success: true, id: result.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (sendErr) {
      console.error('SMTP error:', sendErr);
      return new Response(
        JSON.stringify({ error: String(sendErr) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
