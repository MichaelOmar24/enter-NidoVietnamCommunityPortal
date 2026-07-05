import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Check, Star, Shield, Users, Crown, ArrowRight,
  QrCode, Copy, CheckCircle, Clock, AlertTriangle, Banknote
} from 'lucide-react';
import { trackEvent } from '@enter-pro/analytics-sdk';

const VND = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

interface PaymentSettings {
  qr_code_url?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  bank_branch?: string;
  transfer_instructions?: string;
}

const PLANS = [
  {
    key: 'free',
    name: 'Free Member',
    price: 'Free',
    priceVND: null,
    period: null,
    desc: 'Basic community membership for all Nigerians in Vietnam',
    icon: Users,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    accentColor: '#00b359',
    badge: null,
    featured: false,
    features: [
      'Community membership',
      'Access to NIDO Constitution',
      'Embassy news updates',
      'Community activities info',
      'WhatsApp group access',
      'Member directory listing',
    ],
  },
  {
    key: 'premium',
    name: 'Premium Member',
    price: VND(1_000_000),
    priceVND: 1_000_000,
    period: '/year',
    desc: 'Full featured membership with exclusive community benefits',
    icon: Shield,
    iconBg: 'gradient-gold',
    iconColor: 'text-gold-foreground',
    accentColor: '#FFD700',
    badge: 'Recommended',
    featured: true,
    features: [
      'Everything in Free',
      'Business directory listing',
      'Premium member badge',
      'Priority embassy updates',
      'Exclusive community events',
      'NIDO certificate of membership',
      'Networking priority',
    ],
  },
  {
    key: 'gold',
    name: 'Gold Stakeholder',
    price: VND(2_000_000),
    priceVND: 2_000_000,
    period: '/year',
    desc: 'Top-tier stakeholder with full community privileges and recognition',
    icon: Crown,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-600',
    accentColor: '#f59e0b',
    badge: 'Stakeholder',
    featured: false,
    features: [
      'Everything in Premium',
      'Gold stakeholder badge',
      'VIP event seating & access',
      'Board advisory privileges',
      'Recognition on NIDO website',
      'Priority welfare support',
      'Annual stakeholder report',
    ],
  },
];

export function MembershipPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<PaymentSettings>({});
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState('');
  const [existingMembership, setExistingMembership] = useState<{ plan_type: string; payment_status: string } | null>(null);

  useEffect(() => {
    supabase.from('payment_settings').select('*').maybeSingle().then(({ data }) => {
      if (data) setSettings(data as PaymentSettings);
    });
    if (profile) {
      supabase.from('memberships').select('plan_type, payment_status')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setExistingMembership(data as { plan_type: string; payment_status: string });
        });
    }
  }, [profile]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleUpgrade = (plan: typeof PLANS[0]) => {
    if (!profile) { navigate('/login'); return; }
    trackEvent('membership_upgrade_clicked', { eventType: 'conversion', properties: { plan: plan.key } });
    setSelectedPlan(plan);
    setPaymentRef('');
    setNotes('');
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!profile || !selectedPlan || !paymentRef.trim()) return;
    setSubmitting(true);
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    const { error } = await supabase.from('memberships').insert({
      user_id: profile.id,
      plan_type: selectedPlan.key,
      amount: selectedPlan.priceVND,
      currency: 'VND',
      payment_status: 'pending',
      payment_reference: paymentRef.trim(),
      notes: notes.trim() || null,
      valid_from: validFrom.toISOString().split('T')[0],
      valid_until: validUntil.toISOString().split('T')[0],
    });

    setSubmitting(false);
    if (!error) {
      setSubmitted(true);
      setExistingMembership({ plan_type: selectedPlan.key, payment_status: 'pending' });
    }
  };

  const currentTier = profile?.membership_type || 'free';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-20 flex-1">
        {/* Hero */}
        <div className="gradient-hero py-16 px-4 relative overflow-hidden">
          <div className="absolute inset-0 hero-pattern pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          <div className="container mx-auto text-center relative">
            <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-5 shadow-gold animate-pulse-glow">
              <Star className="h-8 w-8 text-gold-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">NIDO Vietnam Membership</h1>
            <p className="text-primary-foreground/75 max-w-xl mx-auto text-lg leading-relaxed">
              Choose the plan that works for you and enjoy full access to NIDO Vietnam community resources.
            </p>
            {existingMembership?.payment_status === 'pending' && (
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/20 border border-gold/40 text-gold text-sm font-medium">
                <Clock className="h-4 w-4" /> Payment pending admin approval
              </div>
            )}
          </div>
        </div>

        {/* Plans Grid */}
        <div className="container mx-auto px-4 py-14">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {PLANS.map(plan => {
              const PlanIcon = plan.icon;
              const isCurrent = currentTier === plan.key;
              const isPaid = plan.priceVND !== null;

              return (
                <Card
                  key={plan.key}
                  className={`relative overflow-hidden transition-smooth ${
                    plan.featured
                      ? 'border-primary shadow-green scale-[1.02] z-10'
                      : 'border-border shadow-card'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
                  )}
                  {plan.badge && (
                    <div className="absolute top-4 right-4">
                      <Badge className={`text-[11px] font-semibold px-2.5 ${
                        plan.key === 'gold'
                          ? 'bg-amber-500/20 text-amber-600 border-amber-500/40 border'
                          : 'gradient-primary text-primary-foreground border-0'
                      }`}>{plan.badge}</Badge>
                    </div>
                  )}
                  <CardHeader className="pt-8 pb-4 px-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.iconBg}`}>
                      <PlanIcon className={`h-6 w-6 ${plan.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{plan.desc}</p>
                    <div className="flex items-end gap-1.5 mt-4">
                      <span className={`font-extrabold tracking-tight ${
                        plan.featured ? 'text-gradient-primary text-4xl' :
                        plan.key === 'gold' ? 'text-amber-600 text-3xl' : 'text-foreground text-4xl'
                      }`}>
                        {plan.price}
                      </span>
                      {plan.period && <span className="text-muted-foreground text-base pb-1">{plan.period}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <ul className="space-y-2.5 mb-6">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            plan.featured ? 'gradient-primary' :
                            plan.key === 'gold' ? 'bg-amber-500/20' : 'bg-primary/10'
                          }`}>
                            <Check className={`h-3 w-3 ${
                              plan.featured ? 'text-primary-foreground' :
                              plan.key === 'gold' ? 'text-amber-600' : 'text-primary'
                            }`} />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <Button variant="outline" disabled className="w-full h-11 text-muted-foreground border-border">
                        <CheckCircle className="h-4 w-4 mr-2" /> Current Plan
                      </Button>
                    ) : !isPaid ? (
                      <Button variant="outline" disabled className="w-full h-11 text-muted-foreground border-border">
                        Free — No Payment Needed
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleUpgrade(plan)}
                        className={`w-full h-11 font-semibold gap-2 ${
                          plan.key === 'gold'
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'gradient-primary text-primary-foreground shadow-green'
                        }`}
                      >
                        Upgrade Now <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info banner */}
          <div className="max-w-5xl mx-auto p-6 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Banknote className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">VND Bank Transfer Payment</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Payments are processed via direct VND bank transfer. After clicking Upgrade, you will receive the bank details and QR code to complete your transfer. Membership is activated once payment is verified by our team (usually within 24 hours).
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />

      {/* Payment Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={open => { if (!open) setSelectedPlan(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              {submitted ? 'Payment Submitted!' : `Upgrade to ${selectedPlan?.name}`}
            </DialogTitle>
          </DialogHeader>

          {submitted ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Payment Reference Submitted</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your payment reference has been submitted for review. Our team will verify your transfer and activate your membership within 24 hours.
              </p>
              <Badge className="bg-gold/20 text-gold border border-gold/30 px-4 py-1.5">
                <Clock className="h-3.5 w-3.5 mr-1.5" /> Pending Approval
              </Badge>
              <Button className="w-full mt-6 gradient-primary text-primary-foreground" onClick={() => setSelectedPlan(null)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Amount */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Amount to Transfer</p>
                <p className="text-2xl font-bold text-foreground">{selectedPlan?.price}</p>
                <p className="text-xs text-muted-foreground">{selectedPlan?.period?.replace('/', '') === 'year' ? 'per year' : ''} — Vietnamese Dong (VND)</p>
              </div>

              {/* QR Code */}
              {settings.qr_code_url && (
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground mb-2">Scan QR Code to Transfer</p>
                  <img
                    src={settings.qr_code_url}
                    alt="Bank Transfer QR Code"
                    className="w-48 h-48 object-contain mx-auto rounded-xl border border-border p-2 bg-white"
                    crossOrigin="anonymous"
                  />
                </div>
              )}

              {/* Bank Details */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Bank Account Details</p>
                {[
                  { label: 'Bank', value: settings.bank_name, key: 'bank' },
                  { label: 'Account Name', value: settings.account_name, key: 'name' },
                  { label: 'Account Number', value: settings.account_number, key: 'acc' },
                  { label: 'Branch', value: settings.bank_branch, key: 'branch' },
                ].filter(r => r.value).map(row => (
                  <div key={row.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">{row.label}</p>
                      <p className="text-sm font-semibold text-foreground">{row.value}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(row.value!, row.key)}
                      className="p-1.5 rounded-md hover:bg-primary/10 transition-smooth"
                    >
                      {copied === row.key
                        ? <CheckCircle className="h-4 w-4 text-primary" />
                        : <Copy className="h-4 w-4 text-muted-foreground" />
                      }
                    </button>
                  </div>
                ))}
              </div>

              {/* Instructions */}
              {settings.transfer_instructions && (
                <div className="p-3 rounded-lg bg-gold/10 border border-gold/30">
                  <p className="text-xs text-gold font-medium flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Important Instructions
                  </p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{settings.transfer_instructions}</p>
                </div>
              )}

              {/* Payment Reference Input */}
              <div className="space-y-2">
                <Label htmlFor="ref" className="text-sm font-medium">
                  Payment Reference / Transfer Note <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ref"
                  placeholder="e.g. NIDO Premium John Doe 0912345678"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Enter the exact note/description you used when making the transfer.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Additional Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                className="w-full h-11 gradient-primary text-primary-foreground font-semibold gap-2"
                onClick={handleSubmit}
                disabled={submitting || !paymentRef.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit Payment Reference'}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
