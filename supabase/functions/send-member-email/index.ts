import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

// SMTP config — organization's domain mailbox (cPanel: mail.supremecluster.com)
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "mail.supremecluster.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USER = Deno.env.get("SMTP_USER") || "info@nidovietnam.com";
const FROM_EMAIL = `NIDO Vietnam <${SMTP_USER}>`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AttachmentInput {
  filename: string;
  content: string; // base64 (no data-url prefix)
  contentType?: string;
}

async function sendSmtpMail(options: {
  to: string | string[];
  subject: string;
  html: string;
  inReplyTo?: string;
  references?: string;
  attachments?: AttachmentInput[];
}) {
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
    inReplyTo: options.inReplyTo,
    references: options.references,
    attachments: (options.attachments || []).map((a) => ({
      filename: a.filename,
      content: a.content,
      encoding: "base64",
      contentType: a.contentType || "application/octet-stream",
    })),
  });
  return { id: info.messageId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Admin-only: verify the caller's session and role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin, is_super_admin, is_embassy_staff")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_admin && !profile?.is_super_admin && !profile?.is_embassy_staff) {
      return new Response(JSON.stringify({ error: "Forbidden: admins only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, toName, subject, message, inReplyTo, references, attachments } = await req.json();
    if (!to || !subject || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const greeting = toName ? `Dear ${toName},` : "Dear Member,";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #008751; padding: 24px 32px; border-radius: 8px 8px 0 0; text-align: center;">
          <div style="display: inline-block; background: #ffffff; padding: 6px 14px; border-radius: 8px; margin-bottom: 12px;">
            <img src="https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png" alt="NIDO Vietnam" style="height: 40px; display: block;" />
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">NIDO Vietnam</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Nigerians in Diaspora Organization Vietnam</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #374151; margin: 0 0 8px;">${greeting}</p>
          <div style="font-size: 15px; line-height: 1.8; color: #374151; white-space: pre-wrap; margin: 16px 0;">${String(message).replace(/\n/g, "<br/>")}</div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">NIDO Vietnam · info@nidovietnam.com · +84326189705</p>
        </div>
      </div>`;

    const result = await sendSmtpMail({ to: [to], subject, html, inReplyTo, references, attachments });

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-member-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
