import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from "npm:nodemailer@6";

// SMTP config — organization's domain mailbox (cPanel: mail.supremecluster.com)
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "mail.supremecluster.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USER = Deno.env.get("SMTP_USER") || "info@nidovietnam.com";
const FROM_EMAIL = `NIDO Vietnam <${SMTP_USER}>`;

async function sendSmtpMail(options: { to: string | string[]; subject: string; html: string; fromName?: string }) {
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
    from: options.fromName ? `${options.fromName} <${SMTP_USER}>` : FROM_EMAIL,
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

    // Send one email per recipient for privacy (SMTP has no batch API)
    let sent = 0;
    let failed = 0;

    for (const p of profiles as { first_name: string; last_name: string; email: string }[]) {
      try {
        await sendSmtpMail({
          to: [p.email],
          fromName: senderName || undefined,
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
        });
        sent++;
      } catch (sendErr) {
        console.error(`SMTP send failed for ${p.email}:`, sendErr);
        failed++;
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
