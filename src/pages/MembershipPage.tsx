import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Shield, Users, ArrowRight, Mail, Phone } from 'lucide-react';
import { trackEvent } from '@enter-pro/analytics-sdk';

const PLANS = [
  {
    name: 'Regular Member',
    price: 'Free',
    period: null,
    desc: 'Basic community membership for all Nigerians in Vietnam',
    icon: Users,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
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
    cta: 'Current Plan',
    disabled: true,
  },
  {
    name: 'Premium Member',
    price: '$20',
    period: '/year',
    desc: 'Full featured membership with exclusive community benefits',
    icon: Shield,
    iconColor: 'text-gold-foreground',
    iconBg: 'gradient-gold',
    badge: 'Recommended',
    featured: true,
    features: [
      'Everything in Regular',
      'Business directory listing',
      'Premium member badge',
      'Priority embassy updates',
      'Exclusive community events',
      'NIDO certificate of membership',
      'Networking priority',
    ],
    cta: 'Upgrade Now',
    disabled: false,
  },
];

export function MembershipPage() {
  const handlePayment = () => {
    trackEvent('membership_upgrade_clicked', { eventType: 'conversion', properties: { plan: 'premium' } });
    alert('Payment integration coming soon! Please contact info@nidovietnam.com for premium membership.');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-20 flex-1">
        {/* Header */}
        <div className="gradient-hero py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 hero-pattern pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          <div className="container mx-auto text-center relative">
            <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-5 shadow-gold animate-pulse-glow">
              <Star className="h-8 w-8 text-gold-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">NIDO Vietnam Membership</h1>
            <p className="text-primary-foreground/75 max-w-xl mx-auto text-lg leading-relaxed">
              Choose the membership plan that works for you and enjoy full access to all NIDO Vietnam community resources.
            </p>
          </div>
        </div>

        {/* Plans */}
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
            {PLANS.map(plan => {
              const PlanIcon = plan.icon;
              return (
                <Card
                  key={plan.name}
                  className={`relative overflow-hidden transition-smooth ${
                    plan.featured
                      ? 'border-primary shadow-green scale-[1.02]'
                      : 'border-border shadow-card'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
                  )}
                  {plan.badge && (
                    <div className="absolute top-4 right-4">
                      <Badge className="gradient-primary text-primary-foreground border-0 font-semibold px-3">{plan.badge}</Badge>
                    </div>
                  )}
                  <CardHeader className="pt-8 pb-4 px-7">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.featured ? plan.iconBg : plan.iconBg}`}>
                      <PlanIcon className={`h-6 w-6 ${plan.featured ? 'text-gold-foreground' : plan.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{plan.desc}</p>
                    <div className="flex items-end gap-1.5 mt-4">
                      <span className={`text-5xl font-extrabold tracking-tight ${plan.featured ? 'text-gradient-primary' : 'text-foreground'}`}>
                        {plan.price}
                      </span>
                      {plan.period && <span className="text-muted-foreground text-base pb-1.5">{plan.period}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="px-7 pb-7">
                    <ul className="space-y-3 mb-7">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.featured ? 'gradient-primary' : 'bg-primary/10'}`}>
                            <Check className={`h-3 w-3 ${plan.featured ? 'text-primary-foreground' : 'text-primary'}`} />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full gap-2 h-11 font-semibold ${
                        plan.featured
                          ? 'gradient-primary text-primary-foreground shadow-green'
                          : 'border-border text-muted-foreground'
                      }`}
                      variant={plan.featured ? 'default' : 'outline'}
                      disabled={plan.disabled}
                      onClick={plan.disabled ? undefined : handlePayment}
                    >
                      {plan.cta} {!plan.disabled && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Payment Notice */}
          <div className="max-w-3xl mx-auto p-7 rounded-2xl bg-muted/40 border border-border">
            <h4 className="font-semibold text-foreground mb-2">Payment Integration Coming Soon</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Online card payments are being set up. For immediate premium membership, please contact us directly:
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <a href="mailto:info@nidovietnam.com" className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                <Mail className="h-4 w-4" /> info@nidovietnam.com
              </a>
              <a href="tel:+84326189705" className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                <Phone className="h-4 w-4" /> +84326189705
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
