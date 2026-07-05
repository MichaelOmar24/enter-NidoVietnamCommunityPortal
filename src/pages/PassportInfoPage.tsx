import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { trackEvent } from '@enter-pro/analytics-sdk';
import {
  Shield, Phone, Mail, Globe, ChevronRight, CheckCircle,
  Info, Smartphone, Package, MapPin, AlertCircle, ExternalLink, Users
} from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: Globe,
    title: 'Initiate Online',
    tag: 'NIS Passport Portal',
    desc: 'Visit the official NIS Passport Portal at',
    link: { label: 'immigration.gov.ng', href: 'https://immigration.gov.ng' },
    details: [
      'Select "Apply from Outside Nigeria"',
      'Choose Renewal / Re-issue',
      'Select Malaysia (Kuala Lumpur) as your processing center',
      'Complete the application form and make the required payment online',
    ],
  },
  {
    number: '02',
    icon: Smartphone,
    title: 'Complete Mobile Biometrics',
    tag: 'NIS Mobile App',
    desc: 'Download the NIS Mobile App on your smartphone.',
    details: [
      'Select the "Contactless Biometric Enrolment" option',
      'Verify your National Identity Number (NIN)',
      'Capture your face and fingerprints using your smartphone camera',
      'Submit the biometric data — no visit to an office needed',
    ],
  },
  {
    number: '03',
    icon: Package,
    title: 'Prepare & Mail Your Documents',
    tag: 'From Hanoi to Malaysia',
    desc: 'Once biometrics are captured, mail your physical documents to the Nigerian High Commission in Malaysia.',
    details: [
      'Your current Nigerian International Passport',
      'Printed Passport Application Form from the portal',
      'Payment Receipt (printed)',
      'A prepaid, self-addressed return courier envelope (DHL or FedEx recommended) so the High Commission can mail your passports back to your Hanoi address',
    ],
  },
  {
    number: '04',
    icon: MapPin,
    title: 'Receive Your New Passport',
    tag: 'Delivered to Hanoi',
    desc: 'The High Commission will process your application and securely courier both your old and new passports back to your address in Hanoi using the prepaid envelope you provided.',
    details: [],
  },
];

const MAIL_ADDRESS = [
  'High Commission of the Federal Republic of Nigeria',
  'No. 85, Jalan Ampang Hilir,',
  'Taman Tiara, 55000 Kuala Lumpur,',
  'Malaysia',
];

const DOCUMENTS = [
  'Existing Nigerian International Passport',
  'Printed Passport Application Form (from portal)',
  'Payment Receipt (printed)',
  'Prepaid, self-addressed return courier envelope (DHL / FedEx)',
  'National Identity Number (NIN)',
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
                <p className="text-primary-foreground/80 text-lg max-w-xl leading-relaxed">
                  Renew your Nigerian passport from Hanoi — no travel to Malaysia required. Use the NIS Mobile App for biometric capture and mail your documents directly.
                </p>
              </div>
              <div className="flex-shrink-0 w-52 h-52 gradient-primary rounded-2xl flex items-center justify-center shadow-green">
                <Shield className="h-20 w-20 text-primary-foreground/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Key benefit banner */}
        <div className="bg-primary/8 border-b border-primary/20 py-5 px-4">
          <div className="container mx-auto">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-foreground">No Travel to Malaysia Required</h3>
                <p className="text-foreground/80 mt-1 text-sm leading-relaxed">
                  The Nigerian Embassy in Hanoi handles visas but relies on the Malaysian mission for passport interventions.
                  The <strong>contactless biometric app</strong> allows you to capture your biometrics from your smartphone in Hanoi, then mail your documents — so you never have to leave Vietnam.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 space-y-12">

          {/* Steps */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Step-by-Step Guide for Hanoi Applicants</h2>
              <p className="text-muted-foreground mt-1 text-sm">Route your processing through the Nigerian High Commission in Kuala Lumpur without leaving Vietnam.</p>
            </div>
            <div className="space-y-4">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="flex gap-5 p-6 rounded-xl border border-border hover:border-primary/40 hover:shadow-card transition-smooth bg-card">
                    {/* Number + icon */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center font-bold text-primary-foreground text-sm shadow-green">
                        {step.number}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border min-h-6" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground">{step.title}</h3>
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-medium">
                          {step.tag}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {step.desc}
                        {step.link && (
                          <>
                            {' '}
                            <a href={step.link.href} target="_blank" rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium">
                              {step.link.label} <ExternalLink className="h-3 w-3" />
                            </a>
                          </>
                        )}
                      </p>
                      {step.details.length > 0 && (
                        <ul className="space-y-1.5">
                          {step.details.map((d, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-foreground/85">
                              <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mailing Address + Documents grid */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* Mailing Address */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> Mailing Address in Malaysia
              </h2>
              <Card className="shadow-card border-primary/20">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Send your secure courier package to:
                  </p>
                  <div className="space-y-1 mb-5">
                    {MAIL_ADDRESS.map((line, i) => (
                      <p key={i} className={`text-sm ${i === 0 ? 'font-bold text-foreground' : 'text-foreground/80'}`}>{line}</p>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-muted/50 border border-border">
                    <Phone className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">High Commission Phone</p>
                      <p className="text-sm font-semibold text-foreground">+60 3-4251 8512</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                    Use <strong className="text-foreground">DHL or FedEx</strong> for reliable international courier. Include a prepaid, self-addressed return envelope so your passports can be securely mailed back to your Hanoi address.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Documents for mail package */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" /> Documents to Mail
              </h2>
              <Card className="shadow-card">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Include in your courier package:
                  </p>
                  <ul className="space-y-3">
                    {DOCUMENTS.map((doc, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Alternative: In-Person Intervention */}
          <div className="rounded-2xl border border-amber-300/50 bg-amber-50/30 dark:bg-amber-900/10 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground mb-1">Alternative: In-Person Intervention</h3>
                <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                  If the app rejects your biometric capture or flags you as ineligible, you do not automatically have to fly to Malaysia.
                  The High Commission in Malaysia <strong>periodically sends immigration officers</strong> to conduct in-person passport intervention exercises in <strong>Hanoi</strong> and <strong>Ho Chi Minh City</strong>.
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Monitor the Nigerian Embassy Hanoi website for upcoming intervention dates and book a physical appointment locally.
                </p>
                <a
                  href="https://nigeriaembassy.org.vn/news-and-events/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline font-medium"
                >
                  Check Embassy News for Intervention Dates <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Contact Cards */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" /> Embassy Contacts
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Hanoi Embassy */}
              <Card className="shadow-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <p className="font-semibold text-foreground text-sm">Nigerian Embassy — Hanoi, Vietnam</p>
                  </div>
                  <div className="space-y-2">
                    {[
                      { icon: Phone, text: '+84-24-37263610 / +84-24-37263611' },
                      { icon: Phone, text: 'WhatsApp: +84775568278' },
                      { icon: AlertCircle, text: 'Fax: +84-24-37263615' },
                    ].map(({ icon: Icon, text }, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{text}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                      <a href="https://nigeriaembassy.org.vn" target="_blank" rel="noopener noreferrer"
                        className="text-primary hover:underline">
                        nigeriaembassy.org.vn
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* NIDO Vietnam */}
              <Card className="shadow-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-gold" />
                    <p className="font-semibold text-foreground text-sm">NIDO Vietnam</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 text-gold shrink-0" />
                      <span>+84326189705 — Dr. Michael Omar</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3.5 w-3.5 text-gold shrink-0" />
                      <a href="mailto:info@nidovietnam.com" className="text-primary hover:underline">
                        info@nidovietnam.com
                      </a>
                    </div>
                  </div>
                  <a href="https://nigeriaembassy.org.vn" target="_blank" rel="noopener noreferrer">
                    <Button className="w-full gradient-primary text-primary-foreground gap-2 mt-2" size="sm">
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
