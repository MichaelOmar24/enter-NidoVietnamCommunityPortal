import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Heart, Home, AlertTriangle, Briefcase, Globe,
  Plus, Clock, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const SUPPORT_TYPES = [
  { value: 'medical', label: 'Medical Support', icon: Heart, color: '#ef4444', desc: 'Health emergencies, hospital bills, medical treatment assistance' },
  { value: 'housing', label: 'Housing Support', icon: Home, color: '#f59e0b', desc: 'Accommodation issues, eviction, emergency housing needs' },
  { value: 'accident', label: 'Accident Support', icon: AlertTriangle, color: '#f97316', desc: 'Road accidents, workplace accidents, injury compensation' },
  { value: 'employer_resolution', label: 'Employer Resolution', icon: Briefcase, color: '#8b5cf6', desc: 'Workplace disputes, unfair dismissal, wage theft, harassment' },
  { value: 'immigration', label: 'Immigration Support', icon: Globe, color: '#3b82f6', desc: 'Visa issues, permit renewals, deportation threats, legal advice' },
];

const URGENCY_LEVELS = [
  { value: 'low', label: 'Low', color: 'text-gray-500' },
  { value: 'normal', label: 'Normal', color: 'text-blue-500' },
  { value: 'high', label: 'High', color: 'text-orange-500' },
  { value: 'critical', label: 'Critical', color: 'text-red-500' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Review', color: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-blue-500/15 text-blue-700 border-blue-500/30', icon: RefreshCw },
  approved: { label: 'Approved', color: 'bg-green-500/15 text-green-700 border-green-500/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500/15 text-red-700 border-red-500/30', icon: XCircle },
};

interface WelfareRequest {
  id: string;
  support_type: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
  admin_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export function WelfarePage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<WelfareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    support_type: '', title: '', description: '', urgency: 'normal',
  });

  useEffect(() => { if (profile) loadRequests(); }, [profile]);

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('welfare_requests')
      .select('*')
      .eq('user_id', profile!.id)
      .order('created_at', { ascending: false });
    setRequests((data || []) as WelfareRequest[]);
    setLoading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.support_type || !form.title || !form.description) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('welfare_requests').insert({
      user_id: profile!.id,
      support_type: form.support_type,
      title: form.title,
      description: form.description,
      urgency: form.urgency,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Request submitted', description: 'Your support request has been submitted and is pending review.' });
      setForm({ support_type: '', title: '', description: '', urgency: 'normal' });
      setShowForm(false);
      loadRequests();
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pt-[104px] pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Welfare Support</h1>
            <p className="text-muted-foreground mt-2">NIDO Vietnam provides support to members in need. All requests are reviewed by our welfare committee.</p>
          </div>

          {/* Membership status check */}
          {profile.membership_status !== 'active' && (
            <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-700 text-sm">Membership Required</p>
                <p className="text-xs text-yellow-600/80 mt-0.5">Only active NIDO members can submit welfare support requests. Your membership status is currently <strong>{profile.membership_status}</strong>.</p>
              </div>
            </div>
          )}

          {/* Support Type Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {SUPPORT_TYPES.map(({ value, label, icon: Icon, color, desc }) => (
              <button
                key={value}
                onClick={() => { if (profile.membership_status === 'active') { setForm(f => ({ ...f, support_type: value })); setShowForm(true); } }}
                disabled={profile.membership_status !== 'active'}
                className="text-left p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: color + '20' }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <p className="font-semibold text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </button>
            ))}
          </div>

          {/* Request Form */}
          {showForm && profile.membership_status === 'active' && (
            <div className="rounded-xl border border-border bg-card p-6 mb-8 shadow-card">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-foreground">New Support Request</h2>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label>Support Type *</Label>
                  <Select value={form.support_type} onValueChange={v => setForm(f => ({ ...f, support_type: v }))}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select support type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Urgency Level</Label>
                  <Select value={form.urgency} onValueChange={v => setForm(f => ({ ...f, urgency: v }))}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {URGENCY_LEVELS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title / Subject *</Label>
                  <Input className="mt-1.5" placeholder="Brief title of your request" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea className="mt-1.5 min-h-[120px]" placeholder="Provide as much detail as possible about your situation, what support you need, and any relevant dates or contacts..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="gradient-primary text-primary-foreground" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </div>
          )}

          {/* My Requests */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">My Requests</h2>
              {profile.membership_status === 'active' && (
                <Button size="sm" className="gradient-primary text-primary-foreground gap-2" onClick={() => setShowForm(!showForm)}>
                  <Plus className="h-4 w-4" /> New Request
                </Button>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />)}
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-10 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No support requests yet</p>
                {profile.membership_status === 'active' && (
                  <Button size="sm" className="mt-4 gradient-primary text-primary-foreground" onClick={() => setShowForm(true)}>
                    Submit Your First Request
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(req => {
                  const typeInfo = SUPPORT_TYPES.find(t => t.value === req.support_type);
                  const statusInfo = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusInfo.icon;
                  const TypeIcon = typeInfo?.icon || FileText;
                  const isExpanded = expandedId === req.id;
                  return (
                    <div key={req.id} className="rounded-xl border border-border bg-card overflow-hidden">
                      <button className="w-full text-left p-4 hover:bg-muted/20 transition-colors" onClick={() => setExpandedId(isExpanded ? null : req.id)}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (typeInfo?.color || '#888') + '20' }}>
                            <TypeIcon className="h-4 w-4" style={{ color: typeInfo?.color || '#888' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-foreground">{req.title}</p>
                              <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />{statusInfo.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{typeInfo?.label} · {format(parseISO(req.created_at), 'dd MMM yyyy')}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                          <p className="text-sm text-foreground leading-relaxed">{req.description}</p>
                          {req.admin_notes && (
                            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                              <p className="text-xs font-semibold text-primary mb-1">Admin Response</p>
                              <p className="text-sm text-foreground">{req.admin_notes}</p>
                              {req.reviewed_at && <p className="text-xs text-muted-foreground mt-1">{format(parseISO(req.reviewed_at), 'dd MMM yyyy')}</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
