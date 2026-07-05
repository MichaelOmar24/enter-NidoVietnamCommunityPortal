import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Users, Briefcase, GraduationCap, Stethoscope, HandshakeIcon, TrendingUp, MessageSquare } from 'lucide-react';

const focusAreas = [
  { icon: TrendingUp, label: 'Foreign Direct Investment (FDI)', desc: 'Channelling investment opportunities between the diaspora and Nigeria.' },
  { icon: Briefcase, label: 'Professional Networking', desc: 'Connecting skilled Nigerians globally for career and business growth.' },
  { icon: MessageSquare, label: 'Stakeholder Advocacy', desc: 'Representing Nigerian diaspora interests at official and civic levels.' },
  { icon: Stethoscope, label: 'Medical Missions', desc: 'Supporting healthcare initiatives and medical outreach to Nigeria.' },
  { icon: GraduationCap, label: 'Educational Support', desc: 'Promoting access to quality education and academic partnerships.' },
  { icon: HandshakeIcon, label: 'Skills Transfer', desc: 'Facilitating knowledge and skills transfer to communities in Nigeria.' },
];

export function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 hero-pattern pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-gold/10 blur-3xl" />
        </div>
        <div className="container mx-auto relative text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img
              src="https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png"
              alt="NIDO Vietnam"
              className="h-16 w-auto drop-shadow-xl"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            About <span className="text-gradient-gold">NIDO Vietnam</span>
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-2xl mx-auto leading-relaxed">
            The Nigerians in Diaspora Organisation Vietnam — an arm of a global Nigerian Diaspora network.
          </p>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="section-accent" />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">Who We Are</h2>

          <div className="prose-custom space-y-5 text-muted-foreground leading-relaxed text-base">
            <p>
              The <strong className="text-foreground">Nigerians in Diaspora Organisation Vietnam (NIDO VN)</strong> is the arm of a global Nigerian Diaspora network. NIDO VN provides an umbrella to all Nigerians in Vietnam. In concert with the other continental arms of NIDO in the Americas, Asia and Africa, the organisation is the <strong className="text-foreground">largest assembly of Nigerians worldwide</strong>.
            </p>
            <p>
              The <strong className="text-foreground">Government of Nigeria recognises the organisation</strong> as an official platform through which individual Nigerian Diaspora, their Community Organizations, and Corporate Bodies can channel their developmental efforts to Nigeria.
            </p>
            <p>
              In this sense, the organisation partners with Nigerian Community / Professional Organizations and public and private businesses in focused areas such as Foreign Direct Investment (FDI), professional networking, stakeholder advocacy, medical missions, educational support and skills transfer to Nigeria.
            </p>
          </div>
        </div>
      </section>

      {/* Global Network */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row items-center gap-10 p-8 rounded-2xl gradient-primary text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 hero-pattern pointer-events-none opacity-30" />
            <div className="relative shrink-0 w-20 h-20 rounded-2xl bg-primary-foreground/15 flex items-center justify-center">
              <Globe className="h-10 w-10 text-gold" />
            </div>
            <div className="relative">
              <h3 className="text-xl font-bold mb-2">A Global Network</h3>
              <p className="text-primary-foreground/80 leading-relaxed">
                NIDO Vietnam is part of the worldwide NIDO network with continental arms across the <strong className="text-primary-foreground">Americas, Asia, and Africa</strong> — making it the largest assembly of Nigerians worldwide and an officially recognised partner of the Nigerian Government.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Focus Areas */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <div className="section-accent mx-auto" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">Our Focus Areas</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              We partner with community organisations and businesses across these key developmental areas.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {focusAreas.map(({ icon: Icon, label, desc }) => (
              <Card key={label} className="shadow-card card-lift hover:shadow-green transition-smooth border-border overflow-hidden group">
                <div className="h-1 gradient-primary" />
                <CardContent className="p-6">
                  <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-green group-hover:scale-110 transition-smooth">
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 leading-snug">{label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Government Recognition */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-gold/40 shadow-gold overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="gradient-gold p-8 md:w-52 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                <Users className="h-16 w-16 text-gold-foreground relative" />
              </div>
              <CardContent className="p-8 flex-1">
                <h3 className="text-xl font-bold text-foreground mb-3">Officially Recognised by the Government of Nigeria</h3>
                <p className="text-muted-foreground leading-relaxed">
                  NIDO is the official platform through which individual Nigerian Diaspora members, Community Organizations, and Corporate Bodies can channel their developmental contributions to Nigeria — backed by full government recognition.
                </p>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
