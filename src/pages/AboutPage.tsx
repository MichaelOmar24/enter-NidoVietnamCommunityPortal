import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Users, Briefcase, GraduationCap, Stethoscope, HandshakeIcon, TrendingUp, MessageSquare, Quote } from 'lucide-react';

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

      {/* President's Message */}
      <section className="py-20 px-4 bg-muted/30 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-5xl relative">
          <div className="text-center mb-12">
            <div className="section-accent mx-auto" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">Message from the President</h2>
          </div>

          <Card className="border-gold/40 shadow-gold overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Signature panel */}
              <div className="gradient-gold p-8 md:w-72 shrink-0 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gold-foreground/15 flex items-center justify-center mx-auto mb-5 ring-2 ring-gold-foreground/30">
                    <Quote className="h-9 w-9 text-gold-foreground" />
                  </div>
                  <p className="font-bold text-gold-foreground text-lg leading-snug">Awoms Ikechukwu Henry</p>
                  <div className="w-10 h-0.5 bg-gold-foreground/40 mx-auto my-3" />
                  <p className="text-gold-foreground/85 text-sm font-medium tracking-wide uppercase">President</p>
                  <p className="text-gold-foreground/70 text-xs mt-0.5">NIDO Vietnam Chapter</p>
                </div>
              </div>

              {/* Message body */}
              <CardContent className="p-8 md:p-10 flex-1 relative">
                <Quote className="absolute top-6 right-8 h-16 w-16 text-gold/15 pointer-events-none" />
                <div className="space-y-4 text-muted-foreground leading-relaxed text-sm md:text-base">
                  <p>
                    <span className="text-4xl font-bold text-primary float-left leading-none mr-2 mt-1">W</span>
                    elcome to the official website of the Nigerians in Diaspora Organization (NIDO) Vietnam Chapter.
                  </p>
                  <p>
                    It is my great honor and privilege to introduce NIDO Vietnam, an organization established in 2015 with the vision of bringing together the talents, expertise, knowledge, and experiences of Nigerians living in Vietnam to contribute meaningfully to socio-economic development in both Nigeria and our host country, Vietnam.
                  </p>
                  <p>
                    The Nigerians in Diaspora Organization (NIDO) was established in 2001 under the leadership of the Federal Government of Nigeria during the administration of President Olusegun Obasanjo. Since its establishment, NIDO has served as a recognized platform for connecting Nigerians in the Diaspora, their professional networks, community organizations, and corporate partners to support national development initiatives while strengthening relationships with their host countries.
                  </p>
                  <p>
                    Inspired by this vision, NIDO Vietnam operates as a member-driven organization dedicated to promoting professional networking, economic empowerment, technological advancement, cultural exchange, and knowledge sharing. Through collaboration among professionals, entrepreneurs, academics, policymakers, and members of the Nigerian community, we aim to create opportunities that benefit both Nigeria and Vietnam.
                  </p>
                  <p>
                    NIDO Vietnam remains committed to providing a platform where ideas, expertise, and innovative solutions can be shared to support development efforts, encourage partnerships, and strengthen the bond between Nigerians in Vietnam and our wider communities.
                  </p>
                  <p className="text-foreground font-medium">
                    We warmly welcome you to connect, collaborate, and engage with us as we continue building a stronger, united, and impactful Nigerian community in Vietnam.
                  </p>
                </div>
                {/* Mobile signature (shown below text on small screens) */}
                <div className="mt-8 pt-6 border-t border-border md:hidden text-center">
                  <p className="font-bold text-foreground">Awoms Ikechukwu Henry</p>
                  <p className="text-muted-foreground text-sm">President, NIDO Vietnam Chapter</p>
                </div>
              </CardContent>
            </div>
          </Card>
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
