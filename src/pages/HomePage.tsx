import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, Building2, Globe, ChevronRight, BookOpen, Image,
  Calendar, AlertCircle, Facebook, MessageCircle, Phone,
  ExternalLink, CheckCircle, Shield, Star, ArrowRight, Rss, Bell, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Activity, GalleryPhoto } from '@/lib/types';

interface EmbassyNewsItem {
  id: number;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  url: string;
  category: string;
}

interface Stats {
  totalMembers: number;
  activeMembers: number;
  companies: number;
  activities: number;
}

export function HomePage() {
  const [stats, setStats] = useState<Stats>({ totalMembers: 0, activeMembers: 0, companies: 0, activities: 0 });
  const [embassyNews, setEmbassyNews] = useState<EmbassyNewsItem[]>([]);
  const [noticeBoard, setNoticeBoard] = useState<{ type: string; title: string; excerpt: string; url: string }[]>([]);
  const [embassySource, setEmbassySource] = useState<'loading' | 'live' | 'fallback'>('loading');
  const [activeArticle, setActiveArticle] = useState<EmbassyNewsItem | null>(null);
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
      if (data?.newsItems?.length > 0) {
        setEmbassyNews(data.newsItems.slice(0, 5));
        setEmbassySource('live');
      } else {
        setEmbassySource('fallback');
      }
      if (data?.noticeBoard) setNoticeBoard(data.noticeBoard);
    } catch (_) {
      setEmbassySource('fallback');
    }
  };

  const statItems = [
    { icon: Users, label: 'Registered Members', value: stats.totalMembers, colorIcon: 'text-primary', gradient: 'from-primary/10 to-primary/5' },
    { icon: CheckCircle, label: 'Active Members', value: stats.activeMembers, colorIcon: 'text-gold', gradient: 'from-gold/10 to-gold/5' },
    { icon: Building2, label: 'Nigerian Businesses', value: stats.companies, colorIcon: 'text-accent', gradient: 'from-accent/10 to-accent/5' },
    { icon: Calendar, label: 'Community Events', value: stats.activities, colorIcon: 'text-primary', gradient: 'from-primary/10 to-primary/5' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="gradient-hero pt-32 pb-24 px-4 relative overflow-hidden">
        {/* Dot pattern overlay */}
        <div className="absolute inset-0 hero-pattern pointer-events-none" />
        {/* Glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-gold/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="container mx-auto relative">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center gap-2 justify-center lg:justify-start mb-6">
                <img src="https://cdn.enter.pro/resources/uid_100149613/db051db4-b309-4c.jpeg" alt="Coat of Arms" className="h-9 w-9 rounded-full object-cover ring-2 ring-gold/60" />
                <Badge className="gradient-gold text-gold-foreground border-0 font-semibold text-xs px-3 py-1">Official Community Platform</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold text-primary-foreground leading-tight mb-6">
                Nigerians in<br />
                <span className="text-gradient-gold">Diaspora</span><br />
                Organization Vietnam
              </h1>
              <p className="text-primary-foreground/75 text-lg max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                Connecting Nigerians across Vietnam — building community, fostering opportunities, and preserving identity far from home.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {user ? (
                  <Button size="lg" className="gradient-gold text-gold-foreground font-bold shadow-gold gap-2 h-12 px-6" onClick={() => navigate('/dashboard')}>
                    My Dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="lg" className="gradient-gold text-gold-foreground font-bold shadow-gold gap-2 h-12 px-6" onClick={() => navigate('/register')}>
                    Join NIDO Vietnam <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-12 px-6 glass-hero" onClick={() => navigate('/directory')}>
                  <Building2 className="h-4 w-4 mr-2" /> Business Directory
                </Button>
              </div>
              {/* Social quick links */}
              <div className="flex items-center gap-5 mt-10 justify-center lg:justify-start">
                <span className="text-primary-foreground/50 text-sm">Connect:</span>
                <button
                  onClick={() => window.open('https://www.facebook.com/groups/357099351095953', '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-1.5 text-primary-foreground/70 hover:text-gold transition-smooth text-sm font-medium">
                  <Facebook className="h-4 w-4" /> Facebook
                </button>
                <button
                  onClick={() => window.open('https://chat.whatsapp.com/JY6blJObydS8b7CMvcrYMJ', '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-1.5 text-primary-foreground/70 hover:text-gold transition-smooth text-sm font-medium">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </button>
              </div>
            </div>
            <div className="flex-shrink-0 relative">
              {/* Decorative ring */}
              <div className="absolute inset-0 rounded-full bg-gold/10 blur-2xl scale-150" />
              <img
                src="https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png"
                alt="NIDO Vietnam"
                className="relative h-52 md:h-72 w-auto drop-shadow-2xl animate-float"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-14 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {statItems.map(({ icon: Icon, label, value, colorIcon, gradient }) => (
              <div key={label} className={`relative overflow-hidden text-center p-6 rounded-2xl bg-gradient-to-br ${gradient} border border-border/60 shadow-card stat-card-top card-lift`}>
                <div className={`w-12 h-12 rounded-xl bg-card flex items-center justify-center mx-auto mb-3 shadow-sm`}>
                  <Icon className={`h-6 w-6 ${colorIcon}`} />
                </div>
                <div className="text-3xl font-bold text-foreground tracking-tight">{value.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1.5 font-semibold uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Embassy Notices */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="section-accent" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Embassy Notices</h2>
              <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-sm">
                {embassySource === 'live'
                  ? <><Rss className="h-3.5 w-3.5 text-primary" /> Live from nigeriaembassy.org.vn</>
                  : 'Latest updates from the Nigerian Embassy in Vietnam'}
              </p>
            </div>
            <a href="https://nigeriaembassy.org.vn/news-and-events/" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="text-primary border-primary hover:bg-primary/10 gap-2 hidden sm:flex">
                <ExternalLink className="h-4 w-4" /> Embassy Website
              </Button>
            </a>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* News feed — left (wider) */}
            <div className="lg:col-span-3 rounded-2xl border border-border bg-card overflow-hidden shadow-card">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
                <Rss className="h-4 w-4 text-primary" />
                <p className="font-semibold text-foreground text-sm">Latest News &amp; Events</p>
                {embassySource === 'live' && (
                  <span className="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">LIVE</span>
                )}
              </div>
              {embassySource === 'loading' ? (
                <div className="divide-y divide-border">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="px-5 py-4 animate-pulse">
                      <div className="h-3.5 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-2.5 bg-muted rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : embassyNews.length === 0 ? (
                <div className="px-5 py-10 text-center text-muted-foreground text-sm">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Could not load live news. Visit the embassy website directly.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {embassyNews.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveArticle(item)}
                      className="w-full flex items-start gap-3.5 px-5 py-4 hover:bg-muted/40 transition-smooth group text-left"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0 group-hover:scale-125 transition-smooth" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-smooth leading-snug line-clamp-2">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-muted-foreground">{item.date}</span>
                          {item.category && (
                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">{item.category}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-smooth shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              )}
              <div className="px-5 py-3 border-t border-border bg-muted/20">
                <a href="https://nigeriaembassy.org.vn/news-and-events/" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all embassy news <ChevronRight className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Notice Board — right */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="h-4 w-4 text-primary" />
                <p className="font-semibold text-foreground text-sm">Notice Board</p>
              </div>
              {noticeBoard.length === 0 ? (
                [1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />)
              ) : (
                noticeBoard.map((notice, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveArticle({ id: -i, title: notice.title, date: '', excerpt: notice.excerpt, content: '', url: notice.url, category: 'Notice Board' })}
                    className="w-full block rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-card transition-smooth group text-left"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-foreground uppercase tracking-wide group-hover:text-primary transition-smooth">{notice.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">{notice.excerpt}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Embassy Contact Banner */}
          <div className="mt-8 p-7 rounded-2xl gradient-primary text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="font-bold text-xl">Nigerian Embassy — Hanoi, Vietnam</h3>
                <p className="text-primary-foreground/75 text-sm mt-1">For official matters and emergency consular services</p>
              </div>
              <div className="flex flex-wrap gap-5 text-sm">
                <div className="flex items-center gap-2 glass-hero rounded-full px-4 py-2">
                  <Phone className="h-4 w-4 text-gold" />
                  <span>+84-24-37263610 / 37263611</span>
                </div>
                <div className="flex items-center gap-2 glass-hero rounded-full px-4 py-2">
                  <MessageCircle className="h-4 w-4 text-gold" />
                  <span>WhatsApp: +84775568278</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Biometric Passport Notice */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto">
          <Card className="border-gold/40 shadow-gold overflow-hidden card-lift">
            <div className="flex flex-col md:flex-row">
              <div className="gradient-gold p-8 md:w-52 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                <Shield className="h-16 w-16 text-gold-foreground relative" />
              </div>
              <CardContent className="p-7 flex-1">
                <Badge className="bg-gold text-gold-foreground border-0 mb-3 font-semibold">Important Notice</Badge>
                <h3 className="text-xl font-bold text-foreground mb-2">Contactless Biometric Passport Enrollment</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                  Nigerians in Vietnam who wish to enroll in the contactless biometric passport program must
                  <strong className="text-foreground"> select Malaysia as their enrollment location</strong> and make payment to Nigerian Immigration. Follow the embassy's official instructions carefully.
                </p>
                <Link to="/passport-info">
                  <Button className="gradient-primary text-primary-foreground gap-2 shadow-green">
                    View Full Instructions <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>

      {/* Upcoming Activities */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="section-accent" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Community Activities</h2>
              <p className="text-muted-foreground mt-2">Upcoming events and community programs</p>
            </div>
            <Link to="/activities">
              <Button variant="outline" className="text-primary border-primary hover:bg-primary/10 gap-1.5">
                View All <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {recentActivities.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {recentActivities.map((activity) => (
                <Card key={activity.id} className="shadow-card card-lift hover:shadow-green transition-smooth overflow-hidden border-border">
                  {activity.cover_image_url ? (
                    <img src={activity.cover_image_url} alt={activity.title} className="w-full h-44 object-cover" />
                  ) : (
                    <div className="w-full h-44 gradient-primary flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-primary-foreground/40" />
                    </div>
                  )}
                  <CardContent className="p-5">
                    <Badge className="gradient-primary text-primary-foreground border-0 text-xs mb-3">Event</Badge>
                    <h3 className="font-semibold text-foreground leading-snug">{activity.title}</h3>
                    {activity.event_date && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(activity.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    {activity.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{activity.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No upcoming activities. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Gallery Preview */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="section-accent" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Gallery</h2>
              <p className="text-muted-foreground mt-2">Moments from our community events</p>
            </div>
            <Link to="/gallery">
              <Button variant="outline" className="text-primary border-primary hover:bg-primary/10 gap-1.5">
                Full Gallery <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="relative overflow-hidden rounded-2xl shadow-card card-lift group col-span-2 md:col-span-1">
              <img
                src="https://cdn.enter.pro/resources/uid_100149613/8c7a13b1-1326-42.JPG"
                alt="NIDO Vietnam Inauguration"
                className="w-full h-52 object-cover group-hover:scale-105 transition-smooth"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-smooth flex items-end p-4">
                <p className="text-white text-sm font-semibold">Inauguration Ceremony 2016</p>
              </div>
            </div>
            {galleryPhotos.slice(0, 5).map((photo) => (
              <div key={photo.id} className="relative overflow-hidden rounded-2xl shadow-card card-lift group">
                <img src={photo.image_url} alt={photo.caption} className="w-full h-52 object-cover group-hover:scale-105 transition-smooth" />
                {photo.caption && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-smooth flex items-end p-4">
                    <p className="text-white text-sm">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
            {galleryPhotos.length === 0 && Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-muted h-52 flex items-center justify-center border border-dashed border-border">
                <Image className="h-8 w-8 text-muted-foreground/30" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 hero-pattern pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gold/10 blur-3xl" />
        </div>
        <div className="container mx-auto text-center relative">
          <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-6 shadow-gold animate-pulse-glow">
            <Star className="h-8 w-8 text-gold-foreground" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Become a NIDO Vietnam Member
          </h2>
          <p className="text-primary-foreground/75 max-w-2xl mx-auto mb-10 text-lg leading-relaxed">
            Join hundreds of Nigerians across Vietnam. Access community resources, embassy updates, business networking, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="gradient-gold text-gold-foreground font-bold shadow-gold gap-2 h-12 px-8" onClick={() => navigate('/register')}>
              Register Now — It's Free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-12 px-8 glass-hero" onClick={() => navigate('/contact')}>
              <Phone className="h-4 w-4 mr-2" /> Contact Us
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-primary-foreground/60 text-sm">
            <div className="flex items-center gap-2"><Globe className="h-4 w-4" /><span>Hanoi & Ho Chi Minh City</span></div>
            <div className="flex items-center gap-2"><Shield className="h-4 w-4" /><span>Officially Registered Organization</span></div>
            <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>Growing Community</span></div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-14 px-4 bg-card border-t border-border">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: BookOpen, label: 'NIDO Constitution', href: '/constitution', desc: 'Read our founding document' },
              { icon: Building2, label: 'Business Directory', href: '/directory', desc: 'Nigerian businesses in VN' },
              { icon: Image, label: 'Photo Gallery', href: '/gallery', desc: 'Community event photos' },
              { icon: Phone, label: 'Contact NIDO', href: '/contact', desc: 'Get in touch with us' },
            ].map(({ icon: Icon, label, href, desc }) => (
              <Link key={href} to={href} className="group p-5 rounded-2xl border border-border hover:border-primary hover:shadow-green transition-smooth text-center bg-background card-lift">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-3 shadow-green group-hover:scale-110 transition-smooth">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{label}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      {/* Embassy Article Modal */}
      {activeArticle && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto"
          onClick={() => setActiveArticle(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border w-full max-w-3xl shadow-2xl mb-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-card rounded-t-2xl border-b border-border px-6 py-4 flex items-start justify-between gap-4 z-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{activeArticle.category}</span>
                  {activeArticle.date && <span className="text-[11px] text-muted-foreground">{activeArticle.date}</span>}
                </div>
                <h2 className="font-bold text-foreground text-lg leading-snug">{activeArticle.title}</h2>
              </div>
              <button
                onClick={() => setActiveArticle(null)}
                className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Article content */}
            <div className="px-6 py-5">
              {activeArticle.content ? (
                <div
                  className="prose prose-sm max-w-none text-foreground/90 leading-relaxed
                    [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-4 [&_h1]:mb-2
                    [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-4 [&_h2]:mb-2
                    [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-3 [&_h3]:mb-1.5
                    [&_p]:mb-3 [&_p]:text-sm [&_p]:text-foreground/85 [&_p]:leading-relaxed
                    [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1
                    [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
                    [&_li]:text-sm [&_li]:text-foreground/85
                    [&_strong]:font-semibold [&_strong]:text-foreground
                    [&_img]:rounded-xl [&_img]:my-4 [&_img]:max-w-full [&_img]:h-auto
                    [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: activeArticle.content }}
                />
              ) : (
                <p className="text-sm text-foreground/85 leading-relaxed">{activeArticle.excerpt}</p>
              )}
            </div>

            {/* Footer with source link */}
            <div className="px-6 py-4 border-t border-border rounded-b-2xl bg-muted/20 flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">Source: Nigerian Embassy Vietnam</p>
              <a
                href={activeArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                View on embassy website <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
