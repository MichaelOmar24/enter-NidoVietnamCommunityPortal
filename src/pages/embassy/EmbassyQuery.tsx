import { useState } from 'react';
import { EmbassyLayout } from '@/components/layout/EmbassyLayout';
import { supabase } from '@/integrations/supabase/client';
import { Play, Database, Download, AlertCircle } from 'lucide-react';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  duration: number;
  count: number;
}

const PRESET_QUERIES = [
  {
    id: 'active_members',
    label: 'Active Members',
    description: 'All currently active NIDO members',
    category: 'Members',
    run: async () => {
      const { data } = await supabase.from('profiles')
        .select('first_name, last_name, email, vietnam_city, membership_type, created_at')
        .eq('membership_status', 'active')
        .order('created_at', { ascending: false });
      return data || [];
    }
  },
  {
    id: 'pending_approval',
    label: 'Pending Approval',
    description: 'Members awaiting admin approval',
    category: 'Members',
    run: async () => {
      const { data } = await supabase.from('profiles')
        .select('first_name, last_name, email, vietnam_city, occupation_type, created_at')
        .eq('membership_status', 'pending')
        .order('created_at', { ascending: false });
      return data || [];
    }
  },
  {
    id: 'expired_members',
    label: 'Expired Memberships',
    description: 'Members whose membership has lapsed',
    category: 'Members',
    run: async () => {
      const { data } = await supabase.from('profiles')
        .select('first_name, last_name, email, vietnam_city, membership_type, created_at')
        .eq('membership_status', 'expired')
        .order('created_at', { ascending: false });
      return data || [];
    }
  },
  {
    id: 'new_30days',
    label: 'New Members (30 days)',
    description: 'Members who joined in the last 30 days',
    category: 'Members',
    run: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data } = await supabase.from('profiles')
        .select('first_name, last_name, email, vietnam_city, occupation_type, membership_status, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false });
      return data || [];
    }
  },
  {
    id: 'expiring_passports',
    label: 'Expiring Passports (≤12 mo)',
    description: 'Passports expiring within 12 months',
    category: 'Passports',
    run: async () => {
      const { data } = await supabase.from('passports')
        .select('passport_number, expiry_date, place_of_issue, is_biometric, verified, profiles(first_name, last_name, email, vietnam_city)');
      const now = new Date();
      return (data || [])
        .filter((p: Record<string, unknown>) => { const d = p.expiry_date as string; if (!d) return false; const days = differenceInDays(parseISO(d), now); return days >= 0 && days <= 365; })
        .map((p: Record<string, unknown>) => {
          const prof = p.profiles as Record<string, unknown> || {};
          return { name: `${prof.first_name} ${prof.last_name}`, email: prof.email, city: prof.vietnam_city, passport_number: p.passport_number, expiry_date: p.expiry_date, days_left: differenceInDays(parseISO(p.expiry_date as string), now), is_biometric: p.is_biometric, verified: p.verified };
        })
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.days_left as number) - (b.days_left as number));
    }
  },
  {
    id: 'expired_passports',
    label: 'Expired Passports',
    description: 'All passports past their expiry date',
    category: 'Passports',
    run: async () => {
      const { data } = await supabase.from('passports')
        .select('passport_number, expiry_date, place_of_issue, profiles(first_name, last_name, email, vietnam_city)');
      const now = new Date();
      return (data || [])
        .filter((p: Record<string, unknown>) => { const d = p.expiry_date as string; return d && differenceInDays(parseISO(d), now) < 0; })
        .map((p: Record<string, unknown>) => {
          const prof = p.profiles as Record<string, unknown> || {};
          return { name: `${prof.first_name} ${prof.last_name}`, email: prof.email, city: prof.vietnam_city, passport_number: p.passport_number, expired_on: p.expiry_date };
        });
    }
  },
  {
    id: 'unverified_passports',
    label: 'Unverified Passports',
    description: 'Passports awaiting admin verification',
    category: 'Passports',
    run: async () => {
      const { data } = await supabase.from('passports')
        .select('passport_number, expiry_date, place_of_issue, is_biometric, created_at, profiles(first_name, last_name, email)')
        .eq('verified', false);
      return (data || []).map((p: Record<string, unknown>) => {
        const prof = p.profiles as Record<string, unknown> || {};
        return { name: `${prof.first_name} ${prof.last_name}`, email: prof.email, passport_number: p.passport_number, expiry_date: p.expiry_date, place_of_issue: p.place_of_issue, is_biometric: p.is_biometric, submitted: p.created_at };
      });
    }
  },
  {
    id: 'biometric_passports',
    label: 'Biometric Passport Holders',
    description: 'All members with biometric passports',
    category: 'Passports',
    run: async () => {
      const { data } = await supabase.from('passports')
        .select('passport_number, expiry_date, place_of_issue, profiles(first_name, last_name, email, vietnam_city)')
        .eq('is_biometric', true);
      return (data || []).map((p: Record<string, unknown>) => {
        const prof = p.profiles as Record<string, unknown> || {};
        return { name: `${prof.first_name} ${prof.last_name}`, email: prof.email, city: prof.vietnam_city, passport_number: p.passport_number, expiry_date: p.expiry_date };
      });
    }
  },
  {
    id: 'no_passport',
    label: 'Members Without Passport',
    description: 'Members who have not submitted passport details',
    category: 'Passports',
    run: async () => {
      const { data: withPass } = await supabase.from('passports').select('user_id');
      const ids = new Set((withPass || []).map((p: Record<string, unknown>) => p.user_id));
      const { data } = await supabase.from('profiles').select('first_name, last_name, email, vietnam_city, membership_status, created_at').eq('membership_status', 'active');
      return (data || []).filter((p: Record<string, unknown>) => !ids.has((p as Record<string, unknown>).id));
    }
  },
  {
    id: 'companies',
    label: 'All Companies',
    description: 'Registered businesses in NIDO directory',
    category: 'Businesses',
    run: async () => {
      const { data } = await supabase.from('companies')
        .select('name, business_type, vietnam_city, is_approved, contact_email, contact_phone, created_at')
        .order('created_at', { ascending: false });
      return data || [];
    }
  },
  {
    id: 'recent_activities',
    label: 'Recent Activities',
    description: 'Latest NIDO activities and events',
    category: 'Activities',
    run: async () => {
      const { data } = await supabase.from('activities')
        .select('title, event_date, location, event_type, created_at')
        .order('event_date', { ascending: false })
        .limit(20);
      return data || [];
    }
  },
  {
    id: 'premium_members',
    label: 'Premium Members',
    description: 'All members on premium membership tier',
    category: 'Members',
    run: async () => {
      const { data } = await supabase.from('profiles')
        .select('first_name, last_name, email, vietnam_city, membership_status, created_at')
        .eq('membership_type', 'premium')
        .order('created_at', { ascending: false });
      return data || [];
    }
  },
];

const CATEGORIES = ['All', 'Members', 'Passports', 'Businesses', 'Activities'];

export function EmbassyQuery() {
  const [results, setResults] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeQuery, setActiveQuery] = useState<string | null>(null);

  const runQuery = async (query: typeof PRESET_QUERIES[0]) => {
    setRunning(query.id);
    setError(null);
    setActiveQuery(query.id);
    const start = Date.now();
    try {
      const data = await query.run();
      const duration = Date.now() - start;
      const columns = data.length > 0 ? Object.keys(data[0] as Record<string, unknown>) : [];
      setResults({ columns, rows: data as Record<string, unknown>[], duration, count: data.length });
    } catch (e) {
      setError(String(e));
    }
    setRunning(null);
  };

  const exportCSV = () => {
    if (!results) return;
    const csv = [results.columns, ...results.rows.map(r => results.columns.map(c => String(r[c] ?? '')))].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nido-query-${activeQuery}-${Date.now()}.csv`; a.click();
  };

  const filteredQueries = activeCategory === 'All' ? PRESET_QUERIES : PRESET_QUERIES.filter(q => q.category === activeCategory);

  const formatCell = (val: unknown): string => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
      try { return format(parseISO(val), 'dd MMM yyyy'); } catch { return val; }
    }
    return String(val);
  };

  return (
    <EmbassyLayout title="Query Explorer" subtitle="Run preset intelligence queries across the entire platform">
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Sidebar queries */}
        <div className="embassy-chart-card p-4 lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-4 w-4 text-green-400" />
            <p className="text-sm font-semibold text-white">Preset Queries</p>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${activeCategory === cat ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-white/10 text-gray-500 hover:text-gray-300'}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            {filteredQueries.map(q => (
              <button key={q.id} onClick={() => runQuery(q)} disabled={running === q.id}
                className={`w-full text-left p-3 rounded-lg border transition-all ${activeQuery === q.id ? 'bg-green-500/15 border-green-500/40' : 'border-white/5 hover:border-white/15 hover:bg-white/3'}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-white">{q.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-600">{q.category}</span>
                </div>
                <p className="text-[11px] text-gray-500">{q.description}</p>
                {running === q.id && <div className="mt-1 h-0.5 bg-green-500/20 rounded overflow-hidden"><div className="h-full bg-green-500 animate-[slide_1s_linear_infinite]" style={{ width: '60%' }} /></div>}
              </button>
            ))}
          </div>
        </div>

        {/* Results panel */}
        <div className="lg:col-span-2 space-y-4">
          {!results && !error && (
            <div className="embassy-chart-card p-10 text-center">
              <Database className="h-10 w-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Select a query from the left to view results</p>
              <p className="text-gray-700 text-xs mt-1">All data is pulled live from the platform database</p>
            </div>
          )}

          {error && (
            <div className="embassy-chart-card p-4 border border-red-500/30">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Query Error</span>
              </div>
              <p className="text-xs text-gray-500">{error}</p>
            </div>
          )}

          {results && (
            <div className="embassy-chart-card overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{PRESET_QUERIES.find(q => q.id === activeQuery)?.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {results.count} records · {results.duration}ms
                  </p>
                </div>
                <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 text-xs hover:bg-green-500/20 transition-colors">
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {results.columns.map(col => (
                        <th key={col} className="px-4 py-2.5 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.rows.length === 0 ? (
                      <tr><td colSpan={results.columns.length} className="px-4 py-8 text-center text-gray-600 text-xs">No records match this query</td></tr>
                    ) : results.rows.map((row, i) => (
                      <tr key={i} className="border-b border-white/5 embassy-table-row">
                        {results.columns.map(col => (
                          <td key={col} className="px-4 py-2.5 text-xs text-gray-300 whitespace-nowrap">
                            {formatCell(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 border-t border-white/5 text-xs text-gray-600 flex items-center gap-2">
                <Play className="h-3 w-3 text-green-500" />
                Query completed in {results.duration}ms · {results.count} results
              </div>
            </div>
          )}
        </div>
      </div>
    </EmbassyLayout>
  );
}
