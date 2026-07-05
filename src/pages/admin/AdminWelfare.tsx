import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Heart, Home, AlertTriangle, Briefcase, Globe, Clock, CheckCircle, XCircle, RefreshCw, Eye, BarChart3, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const SUPPORT_TYPES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  medical: { label: 'Medical', icon: Heart, color: '#ef4444' },
  housing: { label: 'Housing', icon: Home, color: '#f59e0b' },
  accident: { label: 'Accident', icon: AlertTriangle, color: '#f97316' },
  employer_resolution: { label: 'Employer', icon: Briefcase, color: '#8b5cf6' },
  immigration: { label: 'Immigration', icon: Globe, color: '#3b82f6' },
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30' },
  { value: 'under_review', label: 'Under Review', icon: RefreshCw, color: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
  { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'bg-green-500/15 text-green-700 border-green-500/30' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'bg-red-500/15 text-red-700 border-red-500/30' },
];

const URGENCY_COLOR: Record<string, string> = {
  low: 'text-gray-500', normal: 'text-blue-500', high: 'text-orange-500', critical: 'text-red-600 font-bold',
};

interface WelfareRequest {
  id: string;
  user_id: string;
  support_type: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
  admin_notes?: string;
  reviewed_at?: string;
  created_at: string;
  profiles?: { first_name: string; last_name: string; email: string; vietnam_city?: string };
}

export function AdminWelfare() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<WelfareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<WelfareRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [filter, typeFilter]);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('welfare_requests')
      .select('*, profiles(first_name, last_name, email, vietnam_city)')
      .order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    if (typeFilter !== 'all') q = q.eq('support_type', typeFilter);
    const { data } = await q;
    setRequests((data || []) as WelfareRequest[]);
    setLoading(false);
  };

  const openRequest = (req: WelfareRequest) => {
    setSelected(req);
    setNotes(req.admin_notes || '');
    setNewStatus(req.status);
  };

  const saveReview = async () => {
    if (!selected) return;
    setSaving(true);
    await supabase.from('welfare_requests').update({
      status: newStatus,
      admin_notes: notes,
      reviewed_by: profile!.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id);
    toast({ title: 'Request updated', description: `Status changed to ${newStatus}` });
    setSaving(false);
    setSelected(null);
    load();
  };

  // Stats
  const stats = STATUS_OPTIONS.map(s => ({
    ...s,
    count: requests.filter(r => r.status === s.value).length,
  }));
  const typeStats = Object.entries(SUPPORT_TYPES).map(([k, v]) => ({
    ...v, key: k,
    count: requests.filter(r => r.support_type === k).length,
  }));

  return (
    <AdminLayout title="Welfare Management">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.value} className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setFilter(s.value)}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.count}</p>
            </div>
          );
        })}
      </div>

      {/* Type breakdown */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {typeStats.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTypeFilter(typeFilter === t.key ? 'all' : t.key)}
              className={`rounded-lg border p-3 text-center transition-all ${typeFilter === t.key ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/30'}`}>
              <Icon className="h-5 w-5 mx-auto mb-1" style={{ color: t.color }} />
              <p className="text-xs font-semibold text-foreground">{t.count}</p>
              <p className="text-[10px] text-muted-foreground">{t.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', ...STATUS_OPTIONS.map(s => s.value)].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
            {f === 'all' ? 'All Requests' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No welfare requests found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                {['Member', 'Type', 'Title', 'Urgency', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.map(req => {
                const typeInfo = SUPPORT_TYPES[req.support_type];
                const statusInfo = STATUS_OPTIONS.find(s => s.value === req.status)!;
                const TypeIcon = typeInfo?.icon || FileText;
                const StatusIcon = statusInfo?.icon || Clock;
                return (
                  <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-xs">{req.profiles?.first_name} {req.profiles?.last_name}</p>
                      <p className="text-muted-foreground text-[11px]">{req.profiles?.vietnam_city || req.profiles?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <TypeIcon className="h-3.5 w-3.5" style={{ color: typeInfo?.color }} />
                        <span className="text-xs text-foreground">{typeInfo?.label || req.support_type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-xs text-foreground truncate">{req.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs capitalize ${URGENCY_COLOR[req.urgency]}`}>{req.urgency}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[11px] ${statusInfo?.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />{statusInfo?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(parseISO(req.created_at), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => openRequest(req)}>
                        <Eye className="h-3 w-3" /> Review
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Dialog */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (SUPPORT_TYPES[selected.support_type]?.color || '#888') + '20' }}>
                {(() => { const Icon = SUPPORT_TYPES[selected.support_type]?.icon || FileText; return <Icon className="h-5 w-5" style={{ color: SUPPORT_TYPES[selected.support_type]?.color || '#888' }} />; })()}
              </div>
              <div>
                <p className="font-bold text-foreground">{selected.title}</p>
                <p className="text-xs text-muted-foreground">{selected.profiles?.first_name} {selected.profiles?.last_name} · {selected.profiles?.email}</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Request Details</p>
                <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg p-3">{selected.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><p className="text-muted-foreground">Type</p><p className="font-medium text-foreground capitalize">{selected.support_type.replace('_', ' ')}</p></div>
                <div><p className="text-muted-foreground">Urgency</p><p className={`font-medium capitalize ${URGENCY_COLOR[selected.urgency]}`}>{selected.urgency}</p></div>
                <div><p className="text-muted-foreground">Submitted</p><p className="font-medium text-foreground">{format(parseISO(selected.created_at), 'dd MMM yyyy')}</p></div>
                <div><p className="text-muted-foreground">City</p><p className="font-medium text-foreground">{selected.profiles?.vietnam_city || '—'}</p></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Update Status</p>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Admin Notes / Response</p>
                <Textarea placeholder="Add notes or response for the member..." value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[80px]" />
              </div>
              <div className="flex gap-3">
                <Button className="flex-1 gradient-primary text-primary-foreground" onClick={saveReview} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Review'}
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
