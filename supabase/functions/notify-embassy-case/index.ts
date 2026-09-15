import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

// SMTP config — organization's domain mailbox (cPanel: mail.supremecluster.com)
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "mail.supremecluster.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USER = Deno.env.get("SMTP_USER") || "info@nidovietnam.com";
const FROM_EMAIL = `NIDO Vietnam <${SMTP_USER}>`;
const EMBASSY_EMAIL = "contact-us@nigeriaembassy.org.vn";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function esc(s: unknown): string {
  return String(s ?? "").split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { case_report_id, welfare_request_id, force } = await req.json();
    if (!case_report_id && !welfare_request_id) {
      return new Response(JSON.stringify({ error: "case_report_id or welfare_request_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let subject = "";
    let htmlBody = "";

    if (case_report_id) {
      const { data: report, error } = await supabase
        .from("case_reports")
        .select("*")
        .eq("id", case_report_id)
        .maybeSingle();
      if (error || !report) {
        return new Response(JSON.stringify({ error: "Case report not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Automatic sends only cover immigration cases; force=true (manual admin action) allows any case
      if (report.case_type !== "immigration_agent" && force !== true) {
        return new Response(JSON.stringify({ skipped: true, reason: "Not an immigration case" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const evidenceList = (report.evidence_urls || []).length > 0
        ? `<p style="margin:12px 0 4px;font-weight:600;">Evidence files:</p><ol style="margin:0;padding-left:18px;">${(report.evidence_urls as string[]).map((u) => `<li style="margin-bottom:2px;"><a href="${esc(u)}" style="color:#1a56db;word-break:break-all;">${esc(u)}</a></li>`).join("")}</ol>`
        : "";

      subject = `Immigration Case Report — ${report.title}`;
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
          <div style="background: #008751; padding: 20px 28px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px;">NIDO Vietnam</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 12px;">Immigration Case Report — For Embassy Attention</p>
          </div>
          <div style="background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 14px; line-height: 1.7;">
            <p>Dear Consular Team,</p>
            <p>NIDO Vietnam is forwarding an immigration-related case report involving a Nigerian citizen for the Embassy's awareness and guidance.</p>
            <table style="border-collapse: collapse; margin: 12px 0; width: 100%;">
              <tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">Case Title</td><td style="font-weight: 600;">${esc(report.title)}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">Case Type</td><td>Immigration / Visa Agent Issue</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">Reported By</td><td>${report.is_anonymous ? "Anonymous (identity protected)" : esc(report.reporter_name)}${report.reporter_email && !report.is_anonymous ? ` — ${esc(report.reporter_email)}` : ""}${report.reporter_phone && !report.is_anonymous ? ` — ${esc(report.reporter_phone)}` : ""}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">Reported Party</td><td>${esc(report.reported_name)}${report.reported_email ? ` — ${esc(report.reported_email)}` : ""}${report.reported_phone ? ` — ${esc(report.reported_phone)}` : ""}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">Date Filed</td><td>${new Date(report.created_at).toLocaleString("en-GB")}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">Case Reference</td><td style="font-family: monospace; font-size: 12px;">${esc(report.id)}</td></tr>
            </table>
            <p style="font-weight: 600; margin: 12px 0 4px;">Case description:</p>
            <p style="white-space: pre-wrap; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">${esc(report.description)}</p>
            ${evidenceList}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">This case is recorded in the NIDO Vietnam case management system. NIDO Vietnam remains available to coordinate with the Embassy on this matter.<br/>info@nidovietnam.com · +84326189705</p>
          </div>
        </div>`;
    } else {
      const { data: wr, error } = await supabase
        .from("welfare_requests")
        .select("*, profiles!welfare_requests_user_id_fkey(first_name, last_name, email, phone, vietnam_city)")
        .eq("id", welfare_request_id)
        .maybeSingle();
      if (error || !wr) {
        return new Response(JSON.stringify({ error: "Welfare request not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (wr.support_type !== "immigration") {
        return new Response(JSON.stringify({ skipped: true, reason: "Not an immigration support request" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const p = wr.profiles || {};
      subject = `Immigration Support Request — ${wr.title}`;
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
          <div style="background: #008751; padding: 20px 28px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px;">NIDO Vietnam</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 12px;">Immigration Support Request — For Embassy Attention</p>
          </div>
          <div style="background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 14px; line-height: 1.7;">
            <p>Dear Consular Team,</p>
            <p>NIDO Vietnam is forwarding an immigration support request from a Nigerian citizen in Vietnam for the Embassy's awareness and assistance.</p>
            <table style="border-collapse: collapse; margin: 12px 0; width: 100%;">
              <tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">Request</td><td style="font-weight: 600;">${esc(wr.title)}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">Citizen</td><td>${esc(p.first_name || "")} ${esc(p.last_name || "")}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">Email</td><td>${esc(p.email || "")}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">Phone</td><td>${esc(p.phone || "—")}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">City</td><td>${esc(p.vietnam_city || "—")}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">Urgency</td><td>${esc(wr.urgency)}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #6b7280; vertical-align: top;">Date Filed</td><td>${new Date(wr.created_at).toLocaleString("en-GB")}</td></tr>
            </table>
            <p style="font-weight: 600; margin: 12px 0 4px;">Request details:</p>
            <p style="white-space: pre-wrap; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">${esc(wr.description)}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">This request is recorded in the NIDO Vietnam welfare system. NIDO Vietnam remains available to coordinate with the Embassy on this matter.<br/>info@nidovietnam.com · +84326189705</p>
          </div>
        </div>`;
    }

    const result = await sendSmtpMail({ to: [EMBASSY_EMAIL], subject, html: htmlBody });

    return new Response(JSON.stringify({ success: true, id: result.id, sentTo: EMBASSY_EMAIL }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-embassy-case error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
