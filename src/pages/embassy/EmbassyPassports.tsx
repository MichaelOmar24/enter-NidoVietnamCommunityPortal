import { useState, useEffect } from 'react';
import { EmbassyLayout } from '@/components/layout/EmbassyLayout';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { differenceInDays, parseISO, format } from 'date-fns';
import { AlertTriangle, ShieldCheck, ShieldOff, Fingerprint } from 'lucide-react';

interface Passport {
  id: string;
  user_id: string;
  passport_number?: string;
  expiry_date?: string;
  issue_date?: string;
  place_of_issue?: string;
  is_biometric: boolean;
  verified: boolean;
  admin_notes?: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  vietnam_city?: string;
}

export function EmbassyPassports() {
  const [passports, setPassports] = useState<Passport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'expiring' | 'expired' | 'verified' | 'biometric'>('all');
  const [stats, setStats] = useState({ total: 0, verified: 0, biometric: 0, expiring: 0, expired: 0 });
  const [placeData, setPlaceData] = useState<{ place: string; count: number }[]>([]);
  const [expiryBuckets, setExpiryBuckets] = useState<{ bucket: string; count: number }[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from('passports')
      .select('*, profiles(first_name, last_name, email, vietnam_city)')
      .order('expiry_date', { ascending: true });

    const raw = (data || []).map((p: Record<string, unknown>) => ({
      ...p,
      first_name: (p.profiles as Record<string, unknown>)?.first_name,
      last_name: (p.profiles as Record<string, unknown>)?.last_name,
      email: (p.profiles as Record<string, unknown>)?.email,
      vietnam_city: (p.profiles as Record<string, unknown>)?.vietnam_city,
    })) as Passport[];

    const now = new Date();
    let expiring = 0, expired = 0;
    const buckets: Record<string, number> = { 'Expired': 0, '0-3 mo': 0, '3-6 mo': 0, '6-12 mo': 0, '1-2 yr': 0, '2+ yr': 0 };

    raw.forEach(p => {
      if (p.expiry_date) {
        const days = differenceInDays(parseISO(p.expiry_date), now);
        if (days < 0) { expired++; buckets['Expired']++; }
        else if (days <= 90) { expiring++; buckets['0-3 mo']++; }
        else if (days <= 180) { expiring++; buckets['3-6 mo']++; }
        else if (days <= 365) { expiring++; buckets['6-12 mo']++; }
        else if (days <= 730) { buckets['1-2 yr']++; }
        else { buckets['2+ yr']++; }
      }
    });

    setStats({ total: raw.length, verified: raw.filter(p => p.verified).length, biometric: raw.filter(p => p.is_biometric).length, expiring, expired });

    const placeMap: Record<string, number> = {};
    raw.forEach(p => { if (p.place_of_issue) placeMap[p.place_of_issue] = (placeMap[p.place_of_issue] || 0) + 1; });
    setPlaceData(Object.entries(placeMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ place: k, count: v })));

    setExpiryBuckets(Object.entries(buckets).map(([k, v]) => ({ bucket: k, count: v })));
    setPassports(raw);
    setLoading(false);
  };

  const getFiltered = () => {
    const now = new Date();
    switch (filter) {
      case 'expiring': return passports.filter(p => { if (!p.expiry_date) return false; const d = differenceInDays(parseISO(p.expiry_date), now); return d >= 0 && d <= 365; });
      case 'expired': return passports.filter(p => { if (!p.expiry_date) return false; return differenceInDays(parseISO(p.expiry_date), now) < 0; });
      case 'verified': return passports.filter(p => p.verified);
      case 'biometric': return passports.filter(p => p.is_biometric);
      default: return passports;
    }
  };

  const filtered = getFiltered();
  const COLORS = ['#DA251D', '#f97316', '#FFD700', '#3b82f6', '#00b359', '#8b5cf6'];

  return (
    <EmbassyLayout title="Passport Analytics" subtitle="Passport health, expiry tracking, and verification status">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total Passports', value: stats.total, color: '#3b82f6', icon: '📋' },
          { label: 'Verified', value: stats.verified, color: '#00b359', icon: '✅' },
          { label: 'Biometric', value: stats.biometric, color: '#8b5cf6', icon: '🔐' },
          { label: 'Expiring ≤1yr', value: stats.expiring, color: '#f97316', icon: '⚠️' },
          { label: 'Expired', value: stats.expired, color: '#DA251D', icon: '🚫' },
        ].map(({ label, value, color }) => (
          <div key={label} className="embassy-kpi-card p-3 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        <div className="embassy-chart-card p-4">
          <p className="text-sm font-semibold text-white mb-1">Expiry Timeline Distribution</p>
          <p className="text-xs text-gray-500 mb-4">How many passports expire in each time bucket</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={expiryBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="bucket" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e6edf3' }} />
              <Bar dataKey="count" name="Passports" radius={[4, 4, 0, 0]}>
                {expiryBuckets.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="embassy-chart-card p-4">
          <p className="text-sm font-semibold text-white mb-1">Verification & Biometric Status</p>
          <p className="text-xs text-gray-500 mb-4">Passport quality breakdown</p>
          <div className="space-y-4 mt-6">
            {[
              { label: 'Verified', value: stats.verified, total: stats.total, color: '#00b359', Icon: ShieldCheck },
              { label: 'Biometric', value: stats.biometric, total: stats.total, color: '#8b5cf6', Icon: Fingerprint },
              { label: 'Unverified', value: stats.total - stats.verified, total: stats.total, color: '#DA251D', Icon: ShieldOff },
              { label: 'Expiring Soon', value: stats.expiring, total: stats.total, color: '#f97316', Icon: AlertTriangle },
            ].map(({ label, value, total, color, Icon }) => {
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-white">{value} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="embassy-chart-card p-4 lg:col-span-2">
          <p className="text-sm font-semibold text-white mb-1">Top Places of Issue</p>
          <p className="text-xs text-gray-500 mb-4">Where passports were originally issued</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={placeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="place" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e6edf3' }} />
              <Bar dataKey="count" fill="#00b359" radius={[4, 4, 0, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Passport Table */}
      <div className="embassy-chart-card overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-3 flex-wrap">
          <p className="text-sm font-semibold text-white">Passport Records</p>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'expiring', 'expired', 'verified', 'biometric'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${filter === f ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-white/10 text-gray-500 hover:text-gray-300'}`}>
                {f === 'all' ? `All (${passports.length})` : f === 'expiring' ? `Expiring (${stats.expiring})` : f === 'expired' ? `Expired (${stats.expired})` : f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Member', 'Passport #', 'Place of Issue', 'Issue Date', 'Expiry Date', 'Days Left', 'Biometric', 'Verified'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-3 bg-white/5 rounded animate-pulse" /></td></tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600">No records</td></tr>
              ) : filtered.map(p => {
                const days = p.expiry_date ? differenceInDays(parseISO(p.expiry_date), new Date()) : null;
                const daysColor = days === null ? '#8b949e' : days < 0 ? '#DA251D' : days <= 90 ? '#f97316' : days <= 365 ? '#FFD700' : '#00b359';
                return (
                  <tr key={p.id} className="border-b border-white/5 embassy-table-row">
                    <td className="px-4 py-3">
                      <p className="text-white text-xs font-medium">{p.first_name} {p.last_name}</p>
                      <p className="text-gray-600 text-[11px]">{p.vietnam_city || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{p.passport_number || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{p.place_of_issue || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.issue_date ? format(parseISO(p.issue_date), 'dd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{p.expiry_date ? format(parseISO(p.expiry_date), 'dd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: daysColor }}>
                      {days === null ? '—' : days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.is_biometric ? 'bg-purple-500/15 text-purple-400' : 'bg-gray-500/15 text-gray-500'}`}>
                        {p.is_biometric ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.verified ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-500'}`}>
                        {p.verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-white/5 text-xs text-gray-600">
          {filtered.length} passport records
        </div>
      </div>
    </EmbassyLayout>
  );
}
