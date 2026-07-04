import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Building2, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { OCCUPATION_LABELS, MARITAL_STATUS_LABELS } from '@/lib/types';
import { differenceInDays, parseISO } from 'date-fns';

const COLORS = ['#008751', '#FFD700', '#DA251D', '#006B40', '#FF8C00', '#4169E1'];

export function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0, active: 0, pending: 0, companies: 0,
    expiringPassports: 0, expiredPassports: 0
  });
  const [occupationData, setOccupationData] = useState<{ name: string; value: number }[]>([]);
  const [maritalData, setMaritalData] = useState<{ name: string; value: number }[]>([]);
  const [cityData, setCityData] = useState<{ city: string; members: number }[]>([]);
  const [recentMembers, setRecentMembers] = useState<{ first_name: string; last_name: string; email: string; occupation_type: string; membership_status: string; created_at: string }[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [
      { count: total },
      { count: active },
      { count: pending },
      { count: companies },
      { data: profiles },
      { data: passports },
      { data: recent }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('membership_status', 'active'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('membership_status', 'pending'),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('occupation_type, marital_status, vietnam_city'),
      supabase.from('passports').select('expiry_date'),
      supabase.from('profiles').select('first_name, last_name, email, occupation_type, membership_status, created_at').order('created_at', { ascending: false }).limit(5),
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

    setStats({ total: total || 0, active: active || 0, pending: pending || 0, companies: companies || 0, expiringPassports: expiring, expiredPassports: expired });

    // Occupation breakdown
    const occMap: Record<string, number> = {};
    (profiles || []).forEach((p: { occupation_type: string | null; marital_status: string | null; vietnam_city: string | null }) => {
      if (p.occupation_type) occMap[p.occupation_type] = (occMap[p.occupation_type] || 0) + 1;
    });
    setOccupationData(Object.entries(occMap).map(([k, v]) => ({ name: OCCUPATION_LABELS[k as keyof typeof OCCUPATION_LABELS] || k, value: v })));

    // Marital status breakdown
    const marMap: Record<string, number> = {};
    (profiles || []).forEach((p2: { occupation_type: string | null; marital_status: string | null; vietnam_city: string | null }) => {
      if (p2.marital_status) marMap[p2.marital_status] = (marMap[p2.marital_status] || 0) + 1;
    });
    setMaritalData(Object.entries(marMap).map(([k, v]) => ({ name: MARITAL_STATUS_LABELS[k as keyof typeof MARITAL_STATUS_LABELS] || k, value: v })));

    // City breakdown
    const cityMap: Record<string, number> = {};
    (profiles || []).forEach((p3: { occupation_type: string | null; marital_status: string | null; vietnam_city: string | null }) => {
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
    { icon: AlertTriangle, label: 'Expiring Passports', value: stats.expiringPassports, color: 'text-orange-500', bg: 'bg-orange-500' },
    { icon: AlertTriangle, label: 'Expired Passports', value: stats.expiredPassports, color: 'text-destructive', bg: 'bg-destructive' },
  ];

  return (
    <AdminLayout title="Admin Dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
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
        <Card className="shadow-card lg:col-span-2">
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
                    <th className="pb-2 text-muted-foreground font-medium">Occupation</th>
                    <th className="pb-2 text-muted-foreground font-medium">Status</th>
                    <th className="pb-2 text-muted-foreground font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMembers.map((m, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 font-medium text-foreground">{m.first_name} {m.last_name}</td>
                      <td className="py-2.5 text-muted-foreground">{m.email}</td>
                      <td className="py-2.5 text-muted-foreground capitalize">{m.occupation_type?.replace(/_/g, ' ') || '-'}</td>
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
