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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VND = (n: number) => n.toLocaleString('vi-VN') + ' ₫';
const receiptNo = () => `NIDO-${Date.now().toString(36).toUpperCase()}`;

function baseTemplate(body: string, receiptNum: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NIDO Vietnam Receipt</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#008751,#006B40);padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:0.5px;">NIDO Vietnam</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Nigerians in Diaspora Organization — Vietnam</p>
        <div style="margin-top:16px;background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 20px;display:inline-block;">
          <p style="color:#FFD700;margin:0;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Official Receipt</p>
          <p style="color:#ffffff;margin:4px 0 0;font-size:16px;font-weight:700;">${receiptNum}</p>
        </div>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:36px 40px;">${body}</td></tr>
      <!-- Footer -->
      <tr><td style="background:#f8f9fa;padding:24px 40px;border-top:1px solid #e9ecef;text-align:center;">
        <p style="color:#6c757d;font-size:12px;margin:0;">This is an official receipt from NIDO Vietnam.</p>
        <p style="color:#6c757d;font-size:12px;margin:4px 0 0;">📧 info@nidovietnam.com &nbsp;·&nbsp; 📞 +84326189705</p>
        <p style="color:#adb5bd;font-size:11px;margin:8px 0 0;">© ${new Date().getFullYear()} NIDO Vietnam. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function row(label: string, value: string, highlight = false) {
  return `<tr>
    <td style="padding:10px 0;color:#6c757d;font-size:14px;border-bottom:1px solid #f0f0f0;width:45%;">${label}</td>
    <td style="padding:10px 0;font-size:14px;border-bottom:1px solid #f0f0f0;font-weight:${highlight ? '700' : '500'};color:${highlight ? '#008751' : '#212529'};text-align:right;">${value}</td>
  </tr>`;
}

function buildMembershipReceipt(data: Record<string, string>) {
  const num = receiptNo();
  const body = `
    <h2 style="color:#212529;font-size:20px;margin:0 0 4px;">Membership Payment Receipt</h2>
    <p style="color:#6c757d;font-size:14px;margin:0 0 28px;">Thank you for your membership payment, ${data.name}!</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Receipt Number', num)}
      ${row('Date', new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }))}
      ${row('Member Name', data.name)}
      ${row('Email', data.email)}
      ${row('Membership Plan', data.plan_type)}
      ${row('Payment Reference', data.payment_reference || '—')}
      ${row('Currency', data.currency || 'VND')}
      ${row('Amount Paid', VND(Number(data.amount)), true)}
      ${data.valid_from ? row('Valid From', data.valid_from) : ''}
      ${data.valid_until ? row('Valid Until', data.valid_until) : ''}
    </table>
    <div style="margin-top:28px;background:#f0faf4;border-left:4px solid #008751;border-radius:0 8px 8px 0;padding:16px 20px;">
      <p style="margin:0;color:#006B40;font-size:14px;font-weight:600;">Purpose of Payment</p>
      <p style="margin:4px 0 0;color:#495057;font-size:14px;">${data.plan_type} Membership Fee — NIDO Vietnam ${new Date().getFullYear()}</p>
    </div>`;
  return { subject: `Receipt: ${data.plan_type} Membership Payment — NIDO Vietnam`, html: baseTemplate(body, num) };
}

function buildDonationReceipt(data: Record<string, string>) {
  const num = receiptNo();
  const body = `
    <h2 style="color:#212529;font-size:20px;margin:0 0 4px;">Donation Receipt</h2>
    <p style="color:#6c757d;font-size:14px;margin:0 0 28px;">Thank you for your generous contribution, ${data.donor_name}!</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Receipt Number', num)}
      ${row('Date', new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }))}
      ${row('Donor Name', data.donor_name)}
      ${row('Email', data.email)}
      ${row('Campaign', data.campaign_title)}
      ${row('Beneficiary', data.beneficiary_name)}
      ${row('Payment Reference', data.payment_reference || '—')}
      ${row('Amount Donated', VND(Number(data.amount)), true)}
    </table>
    <div style="margin-top:28px;background:#fff8e1;border-left:4px solid #FFD700;border-radius:0 8px 8px 0;padding:16px 20px;">
      <p style="margin:0;color:#856404;font-size:14px;font-weight:600;">Purpose of Payment</p>
      <p style="margin:4px 0 0;color:#495057;font-size:14px;">Charitable Donation — ${data.campaign_title}</p>
      <p style="margin:4px 0 0;color:#6c757d;font-size:13px;">Beneficiary: ${data.beneficiary_name}</p>
    </div>
    <p style="margin-top:24px;color:#6c757d;font-size:13px;text-align:center;">Your generosity makes a real difference to the NIDO community. God bless you!</p>`;
  return { subject: `Donation Receipt — ${data.campaign_title} | NIDO Vietnam`, html: baseTemplate(body, num) };
}

function buildCompanyListingReceipt(data: Record<string, string>) {
  const num = receiptNo();
  const body = `
    <h2 style="color:#212529;font-size:20px;margin:0 0 4px;">Business Directory Listing Receipt</h2>
    <p style="color:#6c757d;font-size:14px;margin:0 0 28px;">Your company is now featured in the NIDO Vietnam Business Directory.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Receipt Number', num)}
      ${row('Date', new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }))}
      ${row('Company Name', data.company_name)}
      ${row('Contact Email', data.email)}
      ${row('Annual Listing Fee', VND(Number(data.amount)), true)}
      ${row('Valid From', data.valid_from || '—')}
      ${row('Valid Until', data.valid_until || '—')}
    </table>
    <div style="margin-top:28px;background:#f0faf4;border-left:4px solid #008751;border-radius:0 8px 8px 0;padding:16px 20px;">
      <p style="margin:0;color:#006B40;font-size:14px;font-weight:600;">Purpose of Payment</p>
      <p style="margin:4px 0 0;color:#495057;font-size:14px;">Annual Business Directory Listing Fee — NIDO Vietnam ${new Date().getFullYear()}</p>
    </div>`;
  return { subject: `Receipt: Business Directory Listing — ${data.company_name} | NIDO Vietnam`, html: baseTemplate(body, num) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const { type, to_email, to_name, data } = await req.json();

    let emailPayload: { subject: string; html: string };
    if (type === 'membership') emailPayload = buildMembershipReceipt(data);
    else if (type === 'donation') emailPayload = buildDonationReceipt(data);
    else if (type === 'company_listing') emailPayload = buildCompanyListingReceipt(data);
    else return new Response(JSON.stringify({ error: 'Unknown receipt type' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });

    try {
      const result = await sendSmtpMail({
        to: [to_email],
        subject: emailPayload.subject,
        html: emailPayload.html,
      });
      return new Response(JSON.stringify({ success: true, id: result.id }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    } catch (sendErr) {
      console.error('SMTP error:', sendErr);
      return new Response(JSON.stringify({ error: String(sendErr) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    console.error('send-receipt error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
