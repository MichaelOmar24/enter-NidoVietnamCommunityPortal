import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { trackEvent } from '@enter-pro/analytics-sdk';import { Shield, Phone, Mail, Globe, ChevronRight, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    title: 'Locate the Immigration Office',
    desc: 'Nigerians residing in Vietnam cannot directly apply in Vietnam. You must select Malaysia as your enrollment location when applying.'
  },
  {
    number: '02',
    title: 'Book Appointment in Malaysia',
    desc: 'Visit the Nigerian Immigration portal and select Malaysia as your country of enrollment. Book an appointment at the Nigerian High Commission in Kuala Lumpur.'
  },
  {
    number: '03',
    title: 'Make Required Payment',
    desc: 'Pay the applicable fees to Nigerian Immigration. Fees are subject to change — confirm the current fee schedule from the Nigerian Immigration Service website or embassy.'
  },
  {
    number: '04',
    title: 'Travel to Malaysia',
    desc: 'Travel to Malaysia for your scheduled biometric enrollment appointment. Ensure you carry all required documents including existing passport, NIN, and appointment confirmation.'
  },
  {
    number: '05',
    title: 'Biometric Capture',
    desc: 'Your contactless biometric data (fingerprints, facial recognition) will be captured at the designated center in Malaysia.'
  },
  {
    number: '06',
    title: 'Collect Your Passport',
    desc: 'After processing, your new biometric passport can be collected or delivered. Collection options vary — confirm with the High Commission in Malaysia.'
  },
];

const DOCUMENTS = [
  'Existing Nigerian International Passport',
  'National Identity Number (NIN)',
  'Appointment booking confirmation',
  'Passport photographs (white background)',
  'Proof of residence in Vietnam',
  'Payment receipt',
  'Birth certificate (if first passport)',
];

export function PassportInfoPage() {
  useEffect(() => {
    trackEvent('passport_info_viewed', { eventType: 'custom' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-20 flex-1">
        {/* Header */}
        <div className="gradient-hero py-16 px-4">
          <div className="container mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="flex-1 text-center lg:text-left">
                <Badge className="gradient-gold text-gold-foreground border-0 mb-4">Official Information</Badge>
                <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                  Contactless Biometric Passport Enrollment
                </h1>
                <p className="text-primary-foreground/80 text-lg max-w-xl">
                  Complete guide for Nigerians in Vietnam applying for the new contactless biometric passport.
                </p>
              </div>
              <div className="flex-shrink-0 w-64 h-64 gradient-primary rounded-2xl flex items-center justify-center shadow-green">
                <Shield className="h-24 w-24 text-primary-foreground/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-gold/10 border-b border-gold/30 py-6 px-4">
          <div className="container mx-auto">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-gold shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-foreground">Important for Nigerians in Vietnam</h3>
                <p className="text-foreground/80 mt-1">
                  <strong>Vietnamese residents must select Malaysia</strong> as their enrollment country when applying for the contactless biometric passport online.
                  There is currently no Nigerian Immigration enrollment center in Vietnam. You must travel to Malaysia for biometric capture.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Steps */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Step-by-Step Process</h2>
            <div className="space-y-4">
              {STEPS.map((step, i) => (
                <div key={i} className="flex gap-5 p-5 rounded-xl border border-border hover:border-primary hover:shadow-card transition-smooth">
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center shrink-0 font-bold text-primary-foreground">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Required Documents */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" /> Required Documents
              </h2>
              <Card className="shadow-card">
                <CardContent className="p-5">
                  <ul className="space-y-2">
                    {DOCUMENTS.map((doc, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Embassy Contact */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> Embassy Contacts
              </h2>
              <Card className="shadow-card">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <p className="font-semibold text-foreground mb-2">Nigerian Embassy — Hanoi, Vietnam</p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary shrink-0" />
                        <span>+84-24-37263610 / +84-24-37263611</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary shrink-0" />
                        <span>WhatsApp only: +84775568278</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary shrink-0" />
                        <span>Fax: +84-24-37263615</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary shrink-0" />
                        <a href="https://nigeriaembassy.org.vn" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          nigeriaembassy.org.vn
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="font-semibold text-foreground mb-2">NIDO Vietnam</p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gold shrink-0" />
                        <span>+84326189705 — Dr. Michael Omar</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gold shrink-0" />
                        <a href="mailto:info@nidovietnam.com" className="text-primary hover:underline">info@nidovietnam.com</a>
                      </div>
                    </div>
                  </div>

                  <a href="https://nigeriaembassy.org.vn" target="_blank" rel="noopener noreferrer">
                    <Button className="w-full gradient-primary text-primary-foreground gap-2 mt-2">
                      Visit Embassy Website <ChevronRight className="h-4 w-4" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>


        </div>
      </div>
      <Footer />
    </div>
  );
}
