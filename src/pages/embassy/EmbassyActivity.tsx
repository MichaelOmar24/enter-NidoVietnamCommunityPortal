import { useState, useEffect } from 'react';
import { EmbassyLayout } from '@/components/layout/EmbassyLayout';
import { supabase } from '@/integrations/supabase/client';
import { Users, Briefcase, Building2, FileText, Image, Activity, Shield, UserCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface FeedItem {
  id: string;
  type: 'member_joined' | 'passport_submitted' | 'company_added' | 'activity_posted' | 'document_uploaded' | 'member_activated' | 'admin_action';
  title: string;
  description: string;
  meta: string;
  timestamp: string;
  color: string;
  Icon: React.ElementType;
}

export function EmbassyActivity() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [
      { data: members },
      { data: passports },
      { data: companies },
      { data: activities },
      { data: documents },
    ] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, email, vietnam_city, membership_status, created_at').order('created_at', { ascending: false }).limit(15),
      supabase.from('passports').select('id, passport_number, is_biometric, created_at, profiles(first_name, last_name)').order('created_at', { ascending: false }).limit(10),
      supabase.from('companies').select('id, name, business_type, vietnam_city, is_approved, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('activities').select('id, title, event_date, event_type, location, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('documents').select('id, title, category, created_at').order('created_at', { ascending: false }).limit(10),
    ]);

    const items: FeedItem[] = [];

    (members || []).forEach((m: Record<string, unknown>) => {
      items.push({
        id: `member-${m.id}`,
        type: 'member_joined',
        title: 'New Member Registration',
        description: `${m.first_name} ${m.last_name} registered as a NIDO member`,
        meta: `${m.vietnam_city || 'Vietnam'} · ${m.membership_status}`,
        timestamp: m.created_at as string,
        color: '#00b359',
        Icon: Users,
      });
    });

    (passports || []).forEach((p: Record<string, unknown>) => {
      const prof = p.profiles as Record<string, unknown> || {};
      items.push({
        id: `passport-${p.id}`,
        type: 'passport_submitted',
        title: 'Passport Record Submitted',
        description: `${prof.first_name} ${prof.last_name} submitted passport ${p.passport_number || 'details'}`,
        meta: `${p.is_biometric ? 'Biometric' : 'Standard'} · Pending verification`,
        timestamp: p.created_at as string,
        color: '#3b82f6',
        Icon: Briefcase,
      });
    });

    (companies || []).forEach((c: Record<string, unknown>) => {
      items.push({
        id: `company-${c.id}`,
        type: 'company_added',
        title: 'Business Registration',
        description: `${c.name} added to NIDO business directory`,
        meta: `${c.business_type || 'Business'} · ${c.vietnam_city || 'Vietnam'} · ${c.is_approved ? 'Approved' : 'Pending'}`,
        timestamp: c.created_at as string,
        color: '#06b6d4',
        Icon: Building2,
      });
    });

    (activities || []).forEach((a: Record<string, unknown>) => {
      items.push({
        id: `activity-${a.id}`,
        type: 'activity_posted',
        title: 'New Activity Posted',
        description: `"${a.title}" was scheduled`,
        meta: `${a.event_type || 'Event'} · ${a.location || 'TBD'}`,
        timestamp: a.created_at as string,
        color: '#FFD700',
        Icon: Activity,
      });
    });

    (documents || []).forEach((d: Record<string, unknown>) => {
      items.push({
        id: `doc-${d.id}`,
        type: 'document_uploaded',
        title: 'Document Published',
        description: `"${d.title}" added to document library`,
        meta: `Category: ${d.category || 'General'}`,
        timestamp: d.created_at as string,
        color: '#8b5cf6',
        Icon: FileText,
      });
    });

    // Sort by timestamp desc
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setFeed(items);
    setLoading(false);
  };

  const TYPE_LABELS: Record<string, string> = {
    all: 'All Events',
    member_joined: 'Members',
    passport_submitted: 'Passports',
    company_added: 'Businesses',
    activity_posted: 'Activities',
    document_uploaded: 'Documents',
  };

  const filtered = filter === 'all' ? feed : feed.filter(f => f.type === filter);

  // Stats for the feed
  const stats = Object.entries(TYPE_LABELS).filter(([k]) => k !== 'all').map(([type, label]) => ({
    label, count: feed.filter(f => f.type === type).length,
    color: { member_joined: '#00b359', passport_submitted: '#3b82f6', company_added: '#06b6d4', activity_posted: '#FFD700', document_uploaded: '#8b5cf6' }[type] || '#fff'
  }));

  return (
    <EmbassyLayout title="Activity Feed" subtitle="Real-time log of all platform activities and events">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {stats.map(({ label, count, color }) => (
          <div key={label} className="embassy-kpi-card p-3 text-center">
            <p className="text-xl font-bold" style={{ color }}>{count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {/* Filter sidebar */}
        <div className="embassy-chart-card p-4 h-fit">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Filter by Type</p>
          <div className="space-y-1">
            {Object.entries(TYPE_LABELS).map(([type, label]) => {
              const count = type === 'all' ? feed.length : feed.filter(f => f.type === type).length;
              return (
                <button key={type} onClick={() => setFilter(type)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${filter === type ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-white/5'}`}>
                  <span>{label}</span>
                  <span className="text-xs">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="embassy-chart-card p-4 animate-pulse">
                  <div className="h-3 bg-white/5 rounded w-1/3 mb-2" />
                  <div className="h-2.5 bg-white/5 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="embassy-chart-card p-10 text-center">
              <p className="text-gray-600 text-sm">No events found</p>
            </div>
          ) : (
            <div className="relative pl-6">
              {/* Timeline line */}
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-white/5" />

              <div className="space-y-3">
                {filtered.map((item) => {
                  const Icon = item.Icon;
                  return (
                    <div key={item.id} className="relative">
                      {/* Dot */}
                      <div className="absolute -left-5 top-4 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{ backgroundColor: item.color + '20', borderColor: item.color + '60' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                      </div>

                      <div className="embassy-kpi-card p-4 hover:border-white/15 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: item.color + '15', border: `1px solid ${item.color}30` }}>
                            <Icon className="h-4 w-4" style={{ color: item.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-white">{item.title}</p>
                              <span className="text-xs text-gray-600 shrink-0">
                                {format(parseISO(item.timestamp), 'dd MMM yyyy · HH:mm')}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                            <p className="text-[11px] text-gray-600 mt-1">{item.meta}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </EmbassyLayout>
  );
}
