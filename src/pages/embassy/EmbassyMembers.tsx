import { useState, useEffect } from 'react';
import { EmbassyLayout } from '@/components/layout/EmbassyLayout';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, Download } from 'lucide-react';
import { OCCUPATION_LABELS, MARITAL_STATUS_LABELS, VIETNAM_CITIES, QUALIFICATION_LABELS, RELIGION_LABELS, PURPOSE_OF_VISIT_LABELS } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { format } from 'date-fns';

const CHART_COLORS = ['#00b359', '#FFD700', '#DA251D', '#3b82f6', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'];

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  vietnam_city?: string;
  nigerian_state_of_origin?: string;
  occupation_type?: string;
  marital_status?: string;
  gender?: string;
  membership_status: string;
  membership_type: string;
  is_admin: boolean;
  created_at: string;
  date_of_birth?: string;
  purpose_of_visit?: string;
  religion?: string;
  highest_qualification?: string;
  next_of_kin_name?: string;
  next_of_kin_relationship?: string;
  next_of_kin_phone?: string;
}

export function EmbassyMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filtered, setFiltered] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [stateData, setStateData] = useState<{ state: string; count: number }[]>([]);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let data = members;
    if (search) data = data.filter(m => `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'all') data = data.filter(m => m.membership_status === statusFilter);
    if (cityFilter !== 'all') data = data.filter(m => m.vietnam_city === cityFilter);
    setFiltered(data);
  }, [members, search, statusFilter, cityFilter]);

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const mems = (data || []) as Member[];
    setMembers(mems);
    setFiltered(mems);

    // State of origin chart
    const stateMap: Record<string, number> = {};
    mems.forEach(m => { if (m.nigerian_state_of_origin) stateMap[m.nigerian_state_of_origin] = (stateMap[m.nigerian_state_of_origin] || 0) + 1; });
    setStateData(Object.entries(stateMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ state: k, count: v })));
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'City', 'State', 'Occupation', 'Marital', 'Gender', 'Status', 'Qualification', 'Religion', 'Purpose of Visit', 'Next of Kin', 'Next of Kin Phone', 'Joined'];
    const rows = filtered.map(m => [
      `${m.first_name} ${m.last_name}`, m.email, m.phone || '', m.vietnam_city || '',
      m.nigerian_state_of_origin || '',
      OCCUPATION_LABELS[m.occupation_type as keyof typeof OCCUPATION_LABELS] || m.occupation_type || '',
      m.marital_status || '', m.gender || '', m.membership_status,
      QUALIFICATION_LABELS[m.highest_qualification as keyof typeof QUALIFICATION_LABELS] || m.highest_qualification || '',
      RELIGION_LABELS[m.religion as keyof typeof RELIGION_LABELS] || m.religion || '',
      PURPOSE_OF_VISIT_LABELS[m.purpose_of_visit as keyof typeof PURPOSE_OF_VISIT_LABELS] || m.purpose_of_visit || '',
      m.next_of_kin_name ? `${m.next_of_kin_name} (${m.next_of_kin_relationship || ''})` : '',
      m.next_of_kin_phone || '',
      format(new Date(m.created_at), 'yyyy-MM-dd')
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nido-members-${Date.now()}.csv`; a.click();
  };

  const statusBadge = (s: string) => {
    const cfg: Record<string, string> = {
      active: 'bg-green-500/15 text-green-400 border-green-500/30',
      pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      expired: 'bg-red-500/15 text-red-400 border-red-500/30',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[11px] border font-medium ${cfg[s] || 'bg-gray-500/15 text-gray-400'}`}>{s}</span>;
  };

  return (
    <EmbassyLayout title="Member Intelligence" subtitle={`${filtered.length} of ${members.length} records`}>
      {/* State Chart */}
      <div className="embassy-chart-card p-4 mb-4">
        <p className="text-sm font-semibold text-white mb-1">Top 10 Nigerian States of Origin</p>
        <p className="text-xs text-gray-500 mb-4">Distribution of members by home state in Nigeria</p>
        {stateData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stateData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="state" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e6edf3' }} />
              <Bar dataKey="count" name="Members" radius={[0, 4, 4, 0]}>
                {stateData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="h-32 flex items-center justify-center text-gray-600 text-sm">No data</div>}
      </div>

      {/* Filters */}
      <div className="embassy-chart-card p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 px-3 py-2 focus:outline-none">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
            <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 px-3 py-2 focus:outline-none">
              <option value="all">All Cities</option>
              {VIETNAM_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 text-sm hover:bg-green-500/20 transition-colors">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="embassy-chart-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Member', 'Contact', 'Location', 'Occupation', 'Purpose of Visit', 'Religion', 'Status', 'Joined'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={8} className="px-4 py-3"><div className="h-3 bg-white/5 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600">No members found</td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="border-b border-white/5 embassy-table-row">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{m.first_name} {m.last_name}</p>
                      {m.is_admin && <span className="text-[10px] text-yellow-400">Admin</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-400 text-xs">{m.email}</p>
                    {m.phone && <p className="text-gray-600 text-xs">{m.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-400 text-xs">{m.vietnam_city || '—'}</p>
                    {m.nigerian_state_of_origin && <p className="text-gray-600 text-[11px]">{m.nigerian_state_of_origin}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs capitalize">
                    {OCCUPATION_LABELS[m.occupation_type as keyof typeof OCCUPATION_LABELS] || m.occupation_type || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {PURPOSE_OF_VISIT_LABELS[m.purpose_of_visit as keyof typeof PURPOSE_OF_VISIT_LABELS] || m.purpose_of_visit || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {RELIGION_LABELS[m.religion as keyof typeof RELIGION_LABELS] || m.religion || '—'}
                  </td>
                  <td className="px-4 py-3">{statusBadge(m.membership_status)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{format(new Date(m.created_at), 'dd MMM yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-white/5 text-xs text-gray-600">
          Showing {filtered.length} of {members.length} members
        </div>
      </div>
    </EmbassyLayout>
  );
}
