import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Passport } from '@/lib/types';
import {
  User, FileText, Shield, Calendar, AlertTriangle, CheckCircle,
  CreditCard, ChevronRight, Bell, Users, Building2, ImageIcon
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export function UserDashboard() {
  const { profile } = useAuth();
  const [passport, setPassport] = useState<Passport | null>(null);
  const [totalMembers, setTotalMembers] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      fetchPassport();
    }
    fetchMemberCount();
  }, [profile]);

  const fetchPassport = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('passports')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();
    setPassport(data as Passport | null);
  };

  const fetchMemberCount = async () => {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    setTotalMembers(count || 0);
  };

  const daysToExpiry = passport?.expiry_date
    ? differenceInDays(parseISO(passport.expiry_date), new Date())
    : null;

  const passportStatus = daysToExpiry !== null
    ? daysToExpiry < 0 ? 'expired'
    : daysToExpiry <= 365 ? 'expiring'
    : 'valid'
    : 'unknown';

  const membershipBadgeClass = {
    active: 'bg-primary text-primary-foreground',
    pending: 'bg-gold text-gold-foreground',
    expired: 'bg-destructive text-destructive-foreground',
  }[profile?.membership_status || 'pending'];

  const quickActions = [
    { label: 'View NIDO Constitution', href: '/constitution', icon: FileText },
    { label: 'Browse Business Directory', href: '/directory', icon: Building2 },
    { label: 'Community Gallery', href: '/gallery', icon: ImageIcon },
    { label: 'Passport Enrollment Info', href: '/passport-info', icon: Shield },
  ];

  const infoRows = [
    { label: 'Full Name', value: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() },
    { label: 'Email', value: profile?.email || '-' },
    { label: 'Phone', value: profile?.phone || 'Not set' },
    { label: 'City in Vietnam', value: profile?.vietnam_city || 'Not set' },
    { label: 'Occupation', value: profile?.occupation_type?.replace(/_/g, ' ') || 'Not set' },
    { label: 'Marital Status', value: profile?.marital_status || 'Not set' },
    { label: 'State of Origin', value: profile?.nigerian_state_of_origin || 'Not set' },
  ];

  const passportRows = passport ? [
    { label: 'Passport No.', value: passport.passport_number || 'N/A' },
    { label: 'Issue Date', value: passport.issue_date || 'N/A' },
    { label: 'Expiry Date', value: passport.expiry_date || 'N/A' },
    { label: 'Place of Issue', value: passport.place_of_issue || 'N/A' },
  ] : [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pt-20 pb-12 px-4 bg-muted/20">
        <div className="container mx-auto max-w-4xl">

          {/* Welcome Banner */}
          <div className="gradient-hero rounded-2xl p-7 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute inset-0 hero-pattern pointer-events-none opacity-50" />
            <div className="flex items-center gap-4 relative">
              <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center text-gold-foreground font-bold text-xl shadow-gold shrink-0 select-none">
                {(profile?.first_name?.[0] || '?')}{(profile?.last_name?.[0] || '')}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground">
                  Welcome back, {profile?.first_name}!
                </h1>
                <p className="text-primary-foreground/65 text-sm mt-0.5">Your NIDO Vietnam member dashboard</p>
              </div>
            </div>
            <Badge className={`${membershipBadgeClass} text-sm px-4 py-1.5 relative`}>
              {profile?.membership_status === 'active' ? 'Active Member' :
               profile?.membership_status === 'pending' ? 'Pending Activation' : 'Expired'}
            </Badge>
          </div>

          {/* Alerts */}
          {passportStatus === 'expired' && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Passport Expired!</AlertTitle>
              <AlertDescription>
                Your passport has expired. Contact the Nigerian Embassy immediately: +84-24-37263610
              </AlertDescription>
            </Alert>
          )}
          {passportStatus === 'expiring' && (
            <Alert className="mb-6 border-gold bg-gold/10">
              <Bell className="h-4 w-4 text-gold" />
              <AlertTitle className="text-gold">Passport Expiring Soon</AlertTitle>
              <AlertDescription>
                Your passport expires in <strong>{daysToExpiry} days</strong>. Please initiate renewal via the Nigerian Embassy.
              </AlertDescription>
            </Alert>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { icon: Calendar, label: 'Member Since', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '-', color: 'text-primary', bg: 'bg-primary/10' },
              { icon: Shield, label: 'Membership', value: profile?.membership_type === 'premium' ? 'Premium' : 'Regular', color: 'text-gold', bg: 'bg-gold/10' },
              { icon: Users, label: 'Community', value: `${totalMembers} Members`, color: 'text-accent', bg: 'bg-accent/10' },
              { icon: FileText, label: 'Passport', value: passportStatus === 'valid' ? 'Valid' : passportStatus === 'expiring' ? 'Expiring' : passportStatus === 'expired' ? 'Expired' : 'Not Added', color: passportStatus === 'valid' ? 'text-primary' : passportStatus === 'expiring' ? 'text-gold' : passportStatus === 'expired' ? 'text-destructive' : 'text-muted-foreground', bg: passportStatus === 'valid' ? 'bg-primary/10' : passportStatus === 'expiring' ? 'bg-gold/10' : passportStatus === 'expired' ? 'bg-destructive/10' : 'bg-muted' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <Card key={label} className="shadow-card overflow-hidden">
                <CardContent className="p-5 text-center">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                  <p className="font-semibold text-foreground text-sm mt-1 capitalize">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Profile Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> My Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {infoRows.map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-medium text-foreground capitalize">{value}</span>
                  </div>
                ))}
                <Button onClick={() => navigate('/profile')} variant="outline" className="w-full mt-3 text-primary border-primary hover:bg-primary/10 gap-2">
                  Edit Profile <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Passport Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Passport Info
                  {passport?.verified && <Badge className="gradient-primary text-primary-foreground text-xs ml-auto">Verified</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {passport ? (
                  <>
                    {passport.passport_image_url && (
                      <img
                        src={passport.passport_image_url}
                        alt="Passport"
                        className="w-full h-36 object-cover rounded-lg mb-3"
                        onContextMenu={e => e.preventDefault()}
                      />
                    )}
                    {passportRows.map(({ label, value }) => (
                      <div key={label} className="flex justify-between py-2 border-b border-border/50 last:border-0">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="text-sm font-medium text-foreground">{value}</span>
                      </div>
                    ))}
                    {passportStatus !== 'valid' && passportStatus !== 'unknown' && (
                      <div className="mt-3 p-3 rounded-lg bg-gold/10 border border-gold/30">
                        <p className="text-sm text-gold font-medium flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          {daysToExpiry !== null && daysToExpiry < 0 ? 'Passport Expired!' : `Expires in ${daysToExpiry} days`}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm mb-3">No passport uploaded yet</p>
                    <Button variant="outline" size="sm" onClick={() => navigate('/profile')} className="text-primary border-primary hover:bg-primary/10">
                      Upload Passport
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Membership Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> Membership
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Current Plan</p>
                    <p className="font-bold text-lg text-foreground capitalize">{profile?.membership_type} Member</p>
                  </div>
                  <Badge className={membershipBadgeClass}>{profile?.membership_status}</Badge>
                </div>
                {profile?.membership_type === 'regular' && (
                  <Button onClick={() => navigate('/membership')} className="w-full gradient-gold text-gold-foreground gap-2">
                    Upgrade to Premium <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" /> Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {quickActions.map(({ label, href, icon: Icon }) => (
                  <button
                    key={href}
                    onClick={() => navigate(href)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-primary/10 transition-smooth text-left"
                  >
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground">{label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
