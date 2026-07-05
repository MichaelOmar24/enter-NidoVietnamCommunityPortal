import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { email, password } = await req.json();

    // Try to get user by email
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw listErr;

    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      // Update their password
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
      });
      if (updateErr) throw updateErr;
      return new Response(JSON.stringify({ success: true, action: 'updated', user_id: existingUser.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Create user in auth with the profile's UUID
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      const createOpts: Record<string, unknown> = {
        email,
        password,
        email_confirm: true,
      };
      if (profileData?.id) createOpts.id = profileData.id;

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser(createOpts);
      if (createErr) throw createErr;
      return new Response(JSON.stringify({ success: true, action: 'created', user_id: newUser.user?.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
