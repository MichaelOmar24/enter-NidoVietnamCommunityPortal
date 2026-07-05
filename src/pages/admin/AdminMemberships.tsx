import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  Clock, CheckCircle, XCircle, Users, Crown, Shield,
  Banknote, Settings, RefreshCw, Search, ChevronDown, Upload, QrCode
} from 'lucide-react';

const VND = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

interface MembershipRecord {
  id: string;
  user_id: string;
  plan_type: string;
  amount: number;
  currency: string;
  payment_status: string;
  payment_reference: string;
  notes: string;
  approved_at: string;
  created_at: string;
  profiles?: { first_name: string; last_name: string; email: string; phone: string };
}

interface PaymentSettings {
  id?: string;
  qr_code_url?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  bank_branch?: string;
  transfer_instructions?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-gold/20 text-gold border-gold/30', icon: Clock },
  approved: { label: 'Approved', color: 'bg-primary/20 text-primary border-primary/30', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-primary/20 text-primary border-primary/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-destructive/20 text-destructive border-destructive/30', icon: XCircle },
  failed: { label: 'Failed', color: 'bg-destructive/20 text-destructive border-destructive/30', icon: XCircle },
};

const PLAN_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  free: { label: 'Free', color: 'bg-muted text-muted-foreground border-border', icon: Users },
  premium: { label: 'Premium', color: 'bg-primary/20 text-primary border-primary/30', icon: Shield },
  gold: { label: 'Gold', color: 'bg-amber-500/20 text-amber-600 border-amber-500/30', icon: Crown },
};

export function AdminMemberships() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<MembershipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [selected, setSelected] = useState<MembershipRecord | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [acting, setActing] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [stats, setStats] = useState({ pending: 0, premium: 0, gold: 0, totalRevenue: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('memberships')
      .select('*, profiles(first_name, last_name, email, phone)')
      .order('created_at', { ascending: false });
    const rows = (data || []) as MembershipRecord[];
    setRecords(rows);

    // Stats
    const pending = rows.filter(r => r.payment_status === 'pending').length;
    const premium = rows.filter(r => r.plan_type === 'premium' && ['approved','completed'].includes(r.payment_status)).length;
    const gold = rows.filter(r => r.plan_type === 'gold' && ['approved','completed'].includes(r.payment_status)).length;
    const totalRevenue = rows
      .filter(r => ['approved','completed'].includes(r.payment_status) && r.currency === 'VND')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    setStats({ pending, premium, gold, totalRevenue });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from('payment_settings').select('*').maybeSingle().then(({ data }) => {
      if (data) setSettings(data as PaymentSettings);
    });
  }, [load]);

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!selected || !profile) return;
    setActing(true);
    await supabase.from('memberships').update({
      payment_status: status,
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      notes: actionNote || null,
    }).eq('id', selected.id);

    // Update profile membership_type and status on approval
    if (status === 'approved') {
      await supabase.from('profiles').update({
        membership_type: selected.plan_type,
        membership_status: 'active',
      }).eq('id', selected.user_id);
    }

    setActing(false);
    setSelected(null);
    setActionNote('');
    load();
  };

  const handleSaveSettings = async (overrideSettings?: PaymentSettings) => {
    setSavingSettings(true);
    const toSave = overrideSettings || settings;
    if (toSave.id) {
      await supabase.from('payment_settings').update({ ...toSave, updated_at: new Date().toISOString(), updated_by: profile?.id }).eq('id', toSave.id);
    } else {
      const { data } = await supabase.from('payment_settings').insert({ ...toSave, updated_by: profile?.id }).select().maybeSingle();
      if (data) setSettings(data as PaymentSettings);
    }
    setSavingSettings(false);
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQR(true);
    setUploadError('');
    const ext = file.name.split('.').pop();
    const path = `qr-codes/payment-qr-${Date.now()}.${ext}`;
    const { error, data: uploadData } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
    if (error || !uploadData) {
      setUploadError(`Upload failed: ${error?.message || 'Unknown error'}`);
      setUploadingQR(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
    const updated = { ...settings, qr_code_url: publicUrl };
    setSettings(updated);
    // Auto-save immediately so QR persists
    await handleSaveSettings(updated);
    setUploadingQR(false);
  };

  const filtered = records.filter(r => {
    const name = `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''} ${r.profiles?.email || ''} ${r.payment_reference || ''}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.payment_status === filterStatus;
    const matchPlan = filterPlan === 'all' || r.plan_type === filterPlan;
    return matchSearch && matchStatus && matchPlan;
  });

  const pending = filtered.filter(r => r.payment_status === 'pending');
  const nonPending = filtered.filter(r => r.payment_status !== 'pending');

  return (
    <AdminLayout title="Membership Payments">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Clock, label: 'Pending Payments', value: stats.pending, color: 'text-gold', bg: 'bg-gold/20' },
          { icon: Shield, label: 'Premium Members', value: stats.premium, color: 'text-primary', bg: 'bg-primary/20' },
          { icon: Crown, label: 'Gold Stakeholders', value: stats.gold, color: 'text-amber-600', bg: 'bg-amber-500/20' },
          { icon: Banknote, label: 'Total Revenue', value: VND(stats.totalRevenue), color: 'text-primary', bg: 'gradient-primary', wide: true },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label} className="shadow-card">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`h-4.5 w-4.5 ${color}`} />
              </div>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-5">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-3.5 w-3.5" /> Pending
            {stats.pending > 0 && (
              <Badge className="ml-1 bg-gold/20 text-gold border-gold/30 text-[10px] px-1.5">{stats.pending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2"><Users className="h-3.5 w-3.5" /> All Records</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-3.5 w-3.5" /> Payment Settings</TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending">
          <Card className="shadow-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Pending Payment Approvals</CardTitle>
              <Button size="sm" variant="ghost" onClick={load} className="gap-1.5 text-muted-foreground h-8">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
              ) : pending.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="h-10 w-10 text-primary/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No pending payments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map(r => <PaymentRow key={r.id} record={r} onReview={setSelected} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Records Tab */}
        <TabsContent value="all">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search name, email, reference..." className="pl-9 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="text-xs h-8 px-2 rounded-md border border-border bg-background text-foreground" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select className="text-xs h-8 px-2 rounded-md border border-border bg-background text-foreground" value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
                  <option value="all">All Plans</option>
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                  <option value="gold">Gold</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
              ) : nonPending.length === 0 && pending.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No records found</p>
              ) : (
                <div className="space-y-3">
                  {filtered.map(r => <PaymentRow key={r.id} record={r} onReview={setSelected} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" /> Bank Transfer Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              {/* QR Upload */}
              <div>
                <Label className="text-sm mb-2 block">Bank QR Code</Label>
                {settings.qr_code_url ? (
                  <div className="mb-3">
                    <p className="text-xs text-primary mb-1.5 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> QR code saved
                    </p>
                    <img
                      src={settings.qr_code_url}
                      alt="Bank QR Code"
                      className="w-40 h-40 object-contain rounded-xl border border-border bg-white p-2"
                      crossOrigin="anonymous"
                      onError={() => setUploadError('QR image failed to load — URL may be broken')}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-2">No QR code uploaded yet</p>
                )}

                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-primary/5 transition-smooth text-sm text-foreground ${uploadingQR ? 'opacity-60' : ''}`}>
                    <Upload className="h-4 w-4 text-primary" />
                    {uploadingQR ? 'Uploading & Saving...' : settings.qr_code_url ? 'Replace QR Code Image' : 'Upload QR Code Image'}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleQRUpload} disabled={uploadingQR} />
                </label>

                {uploadError && (
                  <p className="text-xs text-destructive mt-1">{uploadError}</p>
                )}

                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">Or paste QR image URL directly</Label>
                  <Input
                    className="text-xs"
                    placeholder="https://..."
                    value={settings.qr_code_url || ''}
                    onChange={e => setSettings(s => ({ ...s, qr_code_url: e.target.value }))}
                  />
                </div>
              </div>

              {[
                { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. Vietcombank' },
                { key: 'account_name', label: 'Account Name', placeholder: 'e.g. NIDO Vietnam' },
                { key: 'account_number', label: 'Account Number', placeholder: 'e.g. 1234567890' },
                { key: 'bank_branch', label: 'Branch', placeholder: 'e.g. Hanoi Branch' },
              ].map(field => (
                <div key={field.key}>
                  <Label className="text-sm mb-1.5 block">{field.label}</Label>
                  <Input
                    placeholder={field.placeholder}
                    value={(settings as Record<string, string>)[field.key] || ''}
                    onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                  />
                </div>
              ))}

              <div>
                <Label className="text-sm mb-1.5 block">Transfer Instructions</Label>
                <Textarea
                  rows={3}
                  value={settings.transfer_instructions || ''}
                  onChange={e => setSettings(s => ({ ...s, transfer_instructions: e.target.value }))}
                />
              </div>

              <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={open => { if (!open) { setSelected(null); setActionNote(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Payment</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member</span>
                  <span className="font-semibold text-foreground">{selected.profiles?.first_name} {selected.profiles?.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-foreground">{selected.profiles?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <PlanBadge plan={selected.plan_type} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-foreground">{VND(Number(selected.amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-medium text-foreground text-right max-w-[180px]">{selected.payment_reference || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="text-foreground">{new Date(selected.created_at).toLocaleDateString()}</span>
                </div>
                {selected.notes && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground">Member Note: </span>
                    <span className="text-foreground">{selected.notes}</span>
                  </div>
                )}
              </div>

              {selected.payment_status === 'pending' && (
                <>
                  <div>
                    <Label className="text-sm mb-1.5 block">Admin Note (optional)</Label>
                    <Textarea rows={2} placeholder="Add a note for the member..." value={actionNote} onChange={e => setActionNote(e.target.value)} />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 gradient-primary text-primary-foreground gap-2"
                      onClick={() => handleAction('approved')}
                      disabled={acting}
                    >
                      <CheckCircle className="h-4 w-4" /> {acting ? 'Processing...' : 'Approve'}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-destructive text-destructive hover:bg-destructive/10 gap-2"
                      onClick={() => handleAction('rejected')}
                      disabled={acting}
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </>
              )}
              {selected.payment_status !== 'pending' && (
                <div className="text-center">
                  <StatusBadge status={selected.payment_status} />
                  {selected.notes && <p className="text-xs text-muted-foreground mt-2">{selected.notes}</p>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function PaymentRow({ record, onReview }: { record: MembershipRecord; onReview: (r: MembershipRecord) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-smooth">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="font-semibold text-sm text-foreground">
            {record.profiles?.first_name} {record.profiles?.last_name}
          </p>
          <PlanBadge plan={record.plan_type} />
          <StatusBadge status={record.payment_status} />
        </div>
        <p className="text-xs text-muted-foreground">{record.profiles?.email} · Ref: {record.payment_reference || '—'}</p>
        <p className="text-xs text-muted-foreground">{new Date(record.created_at).toLocaleDateString()} · {record.currency === 'VND' ? (record.amount ? (Number(record.amount)).toLocaleString('vi-VN') + ' ₫' : '—') : record.amount}</p>
      </div>
      <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-primary border-primary hover:bg-primary/10 shrink-0" onClick={() => onReview(record)}>
        <ChevronDown className="h-3.5 w-3.5" /> Review
      </Button>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const cfg = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  const Icon = cfg.icon;
  return (
    <Badge className={`text-[10px] border gap-1 ${cfg.color}`}>
      <Icon className="h-2.5 w-2.5" /> {cfg.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <Badge className={`text-[10px] border gap-1 ${cfg.color}`}>
      <Icon className="h-2.5 w-2.5" /> {cfg.label}
    </Badge>
  );
}
