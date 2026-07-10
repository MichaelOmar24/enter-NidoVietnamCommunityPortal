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
  CreditCard, ChevronRight, Bell, Users, Building2, ImageIcon,
  Crown, Clock, ArrowRight, Banknote, TrendingUp, TrendingDown, Lock, Award, Star, Heart,
  AlertCircle, Search, RotateCcw, XCircle,
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface MembershipRecord {
  id: string;
  plan_type: string;
  amount: number;
  currency: string;
  payment_status: string;
  payment_reference: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

interface CaseReport {
  id: string;
  title: string;
  case_type: string;
  status: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

const VND = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

const TIER_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  free: { label: 'Free Member', icon: Users, color: 'text-muted-foreground', bg: 'bg-muted' },
  regular: { label: 'Free Member', icon: Users, color: 'text-muted-foreground', bg: 'bg-muted' },
  premium: { label: 'Premium Member', icon: Shield, color: 'text-primary', bg: 'bg-primary/10' },
  gold: { label: 'Gold Stakeholder', icon: Crown, color: 'text-amber-600', bg: 'bg-amber-500/10' },
};

const CASE_STATUS_STEPS = [
  { key: 'pending', label: 'Submitted', icon: Clock },
  { key: 'under_review', label: 'Under Review', icon: Search },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle },
];

const CASE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:      { label: 'Pending Review', color: 'text-gold',        bg: 'bg-gold/10 border-gold/30',            icon: Clock },
  under_review: { label: 'Under Review',  color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',           icon: Search },
  resolved:     { label: 'Resolved',      color: 'text-primary',     bg: 'bg-primary/10 border-primary/30',      icon: CheckCircle },
  closed:       { label: 'Closed',        color: 'text-muted-foreground', bg: 'bg-muted border-border',          icon: XCircle },
  rejected:     { label: 'Rejected',      color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: XCircle },
};

const CASE_TYPE_LABELS: Record<string, string> = {
  dispute: 'General Dispute', misconduct: 'Misconduct', fraud: 'Fraud / Financial Scam',
  harassment: 'Harassment / Bullying', impersonation: 'Impersonation', other: 'Other',
};

export function UserDashboard() {
  const { profile } = useAuth();
  const [passport, setPassport] = useState<Passport | null>(null);
  const [totalMembers, setTotalMembers] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState<MembershipRecord[]>([]);
  const [fundBalance, setFundBalance] = useState<{ income: number; expense: number; net: number } | null>(null);
  const [myRecognitions, setMyRecognitions] = useState<{ award_title: string; category: string; awarded_date: string }[]>([]);
  const [myCaseReports, setMyCaseReports] = useState<CaseReport[]>([]);
  const navigate = useNavigate();

  const isPaidMember = profile?.membership_type === 'premium' || profile?.membership_type === 'gold';

  useEffect(() => {
    if (profile) {
      fetchPassport();
      fetchPaymentHistory();
      fetchMyRecognitions();
      fetchMyCaseReports();
      if (isPaidMember) fetchFundBalance();
    }
    fetchMemberCount();
  }, [profile]);

  const fetchPassport = async () => {
    if (!profile) return;
    const { data } = await supabase.from('passports').select('*').eq('user_id', profile.id).maybeSingle();
    setPassport(data as Passport | null);
  };

  const fetchMemberCount = async () => {
    const { data } = await supabase.rpc('get_member_stats').maybeSingle();
    setTotalMembers(data?.total_members || 0);
  };

  const fetchPaymentHistory = async () => {
    if (!profile) return;
    const { data } = await supabase.from('memberships').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
    setPaymentHistory((data || []) as MembershipRecord[]);
  };

  const fetchFundBalance = async () => {
    const { data } = await supabase.from('fund_transactions').select('transaction_type, amount');
    const rows = data || [];
    const income = rows.filter((r: { transaction_type: string }) => r.transaction_type === 'income').reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
    const expense = rows.filter((r: { transaction_type: string }) => r.transaction_type === 'expense').reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
    setFundBalance({ income, expense, net: income - expense });
  };

  const fetchMyRecognitions = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('member_recognitions')
      .select('award_title, category, awarded_date')
      .eq('profile_id', profile.id)
      .eq('is_published', true)
      .order('awarded_date', { ascending: false });
    setMyRecognitions((data || []) as { award_title: string; category: string; awarded_date: string }[]);
  };

  const fetchMyCaseReports = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('case_reports')
      .select('id, title, case_type, status, admin_notes, created_at, updated_at')
      .eq('reporter_user_id', profile.id)
      .order('created_at', { ascending: false });
    setMyCaseReports((data || []) as CaseReport[]);
  };

  const daysToExpiry = passport?.expiry_date ? differenceInDays(parseISO(passport.expiry_date), new Date()) : null;
  const passportStatus = daysToExpiry !== null
    ? daysToExpiry < 0 ? 'expired' : daysToExpiry <= 365 ? 'expiring' : 'valid'
    : 'unknown';

  const membershipBadgeClass = {
    active: 'bg-primary text-primary-foreground',
    pending: 'bg-gold text-gold-foreground',
    expired: 'bg-destructive text-destructive-foreground',
  }[profile?.membership_status || 'pending'];

  const tier = TIER_CONFIG[profile?.membership_type || 'free'] || TIER_CONFIG.free;
  const TierIcon = tier.icon;
  const pendingPayment = paymentHistory.find(p => p.payment_status === 'pending');

  const quickActions = [
    { label: 'Hall of Honor', href: '/recognitions', icon: Award },
    { label: 'Community Donations', href: '/donations', icon: Heart },
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
                <h1 className="text-2xl font-bold text-primary-foreground">Welcome back, {profile?.first_name}!</h1>
                <p className="text-primary-foreground/65 text-sm mt-0.5">Your NIDO Vietnam member dashboard</p>
              </div>
            </div>
            <Badge className={`${membershipBadgeClass} text-sm px-4 py-1.5 relative`}>
              {profile?.membership_status === 'active' ? 'Active Member' :
               profile?.membership_status === 'pending' ? 'Pending Activation' : 'Expired'}
            </Badge>
          </div>

          {/* Alerts */}
          {pendingPayment && (
            <Alert className="mb-4 border-gold bg-gold/10">
              <Clock className="h-4 w-4 text-gold" />
              <AlertTitle className="text-gold">Payment Pending Review</AlertTitle>
              <AlertDescription>
                Your <strong className="capitalize">{pendingPayment.plan_type}</strong> membership payment is pending admin approval. You'll be notified once approved.
              </AlertDescription>
            </Alert>
          )}
          {passportStatus === 'expired' && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Passport Expired!</AlertTitle>
              <AlertDescription>Contact the Nigerian Embassy: +84-24-37263610</AlertDescription>
            </Alert>
          )}
          {passportStatus === 'expiring' && (
            <Alert className="mb-4 border-gold bg-gold/10">
              <Bell className="h-4 w-4 text-gold" />
              <AlertTitle className="text-gold">Passport Expiring Soon</AlertTitle>
              <AlertDescription>Your passport expires in <strong>{daysToExpiry} days</strong>.</AlertDescription>
            </Alert>
          )}

          {/* Case report status alert — show if any under_review */}
          {myCaseReports.some(c => c.status === 'under_review') && (
            <Alert className="mb-4 border-blue-300 bg-blue-50 dark:bg-blue-950/30">
              <RotateCcw className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-700 dark:text-blue-400">Case Under Review</AlertTitle>
              <AlertDescription className="text-blue-600 dark:text-blue-300">
                Admin is currently reviewing your case report. You can track the progress below.
              </AlertDescription>
            </Alert>
          )}

          {/* Recognition Banner */}
          {myRecognitions.length > 0 && (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/5 p-5 mb-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center shrink-0 shadow-gold">
                <Award className="h-6 w-6 text-gold-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-500" /> You are a Hall of Honor Honoree!
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {myRecognitions[0].award_title} · {new Date(myRecognitions[0].awarded_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  {myRecognitions.length > 1 && ` and ${myRecognitions.length - 1} more award${myRecognitions.length > 2 ? 's' : ''}`}
                </p>
              </div>
              <button onClick={() => navigate('/recognitions')} className="text-xs text-primary hover:underline shrink-0 flex items-center gap-1">
                View <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { icon: Calendar, label: 'Member Since', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '-', color: 'text-primary', bg: 'bg-primary/10' },
              { icon: TierIcon, label: 'Membership Tier', value: tier.label, color: tier.color, bg: tier.bg },
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
                      <img src={passport.passport_image_url} alt="Passport" className="w-full h-36 object-cover rounded-lg mb-3" onContextMenu={e => e.preventDefault()} />
                    )}
                    {passportRows.map(({ label, value }) => (
                      <div key={label} className="flex justify-between py-2 border-b border-border/50 last:border-0">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="text-sm font-medium text-foreground">{value}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm mb-3">No passport uploaded yet</p>
                    <Button variant="outline" size="sm" onClick={() => navigate('/profile')} className="text-primary border-primary hover:bg-primary/10">Upload Passport</Button>
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
                <div className={`flex items-center gap-3 p-4 rounded-xl mb-4 ${tier.bg} border border-border`}>
                  <div className={`w-10 h-10 rounded-xl ${tier.bg} flex items-center justify-center`}>
                    <TierIcon className={`h-5 w-5 ${tier.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{tier.label}</p>
                    <p className="text-xs text-muted-foreground">Status: <span className="capitalize font-medium">{profile?.membership_status}</span></p>
                  </div>
                  {pendingPayment && (
                    <Badge className="bg-gold/20 text-gold border-gold/30 text-[10px]">
                      <Clock className="h-2.5 w-2.5 mr-1" /> Pending
                    </Badge>
                  )}
                </div>
                {(profile?.membership_type === 'free' || profile?.membership_type === 'regular' || !profile?.membership_type) && !pendingPayment && (
                  <Button onClick={() => navigate('/membership')} className="w-full gradient-gold text-gold-foreground gap-2">
                    Upgrade Membership <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {(profile?.membership_type === 'premium') && !pendingPayment && (
                  <Button onClick={() => navigate('/membership')} className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2">
                    Upgrade to Gold <Crown className="h-4 w-4" />
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
                  <button key={href} onClick={() => navigate(href)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-primary/10 transition-smooth text-left">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground">{label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Community Fund Balance — paid members only */}
            {isPaidMember ? (
              <Card className={`shadow-card md:col-span-2 border ${profile?.membership_type === 'gold' ? 'border-amber-400/40' : 'border-primary/30'} overflow-hidden`}>
                <div className={`h-1 w-full ${profile?.membership_type === 'gold' ? 'gradient-gold' : 'gradient-primary'}`} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Banknote className={`h-5 w-5 ${profile?.membership_type === 'gold' ? 'text-amber-500' : 'text-primary'}`} />
                    Community Fund Balance
                    <Badge className={`ml-auto text-[10px] border ${profile?.membership_type === 'gold' ? 'bg-amber-500/10 text-amber-600 border-amber-400/30' : 'bg-primary/10 text-primary border-primary/30'}`}>
                      {profile?.membership_type === 'gold' ? <Crown className="h-2.5 w-2.5 mr-1 inline" /> : <Shield className="h-2.5 w-2.5 mr-1 inline" />}
                      {profile?.membership_type === 'gold' ? 'Gold Exclusive' : 'Premium Access'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {fundBalance ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-3 sm:col-span-1 rounded-xl bg-muted/40 border border-border p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Net Balance</p>
                        <p className={`text-2xl font-bold ${fundBalance.net >= 0 ? (profile?.membership_type === 'gold' ? 'text-amber-600' : 'text-primary') : 'text-destructive'}`}>
                          {VND(fundBalance.net)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Community treasury</p>
                      </div>
                      <div className="rounded-xl bg-green-500/5 border border-green-300/30 p-4 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Income</p>
                        </div>
                        <p className="text-lg font-bold text-green-700 dark:text-green-400">{VND(fundBalance.income)}</p>
                      </div>
                      <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Expenses</p>
                        </div>
                        <p className="text-lg font-bold text-destructive">{VND(fundBalance.expense)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                      <Banknote className="h-5 w-5 animate-pulse" />
                      <span className="text-sm">Loading balance...</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card md:col-span-2 border border-border/50 opacity-60">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">Community Fund Balance</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Upgrade to Premium or Gold to view the community treasury balance.</p>
                  </div>
                  <Button size="sm" onClick={() => navigate('/membership')} className="gradient-gold text-gold-foreground shrink-0">
                    Upgrade
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* My Case Reports */}
            {myCaseReports.length > 0 && (
              <Card className="shadow-card md:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive" /> My Case Reports
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => navigate('/report-case')} className="text-xs gap-1.5 text-primary border-primary hover:bg-primary/10">
                      <AlertTriangle className="h-3.5 w-3.5" /> New Report
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {myCaseReports.map(report => {
                    const cfg = CASE_STATUS_CONFIG[report.status] || CASE_STATUS_CONFIG.pending;
                    const StatusIcon = cfg.icon;
                    const stepIndex = CASE_STATUS_STEPS.findIndex(s => s.key === report.status);
                    const effectiveStep = stepIndex === -1 ? 0 : stepIndex;

                    return (
                      <div key={report.id} className="rounded-xl border border-border bg-card/50 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-start gap-3 p-4 border-b border-border/50">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg.split(' ')[0]} border ${cfg.bg.split(' ')[1] || 'border-border'}`}>
                            <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">{report.title}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="text-xs text-muted-foreground">{CASE_TYPE_LABELS[report.case_type] || report.case_type}</span>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                          </div>
                          <Badge className={`text-[10px] border shrink-0 ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                        </div>

                        {/* Progress tracker */}
                        {!['closed', 'rejected'].includes(report.status) && (
                          <div className="px-4 py-3 bg-muted/20">
                            <div className="flex items-center gap-0">
                              {CASE_STATUS_STEPS.map((step, i) => {
                                const StepIcon = step.icon;
                                const done = i <= effectiveStep;
                                const active = i === effectiveStep;
                                return (
                                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-smooth ${
                                        active ? 'bg-primary border-primary text-primary-foreground' :
                                        done ? 'bg-primary/20 border-primary/40 text-primary' :
                                        'bg-muted border-border text-muted-foreground'
                                      }`}>
                                        <StepIcon className="h-3.5 w-3.5" />
                                      </div>
                                      <span className={`text-[10px] font-medium whitespace-nowrap ${active ? 'text-primary' : done ? 'text-primary/60' : 'text-muted-foreground'}`}>
                                        {step.label}
                                      </span>
                                    </div>
                                    {i < CASE_STATUS_STEPS.length - 1 && (
                                      <div className={`flex-1 h-0.5 mb-4 mx-1 ${i < effectiveStep ? 'bg-primary/40' : 'bg-border'}`} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Admin notes */}
                        {report.admin_notes && (
                          <div className="px-4 py-3 border-t border-border/50 bg-blue-50/50 dark:bg-blue-950/10">
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Shield className="h-3 w-3" /> Admin Note
                            </p>
                            <p className="text-xs text-foreground/80 leading-relaxed">{report.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Payment History */}
            {paymentHistory.length > 0 && (
              <Card className="shadow-card md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {paymentHistory.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-sm font-semibold text-foreground capitalize">{p.plan_type} Plan</span>
                            <Badge className={`text-[10px] border ${
                              ['approved','completed'].includes(p.payment_status) ? 'bg-primary/20 text-primary border-primary/30' :
                              p.payment_status === 'pending' ? 'bg-gold/20 text-gold border-gold/30' :
                              'bg-destructive/20 text-destructive border-destructive/30'
                            }`}>
                              {p.payment_status === 'pending' ? <Clock className="h-2.5 w-2.5 mr-1 inline" /> : p.payment_status === 'approved' || p.payment_status === 'completed' ? <CheckCircle className="h-2.5 w-2.5 mr-1 inline" /> : null}
                              {p.payment_status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {p.currency === 'VND' ? VND(Number(p.amount)) : p.amount} · {new Date(p.created_at).toLocaleDateString()} · Ref: {p.payment_reference || '—'}
                          </p>
                        </div>
                        {p.valid_until && (
                          <p className="text-xs text-muted-foreground shrink-0">Until {new Date(p.valid_until).toLocaleDateString()}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}


