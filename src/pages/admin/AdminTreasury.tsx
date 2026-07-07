import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
  TrendingUp, TrendingDown, Banknote, ArrowUpRight, ArrowDownRight,
  Search, Plus, BookOpen, RefreshCw, Calendar, User, HeartHandshake, CheckCircle
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const VND = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

const CATEGORY_CONFIG: Record<string, { label: string; color: string; type: 'income' | 'expense' | 'both' }> = {
  membership_payment:  { label: 'Membership Payment',  color: '#00b359', type: 'income' },
  company_listing:     { label: 'Company Listing Fee', color: '#3b82f6', type: 'income' },
  welfare_support:     { label: 'Welfare Support',     color: '#DA251D', type: 'expense' },
  national_day_event:  { label: 'National Day Event',  color: '#FFD700', type: 'expense' },
  community_event:     { label: 'Community Event',     color: '#8b5cf6', type: 'expense' },
  administrative:      { label: 'Administrative',      color: '#f97316', type: 'expense' },
  other:               { label: 'Other',               color: '#6b7280', type: 'both' },
};

const EXPENSE_CATEGORIES = ['welfare_support','national_day_event','community_event','administrative','other'];

interface Transaction {
  id: string;
  transaction_type: 'income' | 'expense';
  category: string;
  amount: number;
  currency: string;
  description: string;
  reference_type?: string;
  created_at: string;
  notes?: string;
  profiles?: { first_name: string; last_name: string };
}

const CHART_COLORS = ['#00b359','#DA251D','#FFD700','#3b82f6','#8b5cf6','#f97316'];

const SUPPORT_TYPE_LABELS: Record<string, string> = {
  medical: 'Medical Support',
  housing: 'Housing Support',
  accident: 'Accident Support',
  employer_resolution: 'Employer Resolution',
  immigration: 'Immigration Support',
};

const URGENCY_COLORS: Record<string, string> = {
  low: '#00b359',
  medium: '#f97316',
  high: '#DA251D',
  critical: '#7c3aed',
};

interface ApprovedWelfareRequest {
  id: string;
  support_type: string;
  title: string;
  description?: string;
  urgency?: string;
  created_at?: string;
  profiles?: { first_name: string; last_name: string };
}

export function AdminTreasury() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [balance, setBalance] = useState({ income: 0, expense: 0, net: 0 });
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [catData, setCatData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  // Welfare searchable combobox state
  const [allApprovedWelfare, setAllApprovedWelfare] = useState<ApprovedWelfareRequest[]>([]);
  const [welfareSearch, setWelfareSearch] = useState('');
  const [welfareResults, setWelfareResults] = useState<ApprovedWelfareRequest[]>([]);
  const [selectedWelfare, setSelectedWelfare] = useState<ApprovedWelfareRequest | null>(null);
  const [showWelfareDropdown, setShowWelfareDropdown] = useState(false);
  const [welfareSearching, setWelfareSearching] = useState(false);
  // Generic member search (non-welfare categories)
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [selectedMember, setSelectedMember] = useState<{ id: string; first_name: string; last_name: string } | null>(null);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  // Expense form state
  const [form, setForm] = useState({
    category: 'welfare_support',
    amount: '',
    description: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fund_transactions')
      .select('*, profiles!fund_transactions_created_by_fkey(first_name, last_name)')
      .order('created_at', { ascending: false });
    if (error) console.error('Treasury load error:', error);
    const rows = (data || []) as Transaction[];
    setTransactions(rows);

    // Balance
    const income = rows.filter(r => r.transaction_type === 'income').reduce((s, r) => s + Number(r.amount), 0);
    const expense = rows.filter(r => r.transaction_type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
    setBalance({ income, expense, net: income - expense });

    // Monthly data — last 6 months
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      return { label: format(d, 'MMM yy'), start: startOfMonth(d), end: endOfMonth(d) };
    });
    setMonthlyData(months.map(m => ({
      month: m.label,
      income: rows.filter(r => r.transaction_type === 'income' && new Date(r.created_at) >= m.start && new Date(r.created_at) <= m.end).reduce((s, r) => s + Number(r.amount), 0) / 1_000_000,
      expense: rows.filter(r => r.transaction_type === 'expense' && new Date(r.created_at) >= m.start && new Date(r.created_at) <= m.end).reduce((s, r) => s + Number(r.amount), 0) / 1_000_000,
    })));

    // Category breakdown for expenses
    const catMap: Record<string, number> = {};
    rows.filter(r => r.transaction_type === 'expense').forEach(r => {
      catMap[r.category] = (catMap[r.category] || 0) + Number(r.amount);
    });
    setCatData(Object.entries(catMap).map(([k, v]) => ({
      name: CATEGORY_CONFIG[k]?.label || k,
      value: v,
      color: CATEGORY_CONFIG[k]?.color || '#6b7280',
    })));

    setLoading(false);
  }, []);

  useEffect(() => { load(); loadApprovedWelfare(); }, [load]);

  // Load all approved welfare requests once (client-side filter for reliability)
  const loadApprovedWelfare = async () => {
    setWelfareSearching(true);
    const { data } = await supabase
      .from('welfare_requests')
      .select('id, support_type, title, description, urgency, created_at, profiles!welfare_requests_user_id_fkey(first_name, last_name)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    setAllApprovedWelfare((data || []) as ApprovedWelfareRequest[]);
    setWelfareSearching(false);
  };

  // Client-side filter — instant, no network latency, works with joined profile names
  const searchWelfareRequests = (q: string) => {
    setWelfareSearch(q);
    setSelectedWelfare(null);
    setForm(f => ({ ...f, description: '' }));
    if (!q.trim()) {
      setWelfareResults([]);
      setShowWelfareDropdown(false);
      return;
    }
    const lower = q.toLowerCase();
    const matched = allApprovedWelfare.filter(req => {
      const fullName = `${req.profiles?.first_name || ''} ${req.profiles?.last_name || ''}`.toLowerCase();
      return (
        fullName.includes(lower) ||
        req.title.toLowerCase().includes(lower) ||
        (SUPPORT_TYPE_LABELS[req.support_type] || req.support_type).toLowerCase().includes(lower)
      );
    });
    setWelfareResults(matched.slice(0, 10));
    setShowWelfareDropdown(true);
  };

  const selectWelfareRequest = (req: ApprovedWelfareRequest) => {
    setSelectedWelfare(req);
    setShowWelfareDropdown(false);
    const memberName = `${req.profiles?.first_name || ''} ${req.profiles?.last_name || ''}`.trim();
    const supportLabel = SUPPORT_TYPE_LABELS[req.support_type] || req.support_type;
    setWelfareSearch(`${memberName} — ${supportLabel}`);
    setForm(f => ({
      ...f,
      description: `Welfare Support — ${memberName} (${supportLabel}: ${req.title})`,
    }));
  };

  const searchMembers = async (q: string) => {
    if (!q.trim()) { setMemberResults([]); setShowMemberDropdown(false); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(6);
    setMemberResults((data || []) as { id: string; first_name: string; last_name: string }[]);
    setShowMemberDropdown(true);
  };

  const selectMember = (m: { id: string; first_name: string; last_name: string }) => {
    setSelectedMember(m);
    setMemberSearch(`${m.first_name} ${m.last_name}`);
    setShowMemberDropdown(false);
    // Auto-populate description based on category
    const fullName = `${m.first_name} ${m.last_name}`;
    const catLabel = CATEGORY_CONFIG[form.category]?.label || form.category;
    setForm(f => ({
      ...f,
      description: f.description
        ? f.description
        : `${catLabel} — ${fullName}`,
    }));
  };

  const handleAddExpense = async () => {
    if (!form.amount || !form.description.trim() || !profile) return;
    setSubmitting(true);
    // Append member name to description if selected and not already there
    const memberName = selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : '';
    let finalDescription = form.description.trim();
    if (memberName && !finalDescription.includes(memberName)) {
      finalDescription = `${finalDescription} — ${memberName}`;
    }
    const { error } = await supabase.from('fund_transactions').insert({
      transaction_type: 'expense',
      category: form.category,
      amount: parseFloat(form.amount.replace(/,/g, '')),
      currency: 'VND',
      description: finalDescription,
      notes: form.notes.trim() || null,
      reference_type: 'manual',
      created_by: profile.id,
    });
    setSubmitting(false);
    if (!error) {
      setSuccessMsg('Expense recorded successfully');
      setForm({ category: 'welfare_support', amount: '', description: '', notes: '' });
      setSelectedMember(null);
      setMemberSearch('');
      setSelectedWelfare(null);
      setWelfareSearch('');
      setWelfareResults([]);
      setTimeout(() => setSuccessMsg(''), 3000);
      load();
      loadApprovedWelfare();
    }
  };

  const filtered = transactions.filter(r => {
    const text = `${r.description} ${r.category} ${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.toLowerCase();
    const matchSearch = !search || text.includes(search.toLowerCase());
    const matchType = filterType === 'all' || r.transaction_type === filterType;
    const matchCat = filterCat === 'all' || r.category === filterCat;
    return matchSearch && matchType && matchCat;
  });

  return (
    <AdminLayout title="Community Treasury">
      {/* Balance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-card border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Total Income</p>
            </div>
            <p className="text-2xl font-bold text-primary">{VND(balance.income)}</p>
            <p className="text-xs text-muted-foreground mt-1">All membership payments received</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-destructive/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Total Expenses</p>
            </div>
            <p className="text-2xl font-bold text-destructive">{VND(balance.expense)}</p>
            <p className="text-xs text-muted-foreground mt-1">Welfare, events & operations</p>
          </CardContent>
        </Card>
        <Card className={`shadow-card ${balance.net >= 0 ? 'border-primary/30' : 'border-destructive/30'}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${balance.net >= 0 ? 'gradient-primary' : 'bg-destructive'}`}>
                <Banknote className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Net Balance</p>
            </div>
            <p className={`text-2xl font-bold ${balance.net >= 0 ? 'text-primary' : 'text-destructive'}`}>{VND(balance.net)}</p>
            <p className="text-xs text-muted-foreground mt-1">Available community funds</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-5">
          <TabsTrigger value="overview" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="ledger" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Ledger</TabsTrigger>
          <TabsTrigger value="expense" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Record Expense</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Monthly Chart */}
            <Card className="shadow-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Monthly Cash Flow (Millions VND)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyData.some(d => d.income > 0 || d.expense > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="M" />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(2)}M ₫`]} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                      <Bar dataKey="income" name="Income" fill="#00b359" radius={[3,3,0,0]} />
                      <Bar dataKey="expense" name="Expense" fill="#DA251D" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                )}
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-foreground">Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {catData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                          {catData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => VND(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {catData.map(d => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="font-semibold text-foreground">{VND(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No expenses yet</div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="shadow-card lg:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">Recent Transactions</CardTitle>
                <Button size="sm" variant="ghost" onClick={load} className="h-8 gap-1.5 text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-sm text-muted-foreground text-center py-4">Loading...</p> : (
                  <div className="space-y-2">
                    {transactions.slice(0, 8).map(t => <TxRow key={t.id} tx={t} />)}
                    {transactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search transactions..." className="pl-9 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="text-xs h-8 px-2 rounded-md border border-border bg-background text-foreground" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <select className="text-xs h-8 px-2 rounded-md border border-border bg-background text-foreground" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                  <option value="all">All Categories</option>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              {/* Running balance summary row */}
              <div className="flex gap-6 pt-2 text-xs text-muted-foreground border-t border-border mt-2">
                <span>Showing <strong className="text-foreground">{filtered.length}</strong> transactions</span>
                <span>Income: <strong className="text-primary">{VND(filtered.filter(r=>r.transaction_type==='income').reduce((s,r)=>s+Number(r.amount),0))}</strong></span>
                <span>Expense: <strong className="text-destructive">{VND(filtered.filter(r=>r.transaction_type==='expense').reduce((s,r)=>s+Number(r.amount),0))}</strong></span>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-muted-foreground text-center py-4">Loading...</p> : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions found</p>
              ) : (
                <div className="space-y-2">
                  {filtered.map(t => <TxRow key={t.id} tx={t} detailed />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Record Expense Tab */}
        <TabsContent value="expense">
          <div className="max-w-lg">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-destructive" /> Record Community Expense
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {successMsg && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary font-medium">
                    {successMsg}
                  </div>
                )}

                <div>
                  <Label className="text-sm mb-1.5 block">Expense Category <span className="text-destructive">*</span></Label>
                  <Select value={form.category} onValueChange={v => {
                    setForm(f => ({ ...f, category: v, description: '' }));
                    setSelectedMember(null);
                    setMemberSearch('');
                    setSelectedWelfare(null);
                    setWelfareSearch('');
                    setWelfareResults([]);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(k => (
                        <SelectItem key={k} value={k}>{CATEGORY_CONFIG[k].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* WELFARE: searchable combobox + selected card + details preview */}
                {form.category === 'welfare_support' && (
                  <div className="space-y-3">
                    <Label className="text-sm flex items-center gap-1.5">
                      <HeartHandshake className="h-3.5 w-3.5 text-destructive" />
                      Approved Welfare Request <span className="text-destructive">*</span>
                    </Label>

                    {/* Searchable input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        className="pl-9 pr-9"
                        placeholder="Search by member name or case title..."
                        value={welfareSearch}
                        onChange={e => searchWelfareRequests(e.target.value)}
                        onFocus={() => welfareSearch && setShowWelfareDropdown(true)}
                        onBlur={() => setTimeout(() => setShowWelfareDropdown(false), 150)}
                      />
                      {welfareSearch && (
                        <button
                          type="button"
                          onClick={() => { setWelfareSearch(''); setWelfareResults([]); setSelectedWelfare(null); setShowWelfareDropdown(false); setForm(f => ({ ...f, description: '' })); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                        >
                          ×
                        </button>
                      )}

                      {/* Dropdown results */}
                      {showWelfareDropdown && (
                        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                          {welfareSearching ? (
                            <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Searching...
                            </div>
                          ) : welfareResults.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-muted-foreground">No approved requests found</div>
                          ) : (
                            welfareResults.map(req => {
                              const memberName = `${req.profiles?.first_name || ''} ${req.profiles?.last_name || ''}`.trim();
                              const supportLabel = SUPPORT_TYPE_LABELS[req.support_type] || req.support_type;
                              return (
                                <button
                                  key={req.id}
                                  type="button"
                                  onMouseDown={() => selectWelfareRequest(req)}
                                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/40 transition-smooth border-b border-border/50 last:border-0 flex items-start gap-3"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <HeartHandshake className="h-3.5 w-3.5 text-destructive" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground truncate uppercase tracking-wide text-xs">{memberName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{supportLabel} — {req.title}</p>
                                  </div>
                                  {req.urgency && (
                                    <span
                                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                      style={{ backgroundColor: (URGENCY_COLORS[req.urgency] || '#6b7280') + '20', color: URGENCY_COLORS[req.urgency] || '#6b7280' }}
                                    >
                                      {req.urgency}
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selected card */}
                    {selectedWelfare && (() => {
                      const memberName = `${selectedWelfare.profiles?.first_name || ''} ${selectedWelfare.profiles?.last_name || ''}`.trim();
                      const supportLabel = SUPPORT_TYPE_LABELS[selectedWelfare.support_type] || selectedWelfare.support_type;
                      const urgencyColor = URGENCY_COLORS[selectedWelfare.urgency || ''] || '#6b7280';
                      return (
                        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 overflow-hidden">
                          {/* Card header */}
                          <div className="flex items-start gap-3 p-3 border-b border-primary/20">
                            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                              <CheckCircle className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-foreground uppercase tracking-wide text-sm">{memberName}</p>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                <span className="text-xs text-muted-foreground">{supportLabel}</span>
                                {selectedWelfare.urgency && (
                                  <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: urgencyColor + '20', color: urgencyColor }}
                                  >
                                    {selectedWelfare.urgency}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setSelectedWelfare(null); setWelfareSearch(''); setWelfareResults([]); setForm(f => ({ ...f, description: '' })); }}
                              className="text-muted-foreground hover:text-foreground text-lg leading-none shrink-0"
                              title="Remove selection"
                            >×</button>
                          </div>

                          {/* Request details preview */}
                          <div className="p-3 space-y-2">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Case Title</p>
                              <p className="text-sm font-medium text-foreground">{selectedWelfare.title}</p>
                            </div>
                            {selectedWelfare.description && (
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Description</p>
                                <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">{selectedWelfare.description}</p>
                              </div>
                            )}
                            {selectedWelfare.created_at && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-primary/10">
                                <Calendar className="h-3 w-3" />
                                Submitted {new Date(selectedWelfare.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* NON-WELFARE: generic member name search */}
                {form.category !== 'welfare_support' && (
                  <div className="relative">
                    <Label className="text-sm mb-1.5 block flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> Member Name
                      <span className="text-muted-foreground text-xs ml-1">(optional — appended to description)</span>
                    </Label>
                    <Input
                      placeholder="Search member by name..."
                      value={memberSearch}
                      onChange={e => {
                        setMemberSearch(e.target.value);
                        setSelectedMember(null);
                        searchMembers(e.target.value);
                      }}
                      onFocus={() => memberSearch && setShowMemberDropdown(true)}
                      className="h-9 text-sm"
                    />
                    {showMemberDropdown && memberResults.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-card overflow-hidden">
                        {memberResults.map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => selectMember(m)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-smooth border-b border-border/50 last:border-0 flex items-center gap-2"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-primary">{m.first_name[0]}{m.last_name[0]}</span>
                            </div>
                            <span className="font-medium text-foreground">{m.first_name} {m.last_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedMember && (
                      <p className="text-xs text-primary mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" /> {selectedMember.first_name} {selectedMember.last_name} — name will be appended to description
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-sm mb-1.5 block">Amount (VND) <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₫</span>
                    <Input
                      className="pl-7"
                      placeholder="e.g. 500000"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, '') }))}
                    />
                  </div>
                  {form.amount && (
                    <p className="text-xs text-muted-foreground mt-1">{VND(Number(form.amount))}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm mb-1.5 block">Description <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. Welfare support for John Doe — medical expenses"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div>
                  <Label className="text-sm mb-1.5 block">Notes (optional)</Label>
                  <Textarea
                    rows={3}
                    placeholder="Additional details, receipts reference, approval notes..."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                {/* Preview */}
                {form.amount && form.description && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
                    <p className="text-xs text-muted-foreground mb-1">Preview</p>
                    <p className="font-semibold text-foreground">{VND(Number(form.amount))} deducted</p>
                    <p className="text-xs text-muted-foreground">from fund as <em>{CATEGORY_CONFIG[form.category]?.label}</em></p>
                    <p className="text-xs text-foreground mt-1 font-medium">
                      "{form.description.trim()}{selectedMember && !form.description.includes(`${selectedMember.first_name} ${selectedMember.last_name}`) ? ` — ${selectedMember.first_name} ${selectedMember.last_name}` : ''}"
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">New estimated balance: <strong className={balance.net - Number(form.amount) >= 0 ? 'text-primary' : 'text-destructive'}>{VND(balance.net - Number(form.amount))}</strong></p>
                  </div>
                )}

                <Button
                  className="w-full h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold gap-2"
                  onClick={handleAddExpense}
                  disabled={submitting || !form.amount || !form.description.trim()}
                >
                  <ArrowDownRight className="h-4 w-4" />
                  {submitting ? 'Recording...' : 'Record Expense & Deduct from Fund'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

function TxRow({ tx, detailed }: { tx: Transaction; detailed?: boolean }) {
  const isIncome = tx.transaction_type === 'income';
  const cfg = CATEGORY_CONFIG[tx.category] || CATEGORY_CONFIG.other;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/20 transition-smooth">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isIncome ? 'bg-primary/10' : 'bg-destructive/10'}`}>
        {isIncome
          ? <TrendingUp className="h-4 w-4 text-primary" />
          : <TrendingDown className="h-4 w-4 text-destructive" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="text-sm font-semibold text-foreground truncate">{tx.description}</p>
          <Badge className="text-[10px] border shrink-0" style={{ backgroundColor: cfg.color + '20', color: cfg.color, borderColor: cfg.color + '40' }}>
            {cfg.label}
          </Badge>
        </div>
        {detailed && (
          <p className="text-xs text-muted-foreground">
            {new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            {tx.notes && ` · ${tx.notes}`}
          </p>
        )}
        {!detailed && (
          <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
        )}
      </div>
      <p className={`text-sm font-bold shrink-0 ${isIncome ? 'text-primary' : 'text-destructive'}`}>
        {isIncome ? '+' : '-'}{VND(Number(tx.amount))}
      </p>
    </div>
  );
}
