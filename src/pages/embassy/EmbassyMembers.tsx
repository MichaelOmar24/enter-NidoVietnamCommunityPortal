import { useState, useEffect } from 'react';
import { EmbassyLayout } from '@/components/layout/EmbassyLayout';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, Download, Eye, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MemberProfileEditor } from '@/components/admin/MemberProfileEditor';
import { Profile, OCCUPATION_LABELS, MARITAL_STATUS_LABELS, VIETNAM_CITIES, QUALIFICATION_LABELS, RELIGION_LABELS, PURPOSE_OF_VISIT_LABELS } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { format } from 'date-fns';

const CHART_COLORS = ['#00b359', '#FFD700', '#DA251D', '#3b82f6', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'];

interface Member extends Profile {
  lga_of_origin?: string;
}

export function EmbassyMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filtered, setFiltered] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [stateData, setStateData] = useState<{ state: string; count: number }[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [editTarget, setEditTarget] = useState<Member | null>(null);

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
                {['Member', 'Contact', 'Location', 'Occupation', 'Purpose of Visit', 'Religion', 'Status', 'Joined', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={9} className="px-4 py-3"><div className="h-3 bg-white/5 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-600">No members found</td></tr>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelected(m)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 text-xs hover:bg-green-500/20 transition-colors"
                        title="View Record"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      <button
                        onClick={() => setEditTarget(m)}
                        className="flex items-center justify-center h-[26px] w-[26px] rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                        title="Edit Record"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-white/5 text-xs text-gray-600">
          Showing {filtered.length} of {members.length} members
        </div>
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-primary" /> Edit {editTarget?.first_name} {editTarget?.last_name}
            </DialogTitle>
          </DialogHeader>
          {editTarget && (
            <MemberProfileEditor
              member={editTarget}
              onCancel={() => setEditTarget(null)}
              onSaved={(updated) => {
                setMembers(list => list.map(m => m.id === editTarget.id ? { ...m, ...updated } : m));
                setEditTarget(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Member Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.first_name} {selected?.last_name}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['Email', selected.email],
                  ['Phone', selected.phone],
                  ['DOB', selected.date_of_birth],
                  ['Gender', selected.gender],
                  ['Occupation', selected.occupation_type ? OCCUPATION_LABELS[selected.occupation_type as keyof typeof OCCUPATION_LABELS] || selected.occupation_type : null],
                  ['Marital Status', selected.marital_status ? MARITAL_STATUS_LABELS[selected.marital_status as keyof typeof MARITAL_STATUS_LABELS] || selected.marital_status : null],
                  ['Vietnam City', selected.vietnam_city],
                  ['Vietnam Address', selected.vietnam_address],
                  ['State of Origin', selected.nigerian_state_of_origin],
                  ['LGA of Origin', selected.lga_of_origin],
                  ['Religion', selected.religion ? RELIGION_LABELS[selected.religion as keyof typeof RELIGION_LABELS] || selected.religion : null],
                  ['Highest Qualification', selected.highest_qualification ? QUALIFICATION_LABELS[selected.highest_qualification as keyof typeof QUALIFICATION_LABELS] || selected.highest_qualification : null],
                  ['Purpose of Visit', selected.purpose_of_visit ? PURPOSE_OF_VISIT_LABELS[selected.purpose_of_visit as keyof typeof PURPOSE_OF_VISIT_LABELS] || selected.purpose_of_visit : null],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <span className="text-muted-foreground text-xs">{k}</span>
                    <span className="text-foreground capitalize">{v || '-'}</span>
                  </div>
                ))}
              </div>

              {(selected.occupation_institution_name || selected.occupation_institution_address || selected.occupation_country_state) && (
                <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Occupation Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      ['Institution / Business Name', selected.occupation_institution_name],
                      ['Institution / Business Address', selected.occupation_institution_address],
                      ['Country / State', selected.occupation_country_state],
                    ].map(([k, v]) => (
                      <div key={k} className="flex flex-col">
                        <span className="text-muted-foreground text-xs">{k}</span>
                        <span className="text-foreground">{v || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selected.next_of_kin_name || selected.next_of_kin_phone) && (
                <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Next of Kin</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      ['Name', selected.next_of_kin_name],
                      ['Relationship', selected.next_of_kin_relationship],
                      ['Phone', selected.next_of_kin_phone],
                      ['Address', selected.next_of_kin_address],
                    ].map(([k, v]) => (
                      <div key={k} className="flex flex-col">
                        <span className="text-muted-foreground text-xs">{k}</span>
                        <span className="text-foreground">{v || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.marital_status === 'married' && (
                <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Spouse &amp; Family</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs block">Spouse Name</span>
                      <span className="text-foreground">
                        {[selected.spouse_first_name, selected.spouse_last_name].filter(Boolean).join(' ') || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Spouse Nationality</span>
                      <span className="text-foreground capitalize">
                        {selected.spouse_nationality === 'other'
                          ? selected.spouse_nationality_other || 'Other'
                          : selected.spouse_nationality || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Children</span>
                      <span className="text-foreground">{selected.number_of_kids ?? 0}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Membership Status:</span>
                {statusBadge(selected.membership_status)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </EmbassyLayout>
  );
}
