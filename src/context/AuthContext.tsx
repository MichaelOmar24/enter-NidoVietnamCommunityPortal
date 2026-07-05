import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isEmbassyStaff: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, profileData: Partial<Profile>) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  };

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on setup — no need for a separate getSession() call.
    // Running both simultaneously causes "Lock was stolen by another request" errors.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          // Defer so Supabase client can fully commit the session before we query
          setTimeout(() => fetchProfile(currentSession.user.id), 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, profileData: Partial<Profile>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` }
    });

    if (error) return { error: error as Error };

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        phone: profileData.phone,
        date_of_birth: profileData.date_of_birth,
        gender: profileData.gender,
        occupation_type: profileData.occupation_type,
        marital_status: profileData.marital_status,
        vietnam_city: profileData.vietnam_city,
        vietnam_address: profileData.vietnam_address,
        nigerian_state_of_origin: profileData.nigerian_state_of_origin,
        membership_type: 'regular',
        membership_status: 'pending',
        is_admin: false,
      });
      if (profileError) return { error: profileError as Error };

      // Trigger welcome email via edge function
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { userId: data.user.id, email, firstName: profileData.first_name }
        });
      } catch (_) { /* non-blocking */ }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const isAdmin = profile?.is_admin === true;
  const isSuperAdmin = profile?.is_super_admin === true;
  const isEmbassyStaff = profile?.is_embassy_staff === true;

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isAdmin, isSuperAdmin, isEmbassyStaff, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
