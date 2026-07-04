import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Shield, Users, ChevronRight } from 'lucide-react';

const PLANS = [
  {
    name: 'Regular Member',
    price: 'Free',
    desc: 'Basic community membership',
    color: 'border-border',
    badge: null,
    features: [
      'Community membership',
      'Access to NIDO Constitution',
      'Embassy news updates',
      'Community activities info',
      'WhatsApp group access',
      'Member directory listing',
    ],
    cta: 'Current Plan',
    ctaVariant: 'outline' as const,
    disabled: true,
  },
  {
    name: 'Premium Member',
    price: '$20',
    period: '/year',
    desc: 'Full featured NIDO membership',
    color: 'border-primary shadow-green',
    badge: 'Recommended',
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
    ctaVariant: 'default' as const,
    disabled: false,
  },
];

export function MembershipPage() {
  const handlePayment = () => {
    // Stripe integration placeholder
    alert('Payment integration coming soon! Please contact info@nidovietnam.com for premium membership.');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-20 flex-1">
        <div className="gradient-hero py-16 px-4">
          <div className="container mx-auto text-center">
            <Star className="h-12 w-12 text-gold mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">NIDO Vietnam Membership</h1>
            <p className="text-primary-foreground/80 max-w-xl mx-auto">
              Choose the membership plan that works for you and enjoy full access to all NIDO Vietnam community resources.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-12">
            {PLANS.map(plan => (
              <Card key={plan.name} className={`shadow-card relative ${plan.color}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-primary text-primary-foreground border-0 px-4">{plan.badge}</Badge>
                  </div>
                )}
                <CardHeader className="pt-8">
                  <div className="flex items-center gap-2 mb-2">
                    {plan.name === 'Premium Member' ? <Shield className="h-6 w-6 text-gold" /> : <Users className="h-6 w-6 text-primary" />}
                    <CardTitle className="text-foreground">{plan.name}</CardTitle>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground text-sm pb-1">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.desc}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full gap-2 ${plan.name === 'Premium Member' ? 'gradient-primary text-primary-foreground' : 'border-border'}`}
                    variant={plan.ctaVariant}
                    disabled={plan.disabled}
                    onClick={plan.disabled ? undefined : handlePayment}
                  >
                    {plan.cta} {!plan.disabled && <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payment Notice */}
          <div className="max-w-3xl mx-auto p-6 rounded-xl bg-muted/40 border border-border text-center">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Payment Integration:</strong> Online payment via card is coming soon. For immediate premium membership, please contact us at{' '}
              <a href="mailto:info@nidovietnam.com" className="text-primary hover:underline">info@nidovietnam.com</a> or call{' '}
              <a href="tel:+84326189705" className="text-primary hover:underline">+84326189705</a>.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
