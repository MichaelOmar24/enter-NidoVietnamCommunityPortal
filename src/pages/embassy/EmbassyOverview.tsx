import { useState, useEffect } from 'react';
import { EmbassyLayout } from '@/components/layout/EmbassyLayout';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  Users, ShieldCheck, Clock, XCircle, Briefcase,
  Building2, Image, FileText, Activity, TrendingUp, TrendingDown, Minus, Shield, Crown, Banknote, Lock
} from 'lucide-react';
import { differenceInDays, parseISO, format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { OCCUPATION_LABELS } from '@/lib/types';

const CHART_COLORS = ['#00b359', '#FFD700', '#DA251D', '#3b82f6', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'];

interface KpiData {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  expiredMembers: number;
  totalPassports: number;
  verifiedPassports: number;
  biometricPassports: number;
  expiringPassports: number;
  expiredPassports: number;
  totalCompanies: number;
  approvedCompanies: number;
  totalActivities: number;
  totalDocuments: number;
  premiumMembers: number;
  goldMembers: number;
  pendingPayments: number;
  totalRevenue: number;
}

export function EmbassyOverview() {
  const [kpi, setKpi] = useState<KpiData>({
    totalMembers: 0, activeMembers: 0, pendingMembers: 0, expiredMembers: 0,
    totalPassports: 0, verifiedPassports: 0, biometricPassports: 0,
    expiringPassports: 0, expiredPassports: 0,
    totalCompanies: 0, approvedCompanies: 0, totalActivities: 0, totalDocuments: 0,
    premiumMembers: 0, goldMembers: 0, pendingPayments: 0, totalRevenue: 0
  });
  const [growthData, setGrowthData] = useState<{ month: string; members: number; cumulative: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [tierData, setTierData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [cityData, setCityData] = useState<{ city: string; count: number }[]>([]);
  const [occupationData, setOccupationData] = useState<{ name: string; value: number }[]>([]);
  const [genderData, setGenderData] = useState<{ name: string; value: number }[]>([]);
  const [companyIntel, setCompanyIntel] = useState<{ company: { id: string; company_name: string; industry: string | null; business_type: string | null; is_approved: boolean }; priv: { annual_revenue_vnd: number | null; monthly_revenue_vnd: number | null; tax_code: string | null; registration_number: string | null; is_verified: boolean; registration_doc_url: string | null; tax_code_doc_url: string | null } | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [
      { count: total }, { count: active }, { count: pending }, { count: expired },
      { count: totalPass }, { count: verifiedPass }, { count: biometricPass },
      { data: passports }, { count: totalComp }, { count: approvedComp },
      { count: totalAct }, { count: totalDoc },
      { data: allProfiles },
      { data: allMemberships },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('membership_status', 'active'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('membership_status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('membership_status', 'expired'),
      supabase.from('passports').select('*', { count: 'exact', head: true }),
      supabase.from('passports').select('*', { count: 'exact', head: true }).eq('verified', true),
      supabase.from('passports').select('*', { count: 'exact', head: true }).eq('is_biometric', true),
      supabase.from('passports').select('expiry_date'),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_approved', true),
      supabase.from('activities').select('*', { count: 'exact', head: true }),
      supabase.from('documents').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('created_at, membership_status, vietnam_city, occupation_type, gender, membership_type'),
      supabase.from('memberships').select('plan_type, payment_status, amount, currency'),
    ]);

    // Company intelligence
    const [{ data: coData }, { data: privData }] = await Promise.all([
      supabase.from('companies').select('id, company_name, industry, business_type, is_approved').order('company_name'),
      supabase.from('company_private_info').select('*'),
    ]);
    const privMap: Record<string, typeof privData extends (infer T)[] | null ? T : never> = {};
    (privData || []).forEach((p: { company_id: string }) => { if (p.company_id) (privMap as Record<string, typeof p>)[p.company_id] = p; });
    setCompanyIntel(
      (coData || []).map((c: { id: string; company_name: string; industry: string | null; business_type: string | null; is_approved: boolean }) => ({
        company: c,
        priv: (privMap as Record<string, { annual_revenue_vnd: number | null; monthly_revenue_vnd: number | null; tax_code: string | null; registration_number: string | null; is_verified: boolean; registration_doc_url: string | null; tax_code_doc_url: string | null } | null>)[c.id] ?? null,
      }))
    );

    const now = new Date();
    let expiring = 0, expiredPass = 0;
    (passports || []).forEach((p: { expiry_date: string | null }) => {
      if (p.expiry_date) {
        const days = differenceInDays(parseISO(p.expiry_date), now);
        if (days < 0) expiredPass++;
        else if (days <= 365) expiring++;
      }
    });

    const approvedMems = (allMemberships || []).filter((m: { payment_status: string }) => ['approved','completed'].includes(m.payment_status));
    const premiumMembers = approvedMems.filter((m: { plan_type: string }) => m.plan_type === 'premium').length;
    const goldMembers = approvedMems.filter((m: { plan_type: string }) => m.plan_type === 'gold').length;
    const pendingPayments = (allMemberships || []).filter((m: { payment_status: string }) => m.payment_status === 'pending').length;
    const totalRevenue = approvedMems.filter((m: { currency: string }) => m.currency === 'VND').reduce((sum: number, m: { amount: number }) => sum + Number(m.amount || 0), 0);

    setKpi({
      totalMembers: total || 0, activeMembers: active || 0, pendingMembers: pending || 0, expiredMembers: expired || 0,
      totalPassports: totalPass || 0, verifiedPassports: verifiedPass || 0, biometricPassports: biometricPass || 0,
      expiringPassports: expiring, expiredPassports: expiredPass,
      totalCompanies: totalComp || 0, approvedCompanies: approvedComp || 0,
      totalActivities: totalAct || 0, totalDocuments: totalDoc || 0,
      premiumMembers, goldMembers, pendingPayments, totalRevenue,
    });

    // Tier distribution
    const freeCount = (allProfiles || []).filter((p: { membership_type: string | null }) => !p.membership_type || p.membership_type === 'free' || p.membership_type === 'regular').length;
    setTierData([
      { name: 'Free', value: freeCount, color: '#6b7280' },
      { name: 'Premium', value: premiumMembers, color: '#00b359' },
      { name: 'Gold', value: goldMembers, color: '#f59e0b' },
    ]);

    // Growth data — last 8 months
    const months = Array.from({ length: 8 }, (_, i) => {
      const d = subMonths(now, 7 - i);
      return { label: format(d, 'MMM yy'), start: startOfMonth(d), end: endOfMonth(d) };
    });
    let cumulative = 0;
    const growth = months.map(m => {
      const count = (allProfiles || []).filter((p: { created_at: string }) => {
        const d = new Date(p.created_at);
        return d >= m.start && d <= m.end;
      }).length;
      cumulative += count;
      return { month: m.label, members: count, cumulative };
    });
    setGrowthData(growth);

    // Status distribution
    setStatusData([
      { name: 'Active', value: active || 0, color: '#00b359' },
      { name: 'Pending', value: pending || 0, color: '#FFD700' },
      { name: 'Expired', value: expired || 0, color: '#DA251D' },
    ]);

    // City
    const cityMap: Record<string, number> = {};
    (allProfiles || []).forEach((p: { vietnam_city: string | null }) => {
      if (p.vietnam_city) cityMap[p.vietnam_city] = (cityMap[p.vietnam_city] || 0) + 1;
    });
    setCityData(Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ city: k, count: v })));

    // Occupation
    const occMap: Record<string, number> = {};
    (allProfiles || []).forEach((p: { occupation_type: string | null }) => {
      if (p.occupation_type) occMap[p.occupation_type] = (occMap[p.occupation_type] || 0) + 1;
    });
    setOccupationData(Object.entries(occMap).map(([k, v]) => ({ name: OCCUPATION_LABELS[k as keyof typeof OCCUPATION_LABELS] || k, value: v })));

    // Gender
    const genMap: Record<string, number> = {};
    (allProfiles || []).forEach((p: { gender: string | null }) => {
      if (p.gender) genMap[p.gender] = (genMap[p.gender] || 0) + 1;
    });
    setGenderData(Object.entries(genMap).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v })));

    setLoading(false);
  };

  const kpiCards = [
    { label: 'Total Members', value: kpi.totalMembers, icon: Users, color: '#00b359', trend: null },
    { label: 'Active Members', value: kpi.activeMembers, icon: ShieldCheck, color: '#00b359', trend: 'up' },
    { label: 'Pending Approval', value: kpi.pendingMembers, icon: Clock, color: '#FFD700', trend: null },
    { label: 'Expired Members', value: kpi.expiredMembers, icon: XCircle, color: '#DA251D', trend: 'down' },
    { label: 'Premium Members', value: kpi.premiumMembers, icon: Shield, color: '#00b359', trend: 'up' },
    { label: 'Gold Stakeholders', value: kpi.goldMembers, icon: Crown, color: '#f59e0b', trend: 'up' },
    { label: 'Pending Payments', value: kpi.pendingPayments, icon: Banknote, color: '#FFD700', trend: null },
    { label: 'Total Passports', value: kpi.totalPassports, icon: Briefcase, color: '#3b82f6', trend: null },
    { label: 'Verified Passports', value: kpi.verifiedPassports, icon: ShieldCheck, color: '#00b359', trend: 'up' },
    { label: 'Expiring (≤1yr)', value: kpi.expiringPassports, icon: Clock, color: '#f97316', trend: null },
    { label: 'Companies', value: kpi.totalCompanies, icon: Building2, color: '#06b6d4', trend: null },
    { label: 'Documents', value: kpi.totalDocuments, icon: FileText, color: '#8b5cf6', trend: null },
  ];

  const TrendIcon = ({ trend }: { trend: string | null }) => {
    if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
    return <Minus className="h-3.5 w-3.5 text-gray-600" />;
  };

  if (loading) return (
    <EmbassyLayout title="Intelligence Overview" subtitle="Platform-wide statistics and analytics">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="embassy-kpi-card p-4 animate-pulse">
            <div className="h-8 bg-white/5 rounded mb-2" />
            <div className="h-4 bg-white/5 rounded w-3/4" />
          </div>
        ))}
      </div>
    </EmbassyLayout>
  );

  return (
    <EmbassyLayout title="Intelligence Overview" subtitle="Platform-wide statistics and real-time analytics">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
        {kpiCards.map(({ label, value, icon: Icon, color, trend }) => (
          <div key={label} className="embassy-kpi-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20', border: `1px solid ${color}40` }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <TrendIcon trend={trend} />
            </div>
            <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue + Tier Row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {/* Revenue Card */}
        <div className="embassy-kpi-card p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Banknote className="h-4 w-4 text-green-400" />
            <p className="text-sm font-semibold text-white">Membership Revenue</p>
          </div>
          <p className="text-3xl font-bold text-white">{(kpi.totalRevenue / 1_000_000).toFixed(1)}M ₫</p>
          <p className="text-xs text-gray-500 mt-1">Total VND collected (approved payments)</p>
          <div className="flex gap-4 mt-3">
            <div><p className="text-xs text-gray-500">Premium</p><p className="text-sm font-semibold text-white">{kpi.premiumMembers}</p></div>
            <div><p className="text-xs text-gray-500">Gold</p><p className="text-sm font-semibold text-amber-400">{kpi.goldMembers}</p></div>
            <div><p className="text-xs text-gray-500">Pending</p><p className="text-sm font-semibold text-yellow-400">{kpi.pendingPayments}</p></div>
          </div>
        </div>
        {/* Tier Donut */}
        <div className="embassy-chart-card p-4 lg:col-span-2">
          <p className="text-sm font-semibold text-white mb-1">Membership Tier Distribution</p>
          <p className="text-xs text-gray-500 mb-3">Free vs Premium vs Gold breakdown</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={150}>
              <PieChart>
                <Pie data={tierData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {tierData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e6edf3' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {tierData.map(d => (
                <div key={d.name} className="flex items-center justify-between gap-6 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-400">{d.name}</span>
                  </div>
                  <span className="text-white font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {/* Growth Area Chart */}
        <div className="embassy-chart-card p-4 lg:col-span-2">          <p className="text-sm font-semibold text-white mb-1">Member Registration Growth</p>
          <p className="text-xs text-gray-500 mb-4">New registrations and cumulative total — last 8 months</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00b359" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00b359" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e6edf3' }} />
              <Area type="monotone" dataKey="cumulative" stroke="#00b359" fill="url(#cumGrad)" strokeWidth={2} name="Cumulative" />
              <Bar dataKey="members" fill="#FFD700" name="New" radius={[2, 2, 0, 0]} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Donut */}
        <div className="embassy-chart-card p-4">
          <p className="text-sm font-semibold text-white mb-1">Membership Status</p>
          <p className="text-xs text-gray-500 mb-4">Distribution by approval state</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e6edf3' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {statusData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-400">{d.name}</span>
                </div>
                <span className="text-white font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {/* City Distribution */}
        <div className="embassy-chart-card p-4 lg:col-span-2">
          <p className="text-sm font-semibold text-white mb-1">Members by City in Vietnam</p>
          <p className="text-xs text-gray-500 mb-4">Geographic distribution across Vietnam</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cityData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="city" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e6edf3' }} />
              <Bar dataKey="count" name="Members" radius={[0, 4, 4, 0]}>
                {cityData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Occupation Pie */}
        <div className="embassy-chart-card p-4">
          <p className="text-sm font-semibold text-white mb-1">Occupation Breakdown</p>
          <p className="text-xs text-gray-500 mb-3">Members by professional category</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={occupationData} cx="50%" cy="50%" outerRadius={65} dataKey="value" paddingAngle={2}>
                {occupationData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e6edf3' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-1">
            {occupationData.slice(0, 4).map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-gray-400 truncate">{d.name}</span>
                </div>
                <span className="text-white font-semibold ml-2">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Passport health + Gender */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Passport Health Bar */}
        <div className="embassy-chart-card p-4">
          <p className="text-sm font-semibold text-white mb-1">Passport Health Overview</p>
          <p className="text-xs text-gray-500 mb-4">Verification and biometric status</p>
          <div className="space-y-3">
            {[
              { label: 'Verified', value: kpi.verifiedPassports, total: kpi.totalPassports, color: '#00b359' },
              { label: 'Biometric', value: kpi.biometricPassports, total: kpi.totalPassports, color: '#8b5cf6' },
              { label: 'Expiring ≤1yr', value: kpi.expiringPassports, total: kpi.totalPassports, color: '#f97316' },
              { label: 'Expired', value: kpi.expiredPassports, total: kpi.totalPassports, color: '#DA251D' },
            ].map(({ label, value, total, color }) => {
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-white font-semibold">{value} <span className="text-gray-500">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="embassy-chart-card p-4">
          <p className="text-sm font-semibold text-white mb-1">Gender Distribution</p>
          <p className="text-xs text-gray-500 mb-4">Community demographic breakdown</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={4} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {genderData.map((_, i) => <Cell key={i} fill={['#00b359', '#3b82f6', '#8b5cf6'][i % 3]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e6edf3' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Company Trade Intelligence */}
      <div className="embassy-chart-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="h-4 w-4 text-amber-400" />
          <p className="text-sm font-semibold text-white">Company Trade Intelligence</p>
          <span className="ml-auto text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full">CONFIDENTIAL</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">Private financial data — not shared with the public</p>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Total Annual Trade Volume', value: (() => { const t = companyIntel.reduce((s, c) => s + (c.priv?.annual_revenue_vnd || 0), 0); return t >= 1_000_000_000 ? `${(t/1_000_000_000).toFixed(1)}B ₫` : t >= 1_000_000 ? `${(t/1_000_000).toFixed(0)}M ₫` : t.toLocaleString('vi-VN') + ' ₫'; })() },
            { label: 'Verified Companies', value: `${companyIntel.filter(c => c.priv?.is_verified).length} / ${companyIntel.length}` },
            { label: 'Docs Submitted', value: companyIntel.filter(c => c.priv?.registration_doc_url || c.priv?.tax_code_doc_url).length },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-white/5 border border-white/10 p-3">
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                {['Company', 'Industry', 'Annual Revenue', 'Monthly Revenue', 'Reg. No.', 'Tax Code', 'Docs', 'Status'].map(h => (
                  <th key={h} className="pb-2 text-left text-gray-500 font-medium pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companyIntel.map(({ company: c, priv: p }) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-2.5 pr-4 font-medium text-white whitespace-nowrap">{c.company_name}</td>
                  <td className="py-2.5 pr-4 text-gray-400 whitespace-nowrap">{c.industry || '—'}</td>
                  <td className="py-2.5 pr-4 text-green-400 font-medium whitespace-nowrap">
                    {p?.annual_revenue_vnd
                      ? p.annual_revenue_vnd >= 1_000_000_000
                        ? `${(p.annual_revenue_vnd/1_000_000_000).toFixed(1)}B ₫`
                        : `${(p.annual_revenue_vnd/1_000_000).toFixed(0)}M ₫`
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-300 whitespace-nowrap">
                    {p?.monthly_revenue_vnd
                      ? p.monthly_revenue_vnd >= 1_000_000_000
                        ? `${(p.monthly_revenue_vnd/1_000_000_000).toFixed(1)}B ₫`
                        : `${(p.monthly_revenue_vnd/1_000_000).toFixed(0)}M ₫`
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-400 font-mono">{p?.registration_number || <span className="text-gray-600">—</span>}</td>
                  <td className="py-2.5 pr-4 text-gray-400 font-mono">{p?.tax_code || <span className="text-gray-600">—</span>}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex gap-1">
                      {p?.registration_doc_url && <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-400/20 px-1.5 py-0.5 rounded">Reg</span>}
                      {p?.tax_code_doc_url && <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-400/20 px-1.5 py-0.5 rounded">Tax</span>}
                      {!p?.registration_doc_url && !p?.tax_code_doc_url && <span className="text-gray-600">—</span>}
                    </div>
                  </td>
                  <td className="py-2.5">
                    {p?.is_verified
                      ? <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-400/20 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit"><ShieldCheck className="h-2.5 w-2.5" /> Verified</span>
                      : <span className="text-gray-600 text-[10px]">Unverified</span>}
                  </td>
                </tr>
              ))}
              {companyIntel.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-gray-600">No company data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </EmbassyLayout>
  );
}
