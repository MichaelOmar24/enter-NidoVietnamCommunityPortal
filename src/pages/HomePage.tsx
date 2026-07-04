import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, Building2, Globe, ChevronRight, BookOpen, Image,
  Calendar, AlertCircle, Facebook, MessageCircle, Phone, Mail,
  ExternalLink, CheckCircle, Shield, Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Activity, GalleryPhoto } from '@/lib/types';

interface Stats {
  totalMembers: number;
  activeMembers: number;
  companies: number;
  activities: number;
}

export function HomePage() {
  const [stats, setStats] = useState<Stats>({ totalMembers: 0, activeMembers: 0, companies: 0, activities: 0 });
  const [embassyNotices, setEmbassyNotices] = useState<{ title: string; date: string; excerpt: string }[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchActivities();
    fetchGallery();
    fetchEmbassyNews();
  }, []);

  const fetchStats = async () => {
    const [{ count: total }, { count: active }, { count: companies }, { count: acts }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('membership_status', 'active'),
      supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_approved', true),
      supabase.from('activities').select('*', { count: 'exact', head: true }).eq('is_published', true),
    ]);
    setStats({ totalMembers: total || 0, activeMembers: active || 0, companies: companies || 0, activities: acts || 0 });
  };

  const fetchActivities = async () => {
    const { data } = await supabase.from('activities')
      .select('*').eq('is_published', true).order('event_date', { ascending: false }).limit(3);
    setRecentActivities((data || []) as Activity[]);
  };

  const fetchGallery = async () => {
    const { data } = await supabase.from('gallery_photos').select('*').limit(6).order('created_at', { ascending: false });
    setGalleryPhotos((data || []) as GalleryPhoto[]);
  };

  const fetchEmbassyNews = async () => {
    try {
      const { data } = await supabase.functions.invoke('embassy-news');
      if (data?.notices) setEmbassyNotices(data.notices);
    } catch (_) {
      // Fallback static notices
      setEmbassyNotices([
        { title: 'Passport Renewal Update', date: 'June 2025', excerpt: 'Nigerian citizens in Vietnam are advised to renew their passports before expiry. Contact the embassy for guidance.' },
        { title: 'Emergency Contact Information', date: 'May 2025', excerpt: 'For emergency consular services, contact the embassy on +84-24-37263610.' },
        { title: 'Community Meeting Notice', date: 'April 2025', excerpt: 'NIDO Vietnam quarterly meeting announced. All registered members are encouraged to attend.' },
      ]);
    }
  };

  const statItems = [
    { icon: Users, label: 'Registered Members', value: stats.totalMembers, color: 'text-primary' },
    { icon: CheckCircle, label: 'Active Members', value: stats.activeMembers, color: 'text-gold' },
    { icon: Building2, label: 'Nigerian Businesses', value: stats.companies, color: 'text-accent' },
    { icon: Calendar, label: 'Community Events', value: stats.activities, color: 'text-primary' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="gradient-hero pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-gold/10 blur-3xl" />
        </div>
        
        <div className="container mx-auto relative">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center gap-2 justify-center lg:justify-start mb-4">
                <img src="https://cdn.enter.pro/resources/uid_100149613/db051db4-b309-4c.jpeg" alt="Coat of Arms" className="h-10 w-10 rounded-full object-cover" />
                <Badge className="gradient-gold text-gold-foreground border-0 font-semibold">Official Community Platform</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold text-primary-foreground leading-tight mb-6">
                Nigerians in<br />
                <span className="text-gold">Diaspora</span><br />
                Organization Vietnam
              </h1>
              <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Connecting Nigerians across Vietnam — building community, fostering opportunities, and preserving identity far from home.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {user ? (
                  <Button size="lg" className="gradient-gold text-gold-foreground font-bold shadow-gold" onClick={() => navigate('/dashboard')}>
                    My Dashboard <ChevronRight className="h-5 w-5 ml-1" />
                  </Button>
                ) : (
                  <Button size="lg" className="gradient-gold text-gold-foreground font-bold shadow-gold" onClick={() => navigate('/register')}>
                    Join NIDO Vietnam <ChevronRight className="h-5 w-5 ml-1" />
                  </Button>
                )}
                <Button size="lg" variant="outline" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate('/directory')}>
                  <Building2 className="h-5 w-5 mr-2" /> Business Directory
                </Button>
              </div>
              {/* Social quick links */}
              <div className="flex items-center gap-4 mt-8 justify-center lg:justify-start">
                <span className="text-primary-foreground/60 text-sm">Connect:</span>
                <a href="https://www.facebook.com/groups/357099351095953" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary-foreground/80 hover:text-gold transition-smooth text-sm">
                  <Facebook className="h-4 w-4" /> Facebook
                </a>
                <a href="https://chat.whatsapp.com/JY6blJObydS8b7CMvcrYMJ" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary-foreground/80 hover:text-gold transition-smooth text-sm">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>
            <div className="flex-shrink-0">
              <img
                src="https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png"
                alt="NIDO Vietnam"
                className="h-48 md:h-64 w-auto drop-shadow-2xl animate-fade-in-up"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {statItems.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="text-center p-4">
                <Icon className={`h-8 w-8 mx-auto mb-2 ${color}`} />
                <div className="text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Embassy Notices */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Embassy Notices</h2>
              <p className="text-muted-foreground mt-1">Latest updates from the Nigerian Embassy in Vietnam</p>
            </div>
            <a href="https://nigeriaembassy.org.vn" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="text-primary border-primary hover:bg-primary/10 gap-2">
                <ExternalLink className="h-4 w-4" /> Embassy Website
              </Button>
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {embassyNotices.map((notice, i) => (
              <Card key={i} className="shadow-card hover:shadow-green transition-smooth border-border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
                      <AlertCircle className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{notice.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{notice.date}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{notice.excerpt}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Embassy Contact Banner */}
          <div className="mt-8 p-6 rounded-2xl gradient-primary text-primary-foreground">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg">Nigerian Embassy — Hanoi, Vietnam</h3>
                <p className="text-primary-foreground/80 text-sm mt-1">For official matters and emergency consular services</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>+84-24-37263610 / 37263611</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp: +84775568278</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>Fax: +84-24-37263615</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Biometric Passport Notice */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto">
          <Card className="border-gold shadow-gold overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="gradient-gold p-6 md:w-48 flex items-center justify-center">
                <Shield className="h-16 w-16 text-gold-foreground" />
              </div>
              <CardContent className="p-6 flex-1">
                <Badge className="bg-gold text-gold-foreground border-0 mb-3">Important Notice</Badge>
                <h3 className="text-xl font-bold text-foreground mb-2">Contactless Biometric Passport Enrollment</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  Nigerians in Vietnam who wish to enroll in the contactless biometric passport program must
                  <strong className="text-foreground"> select Malaysia as their enrollment location</strong> and make payment to Nigerian
                  Immigration. Follow the embassy's official instructions carefully.
                </p>
                <Link to="/passport-info">
                  <Button className="gradient-primary text-primary-foreground gap-2">
                    View Full Instructions <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>

      {/* Upcoming Activities */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Community Activities</h2>
              <p className="text-muted-foreground mt-1">Upcoming events and community programs</p>
            </div>
            <Link to="/activities">
              <Button variant="outline" className="text-primary border-primary hover:bg-primary/10">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          {recentActivities.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {recentActivities.map((activity) => (
                <Card key={activity.id} className="shadow-card hover:shadow-green transition-smooth overflow-hidden">
                  {activity.cover_image_url && (
                    <img src={activity.cover_image_url} alt={activity.title} className="w-full h-40 object-cover" />
                  )}
                  <CardContent className="p-5">
                    <Badge className="gradient-primary text-primary-foreground border-0 text-xs mb-2">Event</Badge>
                    <h3 className="font-semibold text-foreground">{activity.title}</h3>
                    {activity.event_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {new Date(activity.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    {activity.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{activity.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No upcoming activities. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Gallery Preview */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Gallery</h2>
              <p className="text-muted-foreground mt-1">Moments from our community events</p>
            </div>
            <Link to="/gallery">
              <Button variant="outline" className="text-primary border-primary hover:bg-primary/10">
                Full Gallery <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Inauguration photos */}
            <div className="relative overflow-hidden rounded-xl shadow-card hover:shadow-green transition-smooth group col-span-2 md:col-span-1">
              <img
                src="https://cdn.enter.pro/resources/uid_100149613/8c7a13b1-1326-42.JPG"
                alt="NIDO Vietnam Inauguration"
                className="w-full h-48 object-cover group-hover:scale-105 transition-smooth"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-smooth flex items-end p-3">
                <p className="text-white text-sm font-medium">Inauguration Ceremony 2016</p>
              </div>
            </div>
            {galleryPhotos.slice(0, 5).map((photo) => (
              <div key={photo.id} className="relative overflow-hidden rounded-xl shadow-card hover:shadow-green transition-smooth group">
                <img src={photo.image_url} alt={photo.caption} className="w-full h-48 object-cover group-hover:scale-105 transition-smooth" />
                {photo.caption && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-smooth flex items-end p-3">
                    <p className="text-white text-sm">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
            {galleryPhotos.length === 0 && Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-muted h-48 flex items-center justify-center">
                <Image className="h-8 w-8 text-muted-foreground/40" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-gold/10 blur-3xl" />
        </div>
        <div className="container mx-auto text-center relative">
          <Star className="h-12 w-12 text-gold mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Become a NIDO Vietnam Member
          </h2>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8 text-lg">
            Join hundreds of Nigerians across Vietnam. Access community resources, embassy updates, business networking, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gradient-gold text-gold-foreground font-bold shadow-gold" onClick={() => navigate('/register')}>
              Register Now — It's Free <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate('/contact')}>
              <Phone className="h-5 w-5 mr-2" /> Contact Us
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-primary-foreground/70 text-sm">
            <div className="flex items-center gap-2"><Globe className="h-4 w-4" /><span>Hanoi & Ho Chi Minh City</span></div>
            <div className="flex items-center gap-2"><Shield className="h-4 w-4" /><span>Officially Registered Organization</span></div>
            <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>Growing Community</span></div>
          </div>
        </div>
      </section>

      {/* Quick Links for Resources */}
      <section className="py-12 px-4 bg-card border-t border-border">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: BookOpen, label: 'NIDO Constitution', href: '/constitution', desc: 'Read our founding document' },
              { icon: Building2, label: 'Business Directory', href: '/directory', desc: 'Nigerian businesses in VN' },
              { icon: Image, label: 'Photo Gallery', href: '/gallery', desc: 'Community event photos' },
              { icon: Phone, label: 'Contact NIDO', href: '/contact', desc: 'Get in touch with us' },
            ].map(({ icon: Icon, label, href, desc }) => (
              <Link key={href} to={href} className="group p-4 rounded-xl border border-border hover:border-primary hover:shadow-card transition-smooth text-center">
                <Icon className="h-8 w-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-smooth" />
                <h3 className="font-semibold text-foreground text-sm">{label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
