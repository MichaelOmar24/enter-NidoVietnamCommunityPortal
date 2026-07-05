import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Building2, AlertTriangle, CheckCircle, Clock, TrendingUp, Shield, Crown, Banknote, CreditCard, TrendingDown } from 'lucide-react';
import { OCCUPATION_LABELS, MARITAL_STATUS_LABELS } from '@/lib/types';
import { differenceInDays, parseISO } from 'date-fns';

const COLORS = ['#008751', '#FFD700', '#DA251D', '#006B40', '#FF8C00', '#4169E1'];
const VND = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0, active: 0, pending: 0, companies: 0,
    expiringPassports: 0, expiredPassports: 0,
    premiumMembers: 0, goldMembers: 0, pendingPayments: 0, totalRevenue: 0,
    fundIncome: 0, fundExpense: 0, fundBalance: 0,
  });
  const [occupationData, setOccupationData] = useState<{ name: string; value: number }[]>([]);
  const [maritalData, setMaritalData] = useState<{ name: string; value: number }[]>([]);
  const [cityData, setCityData] = useState<{ city: string; members: number }[]>([]);
  const [revenueData, setRevenueData] = useState<{ plan: string; count: number; revenue: number }[]>([]);
  const [recentMembers, setRecentMembers] = useState<{ first_name: string; last_name: string; email: string; occupation_type: string; membership_status: string; membership_type: string; created_at: string }[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [
      { count: total },
      { count: active },
      { count: pending },
      { count: companies },
      { data: profiles },
      { data: passports },
      { data: recent },
      { data: memberships },
      { data: fundTxns },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('membership_status', 'active'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('membership_status', 'pending'),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('occupation_type, marital_status, vietnam_city, membership_type'),
      supabase.from('passports').select('expiry_date'),
      supabase.from('profiles').select('first_name, last_name, email, occupation_type, membership_status, membership_type, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('memberships').select('plan_type, payment_status, amount, currency'),
      supabase.from('fund_transactions').select('transaction_type, amount'),
    ]);

    // Count expiring passports
    const now = new Date();
    let expiring = 0, expired = 0;
    (passports || []).forEach((p: { expiry_date: string | null }) => {
      if (p.expiry_date) {
        const days = differenceInDays(parseISO(p.expiry_date), now);
        if (days < 0) expired++;
        else if (days <= 365) expiring++;
      }
    });

    // Membership payment stats
    const allMemberships = memberships || [];
    const approvedMemberships = allMemberships.filter((m: { payment_status: string }) => ['approved','completed'].includes(m.payment_status));
    const premiumMembers = approvedMemberships.filter((m: { plan_type: string }) => m.plan_type === 'premium').length;
    const goldMembers = approvedMemberships.filter((m: { plan_type: string }) => m.plan_type === 'gold').length;
    const pendingPayments = allMemberships.filter((m: { payment_status: string }) => m.payment_status === 'pending').length;
    const totalRevenue = approvedMemberships
      .filter((m: { currency: string }) => m.currency === 'VND')
      .reduce((sum: number, m: { amount: number }) => sum + Number(m.amount || 0), 0);

    // Revenue by plan
    const revMap: Record<string, { count: number; revenue: number }> = { premium: { count: 0, revenue: 0 }, gold: { count: 0, revenue: 0 } };
    approvedMemberships.forEach((m: { plan_type: string; amount: number }) => {
      if (revMap[m.plan_type]) {
        revMap[m.plan_type].count++;
        revMap[m.plan_type].revenue += Number(m.amount || 0);
      }
    });
    setRevenueData([
      { plan: 'Premium', count: revMap.premium.count, revenue: revMap.premium.revenue },
      { plan: 'Gold', count: revMap.gold.count, revenue: revMap.gold.revenue },
    ]);

    setStats({ total: total || 0, active: active || 0, pending: pending || 0, companies: companies || 0, expiringPassports: expiring, expiredPassports: expired, premiumMembers, goldMembers, pendingPayments, totalRevenue,
      fundIncome: (fundTxns || []).filter((t: { transaction_type: string }) => t.transaction_type === 'income').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0),
      fundExpense: (fundTxns || []).filter((t: { transaction_type: string }) => t.transaction_type === 'expense').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0),
      fundBalance: (fundTxns || []).reduce((s: number, t: { transaction_type: string; amount: number }) => s + (t.transaction_type === 'income' ? Number(t.amount) : -Number(t.amount)), 0),
    });

    // Occupation breakdown
    const occMap: Record<string, number> = {};
    (profiles || []).forEach((p: { occupation_type: string | null }) => {
      if (p.occupation_type) occMap[p.occupation_type] = (occMap[p.occupation_type] || 0) + 1;
    });
    setOccupationData(Object.entries(occMap).map(([k, v]) => ({ name: OCCUPATION_LABELS[k as keyof typeof OCCUPATION_LABELS] || k, value: v })));

    // Marital status breakdown
    const marMap: Record<string, number> = {};
    (profiles || []).forEach((p2: { marital_status: string | null }) => {
      if (p2.marital_status) marMap[p2.marital_status] = (marMap[p2.marital_status] || 0) + 1;
    });
    setMaritalData(Object.entries(marMap).map(([k, v]) => ({ name: MARITAL_STATUS_LABELS[k as keyof typeof MARITAL_STATUS_LABELS] || k, value: v })));

    // City breakdown
    const cityMap: Record<string, number> = {};
    (profiles || []).forEach((p3: { vietnam_city: string | null }) => {
      if (p3.vietnam_city) cityMap[p3.vietnam_city] = (cityMap[p3.vietnam_city] || 0) + 1;
    });
    setCityData(Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ city: k, members: v })));

    setRecentMembers((recent || []) as typeof recentMembers);
  };

  const statCards = [
    { icon: Users, label: 'Total Members', value: stats.total, color: 'text-primary', bg: 'gradient-primary' },
    { icon: CheckCircle, label: 'Active Members', value: stats.active, color: 'text-green-600', bg: 'bg-green-500' },
    { icon: Clock, label: 'Pending Members', value: stats.pending, color: 'text-gold', bg: 'gradient-gold' },
    { icon: Building2, label: 'Businesses', value: stats.companies, color: 'text-accent', bg: 'bg-accent' },
    { icon: Shield, label: 'Premium Members', value: stats.premiumMembers, color: 'text-primary', bg: 'gradient-primary' },
    { icon: Crown, label: 'Gold Stakeholders', value: stats.goldMembers, color: 'text-amber-600', bg: 'bg-amber-500' },
    { icon: CreditCard, label: 'Pending Payments', value: stats.pendingPayments, color: 'text-gold', bg: 'gradient-gold' },
    { icon: AlertTriangle, label: 'Expiring Passports', value: stats.expiringPassports, color: 'text-orange-500', bg: 'bg-orange-500' },
  ];

  const tierBadge = (type: string) => {
    if (type === 'gold') return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px]">Gold</Badge>;
    if (type === 'premium') return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Premium</Badge>;
    return <Badge className="bg-muted text-muted-foreground text-[10px]">Free</Badge>;
  };

  return (
    <AdminLayout title="Admin Dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label} className="shadow-card">
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center mx-auto mb-2`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fund Balance Card */}
      <Card className="shadow-card mb-6 border-primary/20">
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <Banknote className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Community Fund Balance</p>
                <p className={`text-2xl font-bold ${stats.fundBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>{VND(stats.fundBalance)}</p>
              </div>
            </div>
            <div className="flex gap-8 flex-wrap">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Income</p>
                  <p className="font-semibold text-primary text-sm">{VND(stats.fundIncome)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Expenses</p>
                  <p className="font-semibold text-destructive text-sm">{VND(stats.fundExpense)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Card */}
      <Card className="shadow-card mb-6">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <Banknote className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Total Membership Revenue (VND)</p>
            <p className="text-3xl font-bold text-foreground">{VND(stats.totalRevenue)}</p>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Premium</p>
              <p className="font-semibold text-foreground">{VND(revenueData[0]?.revenue || 0)}</p>
              <p className="text-xs text-muted-foreground">{revenueData[0]?.count || 0} members</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Gold</p>
              <p className="font-semibold text-foreground">{VND(revenueData[1]?.revenue || 0)}</p>
              <p className="text-xs text-muted-foreground">{revenueData[1]?.count || 0} members</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Occupation Pie Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Members by Occupation</CardTitle>
          </CardHeader>
          <CardContent>
            {occupationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={occupationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {occupationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Bar Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Revenue by Membership Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.some(d => d.revenue > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueData}>
                  <XAxis dataKey="plan" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v / 1_000_000).toFixed(1) + 'M'} />
                  <Tooltip formatter={(v: number) => VND(v)} />
                  <Bar dataKey="revenue" name="Revenue (VND)" radius={[4,4,0,0]}>
                    <Cell fill="#008751" />
                    <Cell fill="#f59e0b" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No revenue data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Marital Status Pie Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Members by Marital Status</CardTitle>
          </CardHeader>
          <CardContent>
            {maritalData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={maritalData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                    {maritalData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* City Bar Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Members by City in Vietnam</CardTitle>
          </CardHeader>
          <CardContent>
            {cityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cityData}>
                  <XAxis dataKey="city" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="members" fill="hsl(152, 100%, 26%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Members */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Recent Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No members yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-muted-foreground font-medium">Name</th>
                    <th className="pb-2 text-muted-foreground font-medium">Email</th>
                    <th className="pb-2 text-muted-foreground font-medium">Tier</th>
                    <th className="pb-2 text-muted-foreground font-medium">Status</th>
                    <th className="pb-2 text-muted-foreground font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMembers.map((m, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 font-medium text-foreground">{m.first_name} {m.last_name}</td>
                      <td className="py-2.5 text-muted-foreground">{m.email}</td>
                      <td className="py-2.5">{tierBadge(m.membership_type)}</td>
                      <td className="py-2.5">
                        <Badge className={m.membership_status === 'active' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-gold/20 text-gold border-gold/30'}>
                          {m.membership_status}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
