import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Award, Star, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Recognition {
  id: string;
  award_title: string;
  category: string;
  description: string;
  awarded_date: string;
  profiles?: { first_name: string; last_name: string; profile_picture_url?: string; vietnam_city?: string };
}

const CATEGORIES = [
  { value: 'all',            label: 'All Awards' },
  { value: 'leadership',     label: 'Leadership' },
  { value: 'humanitarian',   label: 'Humanitarian' },
  { value: 'business',       label: 'Business Excellence' },
  { value: 'youth',          label: 'Youth Excellence' },
  { value: 'community_service', label: 'Community Service' },
  { value: 'cultural',       label: 'Cultural Ambassador' },
  { value: 'academic',       label: 'Academic Excellence' },
];

const CAT_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  leadership:        { color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-500/10',    border: 'border-blue-300/40' },
  humanitarian:      { color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-500/10',    border: 'border-rose-300/40' },
  business:          { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-500/10',   border: 'border-amber-300/40' },
  youth:             { color: 'text-green-700 dark:text-green-300', bg: 'bg-green-500/10',   border: 'border-green-300/40' },
  community_service: { color: 'text-primary',                        bg: 'bg-primary/10',     border: 'border-primary/30' },
  cultural:          { color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-300/40' },
  academic:          { color: 'text-cyan-700 dark:text-cyan-300',   bg: 'bg-cyan-500/10',    border: 'border-cyan-300/40' },
};

const catStyle = (val: string) => CAT_STYLES[val] || CAT_STYLES.community_service;
const catLabel = (val: string) => CATEGORIES.find(c => c.value === val)?.label || val;

export function RecognitionsPage() {
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    supabase
      .from('member_recognitions')
      .select('*, profiles!member_recognitions_profile_id_fkey(first_name, last_name, profile_picture_url, vietnam_city)')
      .eq('is_published', true)
      .order('awarded_date', { ascending: false })
      .then(({ data }) => {
        setRecognitions((data || []) as Recognition[]);
        setLoading(false);
      });
  }, []);

  const filtered = activeFilter === 'all'
    ? recognitions
    : recognitions.filter(r => r.category === activeFilter);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero pt-28 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 hero-pattern pointer-events-none opacity-30" />
        <div className="container mx-auto max-w-3xl text-center relative">
          <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-5 shadow-gold">
            <Award className="h-8 w-8 text-gold-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">Hall of Honor</h1>
          <p className="text-primary-foreground/75 text-lg max-w-xl mx-auto">
            Celebrating outstanding Nigerians in Vietnam who exemplify excellence, service, and dedication to our community.
          </p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <Users className="h-4 w-4 text-primary-foreground/60" />
            <span className="text-primary-foreground/60 text-sm">{recognitions.length} honorees recognized</span>
          </div>
        </div>
      </section>

      {/* Filter Pills */}
      <div className="sticky top-[60px] z-30 bg-background/95 backdrop-blur-md border-b border-border py-3 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setActiveFilter(c.value)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-smooth ${
                  activeFilter === c.value
                    ? 'gradient-primary text-primary-foreground border-transparent'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-card'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <section className="flex-1 py-12 px-4 bg-muted/20">
        <div className="container mx-auto max-w-5xl">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-card border border-border h-64 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <Award className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No honorees in this category yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(r => {
                const cs = catStyle(r.category);
                return (
                  <div
                    key={r.id}
                    className="group rounded-2xl bg-card border border-border shadow-card hover:shadow-elegant transition-smooth overflow-hidden flex flex-col"
                  >
                    {/* Top accent bar */}
                    <div className={`h-1 w-full ${cs.bg} border-b ${cs.border}`} style={{ background: `linear-gradient(90deg, hsl(var(--primary)), transparent)` }} />

                    <div className="p-6 flex flex-col flex-1">
                      {/* Avatar + name */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border-2 ${cs.border} shrink-0`} style={{ background: `var(--gradient-primary, hsl(var(--primary) / 0.1))` }}>
                          {r.profiles?.profile_picture_url ? (
                            <img src={r.profiles.profile_picture_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl font-bold text-primary">
                              {r.profiles?.first_name?.[0]}{r.profiles?.last_name?.[0]}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground leading-tight">{r.profiles?.first_name} {r.profiles?.last_name}</p>
                          {r.profiles?.vietnam_city && (
                            <p className="text-xs text-muted-foreground mt-0.5">{r.profiles.vietnam_city}</p>
                          )}
                        </div>
                      </div>

                      {/* Award */}
                      <div className="mb-3">
                        <div className="flex items-start gap-1.5">
                          <Star className={`h-4 w-4 mt-0.5 shrink-0 ${cs.color}`} />
                          <p className={`font-semibold text-sm leading-snug ${cs.color}`}>{r.award_title}</p>
                        </div>
                        <Badge className={`mt-2 text-[10px] border ${cs.bg} ${cs.color} ${cs.border}`}>
                          {catLabel(r.category)}
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground flex-1 line-clamp-3 leading-relaxed">{r.description}</p>

                      {/* Footer */}
                      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Awarded</span>
                        <span className="text-xs font-medium text-foreground">{format(parseISO(r.awarded_date), 'MMMM yyyy')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
