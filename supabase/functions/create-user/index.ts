import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generatePassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%';
  const all = upper + lower + digits + special;
  const password = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = password.length; i < length; i++) {
    password.push(all[Math.floor(Math.random() * all.length)]);
  }
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }
  return password.join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email, first_name, last_name, phone,
      date_of_birth, gender, occupation_type,
      marital_status, vietnam_city, nigerian_state_of_origin,
    } = await req.json();

    if (!email || !first_name || !last_name) {
      return new Response(JSON.stringify({ error: 'Email, first name and last name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const password = generatePassword();

    // Create the auth user with the generated password (email pre-confirmed)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });

    if (userError) {
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user?.id;

    // Upsert profile with all provided fields
    if (userId) {
      const profileData: Record<string, unknown> = {
        id: userId,
        email,
        first_name,
        last_name,
        membership_status: 'pending',
      };
      if (phone) profileData.phone = phone;
      if (date_of_birth) profileData.date_of_birth = date_of_birth;
      if (gender) profileData.gender = gender;
      if (occupation_type) profileData.occupation_type = occupation_type;
      if (marital_status) profileData.marital_status = marital_status;
      if (vietnam_city) profileData.vietnam_city = vietnam_city;
      if (nigerian_state_of_origin) profileData.nigerian_state_of_origin = nigerian_state_of_origin;

      await supabaseAdmin.from('profiles').upsert(profileData, { onConflict: 'id' });
    }

    // Trigger Supabase's built-in password reset email so the user receives
    // an official notification to set/confirm their access.
    try {
      await supabaseAdmin.auth.resetPasswordForEmail(email);
    } catch (_) {
      // Non-fatal — account is created regardless
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, password }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
