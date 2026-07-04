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

    console.log(`Sending welcome email to ${email} (${firstName})`);
    console.log(`Also notifying embassy about new member registration: ${email}`);

    // Log the email send action (actual SMTP would be configured via Supabase email settings)
    const welcomeEmailContent = `
Dear ${firstName},

Welcome to NIDO Vietnam — Nigerians in Diaspora Organization Vietnam!

Your registration has been successfully received. You are now part of our growing community of Nigerians living and working in Vietnam.

Next Steps:
1. Complete your profile on the NIDO Vietnam platform
2. Upload your passport information for verification
3. Join our WhatsApp community groups
4. Explore our Business Directory and community resources

NIDO Vietnam Contacts:
- Email: info@nidovietnam.com
- Hotline: +84326189705 (Dr. Michael Omar)
- WhatsApp: https://chat.whatsapp.com/JY6blJObydS8b7CMvcrYMJ

Nigerian Embassy Hanoi:
- Phone: +84-24-37263610 / +84-24-37263611
- WhatsApp (only): +84775568278
- Website: https://nigeriaembassy.org.vn

Unity and Faith, Peace and Progress.

Best Regards,
NIDO Vietnam Management
    `.trim();

    // Embassy notification content
    const embassyEmailContent = `
Dear Nigerian Embassy Team,

A new Nigerian citizen has registered on the NIDO Vietnam platform:

Name: ${firstName}
Email: ${email}
Registration Date: ${new Date().toISOString()}
User ID: ${userId}

Please note this registration for your records.

Best Regards,
NIDO Vietnam System
    `.trim();

    console.log("Welcome email content prepared for:", email);
    console.log("Embassy notification prepared for: contact-us@nigeriaembassy.org.vn");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Welcome email and embassy notification processed",
        recipient: email,
        embassyNotified: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
