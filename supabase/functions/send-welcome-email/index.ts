import nodemailer from "npm:nodemailer@6";

// SMTP config — organization's domain mailbox (cPanel: mail.supremecluster.com)
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "mail.supremecluster.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USER = Deno.env.get("SMTP_USER") || "info@nidovietnam.com";
const FROM_EMAIL = `NIDO Vietnam <${SMTP_USER}>`;
const ADMIN_EMAIL = "info@nidovietnam.com";

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
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, firstName } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const welcomeHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #008751; padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">NIDO Vietnam</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Nigerians in Diaspora Organization Vietnam</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 15px; line-height: 1.8; color: #374151;">
          <p style="margin: 0 0 12px;">Dear ${firstName || "Member"},</p>
          <p style="margin: 0 0 12px;">Welcome to NIDO Vietnam — Nigerians in Diaspora Organization Vietnam!</p>
          <p style="margin: 0 0 12px;">Your registration has been successfully received. You are now part of our growing community of Nigerians living and working in Vietnam.</p>
          <p style="margin: 0 0 6px; font-weight: 600;">Next Steps:</p>
          <ol style="margin: 0 0 16px; padding-left: 20px;">
            <li>Complete your profile on the NIDO Vietnam platform</li>
            <li>Upload your passport information for verification</li>
            <li>Join our WhatsApp community groups</li>
            <li>Explore our Business Directory and community resources</li>
          </ol>
          <p style="margin: 0 0 6px; font-weight: 600;">NIDO Vietnam Contacts:</p>
          <p style="margin: 0 0 16px;">
            Email: info@nidovietnam.com<br/>
            Hotline: +84326189705<br/>
            WhatsApp: https://chat.whatsapp.com/JY6blJObydS8b7CMvcrYMJ
          </p>
          <p style="margin: 0 0 16px;">Nigerian Embassy Hanoi: +84-24-37263610 / +84-24-37263611 · WhatsApp: +84775568278 · https://nigeriaembassy.org.vn</p>
          <p style="margin: 0;">Unity and Faith, Peace and Progress.<br/><strong>NIDO Vietnam Management</strong></p>
        </div>
      </div>`;

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; font-size: 14px; line-height: 1.7;">
        <p>A new member has registered on the NIDO Vietnam platform:</p>
        <table style="border-collapse: collapse;">
          <tr><td style="padding: 4px 16px 4px 0; color: #6b7280;">Name</td><td style="font-weight: 600;">${firstName || "—"}</td></tr>
          <tr><td style="padding: 4px 16px 4px 0; color: #6b7280;">Email</td><td style="font-weight: 600;">${email}</td></tr>
          <tr><td style="padding: 4px 16px 4px 0; color: #6b7280;">Registered</td><td style="font-weight: 600;">${new Date().toLocaleString("en-GB")}</td></tr>
          <tr><td style="padding: 4px 16px 4px 0; color: #6b7280;">User ID</td><td style="font-family: monospace; font-size: 12px;">${userId || "—"}</td></tr>
        </table>
        <p style="color: #6b7280; font-size: 12px;">Log in to the admin panel to review and activate this member's account.</p>
      </div>`;

    // Send welcome email to the new member
    await sendSmtpMail({
      to: [email],
      subject: "Welcome to NIDO Vietnam — Registration Received",
      html: welcomeHtml,
    });

    // Notify the admin inbox about the new registration
    try {
      await sendSmtpMail({
        to: [ADMIN_EMAIL],
        subject: `New Member Registration — ${firstName || ""} (${email})`,
        html: adminHtml,
      });
    } catch (adminErr) {
      console.error("Admin notification failed:", adminErr);
    }

    return new Response(
      JSON.stringify({ success: true, recipient: email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-welcome-email error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
