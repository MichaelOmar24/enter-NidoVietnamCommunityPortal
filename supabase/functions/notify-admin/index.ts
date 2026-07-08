import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_5D2Utgps_LrrWXd6cn7yhCH5LeE6esXu3';
const ADMIN_EMAIL = 'omike95@gmail.com';
const FROM_EMAIL = 'NIDO Vietnam <info@nidovietnam.com>';

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;width:42%;vertical-align:top;">${label}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;font-weight:500;">${value || '—'}</td>
    </tr>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, password } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch full profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .maybeSingle();

    // Fetch passport data
    const { data: passport } = await supabaseAdmin
      .from('passports')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' });
    const fullName = `${profile.first_name} ${profile.last_name}`.toUpperCase();

    // Login credentials section (only shown when a password was generated)
    const credentialsSection = password ? `
      <div style="padding:0 32px 24px;">
        <h2 style="margin:24px 0 16px;color:#1a4d2e;font-size:16px;text-transform:uppercase;letter-spacing:0.5px;border-top:2px solid #e5e7eb;padding-top:20px;">
          Your Login Credentials
        </h2>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          ${row('Login Email', profile.email)}
          ${row('Temporary Password', `<span style="font-family:monospace;font-size:15px;letter-spacing:0.5px;">${password}</span>`)}
        </table>
        <p style="margin:12px 0 0;color:#92400e;font-size:12px;background:#fefce8;border-left:4px solid #f59e0b;padding:10px 14px;">
          For your security, please log in and change your password as soon as possible.
        </p>
      </div>
    ` : '';

    // Build passport section HTML
    const passportSection = passport ? `
      <div style="padding:0 32px 24px;">
        <h2 style="margin:0 0 16px;color:#1a4d2e;font-size:16px;text-transform:uppercase;letter-spacing:0.5px;border-top:2px solid #e5e7eb;padding-top:20px;">
          Passport Information
        </h2>

        ${passport.passport_image_url ? `
        <div style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          <div style="background:#1a4d2e;padding:10px 16px;">
            <p style="margin:0;color:rgba(255,255,255,0.85);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Passport Data Page</p>
          </div>
          <div style="padding:12px;background:#f9fafb;text-align:center;">
            <img src="${passport.passport_image_url}" alt="Passport Data Page"
              style="max-width:100%;max-height:340px;object-fit:contain;border-radius:6px;border:1px solid #e5e7eb;" />
          </div>
        </div>
        ` : '<p style="color:#9ca3af;font-size:13px;font-style:italic;margin-bottom:16px;">No passport image uploaded.</p>'}

        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          ${row('Passport Number', passport.passport_number || '')}
          ${row('Place of Issue', passport.place_of_issue || '')}
          ${row('Issue Date', passport.issue_date || '')}
          ${row('Expiry Date', passport.expiry_date || '')}
          ${row('Biometric', passport.is_biometric ? '✅ Yes — Biometric Passport' : 'No')}
          ${row('Verification Status', passport.verified ? '✅ Verified by Admin' : '⏳ Pending Verification')}
          ${passport.admin_notes ? row('Admin Notes', passport.admin_notes) : ''}
        </table>
      </div>
    ` : `
      <div style="padding:0 32px 24px;">
        <p style="color:#9ca3af;font-size:13px;font-style:italic;border-top:1px solid #e5e7eb;padding-top:16px;">No passport data provided for this member.</p>
      </div>
    `;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1a4d2e;padding:28px 32px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:0.5px;">NIDO Vietnam</h1>
      <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:13px;">${password ? 'Welcome — Your Account Has Been Created' : 'New Member Profile — Verification Required'}</p>
    </div>

    <!-- Alert Banner -->
    <div style="background:#fefce8;border-left:4px solid #f59e0b;padding:14px 24px;">
      <p style="margin:0;color:#92400e;font-size:13px;font-weight:600;">
        A new member account was created by an administrator on ${now}. Please review the full profile${password ? ', login credentials' : ''} and passport data below.
      </p>
    </div>

    <!-- Profile Section -->
    <div style="padding:24px 32px 0;">
      <h2 style="margin:0 0 16px;color:#1a4d2e;font-size:16px;text-transform:uppercase;letter-spacing:0.5px;">${fullName}</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        ${row('Email', `<a href="mailto:${profile.email}" style="color:#1a4d2e;">${profile.email}</a>`)}
        ${row('Phone', profile.phone || '')}
        ${row('Date of Birth', profile.date_of_birth || '')}
        ${row('Gender', profile.gender || '')}
        ${row('Occupation', (profile.occupation_type || '').replace(/_/g, ' '))}
        ${row('Marital Status', profile.marital_status || '')}
        ${row('Vietnam City', profile.vietnam_city || '')}
        ${row('State of Origin', profile.nigerian_state_of_origin || '')}
        ${row('Membership Status', profile.membership_status || '')}
      </table>
    </div>

    <!-- Credentials Section -->
    ${credentialsSection}

    <!-- Passport Section -->
    ${passportSection}

    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        ${password
          ? 'Welcome to the NIDO Vietnam community! If you have any questions, contact us at info@nidovietnam.com.'
          : "This email was automatically generated by NIDO Vietnam Admin System.<br>Login to the admin panel to activate this member's account or update their status."}
      </p>
    </div>
  </div>
</body>
</html>`;

    // Send to the member (with their credentials) and BCC the admin for verification
    const recipients = profile.email ? [profile.email] : [];
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipients.length > 0 ? recipients : [ADMIN_EMAIL],
        bcc: recipients.length > 0 ? [ADMIN_EMAIL] : undefined,
        reply_to: 'info@nidovietnam.com',
        subject: password
          ? `Welcome to NIDO Vietnam — Your Account & Profile Details`
          : `New Member — ${profile.first_name} ${profile.last_name} (Verification Required)`,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error('Resend error:', errBody);
      return new Response(JSON.stringify({ error: 'Email send failed', detail: errBody }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
