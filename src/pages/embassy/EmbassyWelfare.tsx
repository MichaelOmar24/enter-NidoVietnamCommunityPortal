import { useState, useEffect } from 'react';
import { EmbassyLayout } from '@/components/layout/EmbassyLayout';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Home, AlertTriangle, Briefcase, Globe, Clock, CheckCircle, XCircle, RefreshCw, Calendar, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const SUPPORT_TYPES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  medical: { label: 'Medical', icon: Heart, color: '#ef4444' },
  housing: { label: 'Housing', icon: Home, color: '#f59e0b' },
  accident: { label: 'Accident', icon: AlertTriangle, color: '#f97316' },
  employer_resolution: { label: 'Employer Resolution', icon: Briefcase, color: '#8b5cf6' },
  immigration: { label: 'Immigration', icon: Globe, color: '#3b82f6' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: '#f59e0b' },
  under_review: { label: 'Under Review', icon: RefreshCw, color: '#3b82f6' },
  approved: { label: 'Approved', icon: CheckCircle, color: '#00b359' },
  rejected: { label: 'Rejected', icon: XCircle, color: '#ef4444' },
};

const CAUSE_LABELS: Record<string, string> = {
  illness: 'Illness', accident: 'Accident', natural_causes: 'Natural Causes', unknown: 'Unknown', other: 'Other',
};

interface WelfareReq { id: string; support_type: string; status: string; urgency: string; created_at: string; profiles?: { first_name: string; last_name: string; vietnam_city?: string }; }
interface DeceasedRecord { id: string; full_name: string; date_of_death: string; place_of_death?: string; cause_of_death: string; description: string; is_nido_member: boolean; }

export function EmbassyWelfare() {
  const [welfare, setWelfare] = useState<WelfareReq[]>([]);
  const [deceased, setDeceased] = useState<DeceasedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'welfare' | 'deceased'>('welfare');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [{ data: w }, { data: d }] = await Promise.all([
      supabase.from('welfare_requests').select('*, profiles!welfare_requests_user_id_fkey(first_name, last_name, vietnam_city)').order('created_at', { ascending: false }),
      supabase.from('deceased_members').select('*').order('date_of_death', { ascending: false }),
    ]);
    setWelfare((w || []) as WelfareReq[]);
    setDeceased((d || []) as DeceasedRecord[]);
    setLoading(false);
  };

  // Welfare stats
  const typeCounts = Object.keys(SUPPORT_TYPES).map(k => ({
    name: SUPPORT_TYPES[k].label,
    value: welfare.filter(w => w.support_type === k).length,
    color: SUPPORT_TYPES[k].color,
  }));

  const statusCounts = Object.keys(STATUS_CONFIG).map(k => ({
    name: STATUS_CONFIG[k].label,
    value: welfare.filter(w => w.status === k).length,
    fill: STATUS_CONFIG[k].color,
  }));

  const approvedByType = Object.entries(SUPPORT_TYPES).map(([k, v]) => ({
    name: v.label,
    approved: welfare.filter(w => w.support_type === k && w.status === 'approved').length,
    total: welfare.filter(w => w.support_type === k).length,
    fill: v.color,
  }));

  return (
    <EmbassyLayout title="Welfare & Memorial" subtitle="Community welfare statistics and deceased member records">
      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[{ key: 'welfare', label: 'Welfare Support' }, { key: 'deceased', label: 'Memorial Records' }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as 'welfare' | 'deceased')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${activeTab === t.key ? 'bg-gold/20 border-gold/40 text-gold' : 'border-embassy-border text-embassy-muted hover:text-embassy-foreground hover:bg-embassy-card'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'welfare' && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => {
              const Icon = v.icon;
              const count = welfare.filter(w => w.status === k).length;
              return (
                <div key={k} className="embassy-kpi-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-embassy-muted">{v.label}</span>
                    <Icon className="h-4 w-4" style={{ color: v.color }} />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: v.color }}>{count}</p>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-4 mb-5">
            {/* Type distribution */}
            <div className="embassy-chart-card p-4">
              <p className="text-sm font-semibold text-embassy-foreground mb-4">Requests by Type</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={typeCounts} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" strokeWidth={0}>
                      {typeCounts.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.85} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {typeCounts.map(t => (
                    <div key={t.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                        <span className="text-xs text-embassy-muted">{t.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-embassy-foreground">{t.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Approved by type */}
            <div className="embassy-chart-card p-4">
              <p className="text-sm font-semibold text-embassy-foreground mb-4">Approved Requests by Type</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={approvedByType} barSize={20}>
                  <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e6edf3' }} />
                  <Bar dataKey="approved" name="Approved" radius={[4, 4, 0, 0]}>
                    {approvedByType.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status breakdown bar */}
          <div className="embassy-chart-card p-4 mb-5">
            <p className="text-sm font-semibold text-embassy-foreground mb-4">Status Overview</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={statusCounts} layout="vertical" barSize={16}>
                <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e6edf3' }} />
                <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                  {statusCounts.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent requests */}
          <div className="embassy-chart-card overflow-hidden">
            <div className="p-4 border-b border-embassy-border">
              <p className="text-sm font-semibold text-embassy-foreground">Recent Requests</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-embassy-border">
                    {['Member', 'Type', 'Urgency', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs text-embassy-muted font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {welfare.slice(0, 15).map(w => {
                    const typeInfo = SUPPORT_TYPES[w.support_type];
                    const statusInfo = STATUS_CONFIG[w.status];
                    const TypeIcon = typeInfo?.icon || Heart;
                    const StatusIcon = statusInfo?.icon || Clock;
                    return (
                      <tr key={w.id} className="border-b border-embassy-border embassy-table-row">
                        <td className="px-4 py-2.5 text-xs text-embassy-foreground">{w.profiles?.first_name} {w.profiles?.last_name}</td>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-1.5 text-xs text-embassy-muted">
                            <TypeIcon className="h-3 w-3" style={{ color: typeInfo?.color }} />
                            {typeInfo?.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-embassy-muted capitalize">{w.urgency}</td>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-1 text-xs" style={{ color: statusInfo?.color }}>
                            <StatusIcon className="h-3 w-3" /> {statusInfo?.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-embassy-muted">{format(parseISO(w.created_at), 'dd MMM yyyy')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'deceased' && (
        <>
          {/* Memorial stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="embassy-kpi-card p-4">
              <p className="text-2xl font-bold text-embassy-foreground">{deceased.length}</p>
              <p className="text-xs text-embassy-muted mt-1">Total Records</p>
            </div>
            <div className="embassy-kpi-card p-4">
              <p className="text-2xl font-bold text-embassy-foreground">{deceased.filter(d => d.is_nido_member).length}</p>
              <p className="text-xs text-embassy-muted mt-1">NIDO Members</p>
            </div>
            <div className="embassy-kpi-card p-4">
              <p className="text-2xl font-bold text-embassy-foreground">
                {deceased.filter(d => d.date_of_death >= new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]).length}
              </p>
              <p className="text-xs text-embassy-muted mt-1">This Year</p>
            </div>
          </div>

          {/* Cause breakdown */}
          {deceased.length > 0 && (
            <div className="embassy-chart-card p-4 mb-5">
              <p className="text-sm font-semibold text-embassy-foreground mb-4">Deaths by Cause</p>
              <div className="grid grid-cols-5 gap-3">
                {Object.entries(CAUSE_LABELS).map(([k, label]) => {
                  const count = deceased.filter(d => d.cause_of_death === k).length;
                  return (
                    <div key={k} className="text-center p-3 rounded-lg bg-embassy-card border border-embassy-border">
                      <p className="text-xl font-bold text-embassy-foreground">{count}</p>
                      <p className="text-[10px] text-embassy-muted mt-1">{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Memorial cards */}
          {loading ? (
            <div className="grid md:grid-cols-2 gap-3">
              {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-embassy-card animate-pulse" />)}
            </div>
          ) : deceased.length === 0 ? (
            <div className="embassy-chart-card p-10 text-center">
              <p className="text-embassy-muted text-sm">No memorial records</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {deceased.map(d => (
                <div key={d.id} className="embassy-kpi-card p-5 hover:border-gold/30 transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                      <Heart className="h-4 w-4 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-embassy-foreground">{d.full_name}</p>
                      {d.is_nido_member && (
                        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 mt-0.5">NIDO Member</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-embassy-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {format(parseISO(d.date_of_death), 'dd MMMM yyyy')}
                    </span>
                    {d.place_of_death && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {d.place_of_death}
                      </span>
                    )}
                    <span className="capitalize">{CAUSE_LABELS[d.cause_of_death]}</span>
                  </div>
                  <p className="text-xs text-embassy-muted leading-relaxed line-clamp-3">{d.description}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </EmbassyLayout>
  );
}
