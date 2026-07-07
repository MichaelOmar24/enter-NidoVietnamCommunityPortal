import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Edit, Trash2, Heart, Eye, EyeOff, CheckCircle,
  Clock, XCircle, Banknote, QrCode, Users, Send, Upload, ImageIcon, X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const VND = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

interface Campaign {
  id: string;
  title: string;
  beneficiary_name: string;
  description: string;
  story?: string;
  images: string[];
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  qr_code_url?: string;
  target_amount_vnd?: number;
  is_active: boolean;
  is_published: boolean;
  created_at: string;
}

interface Donation {
  id: string;
  campaign_id: string;
  donor_id: string;
  amount_vnd: number;
  payment_reference?: string;
  notes?: string;
  status: string;
  receipt_sent: boolean;
  created_at: string;
  profiles?: { first_name: string; last_name: string; email: string };
}

const EMPTY_CAMPAIGN = {
  title: '', beneficiary_name: '', description: '', story: '',
  bank_name: '', account_name: '', account_number: '', qr_code_url: '',
  target_amount_vnd: '', is_active: true, is_published: false,
  images: [] as string[],
};

export function AdminDonations() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donations, setDonations] = useState<Record<string, Donation[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_CAMPAIGN);
  const [saving, setSaving] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [sendingReceipt, setSendingReceipt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: camps } = await supabase.from('donation_campaigns').select('*').order('created_at', { ascending: false });
    const cs = (camps || []) as Campaign[];
    setCampaigns(cs);

    if (cs.length > 0) {
      const { data: allD } = await supabase
        .from('donations')
        .select('*, profiles!donations_donor_id_fkey(first_name, last_name, email)')
        .in('campaign_id', cs.map(c => c.id))
        .order('created_at', { ascending: false });
      const map: Record<string, Donation[]> = {};
      (allD || []).forEach((d: Donation) => {
        if (!map[d.campaign_id]) map[d.campaign_id] = [];
        map[d.campaign_id].push(d);
      });
      setDonations(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm(EMPTY_CAMPAIGN);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setForm({
      title: c.title, beneficiary_name: c.beneficiary_name,
      description: c.description, story: c.story || '',
      bank_name: c.bank_name || '', account_name: c.account_name || '',
      account_number: c.account_number || '', qr_code_url: c.qr_code_url || '',
      target_amount_vnd: c.target_amount_vnd ? String(c.target_amount_vnd) : '',
      is_active: c.is_active, is_published: c.is_published,
      images: c.images || [],
    });
    setEditingId(c.id);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title || !form.beneficiary_name || !form.description) {
      toast({ title: 'Fill all required fields', variant: 'destructive' }); return;
    }
    setSaving(true);
    const payload = {
      title: form.title, beneficiary_name: form.beneficiary_name,
      description: form.description, story: form.story || null,
      bank_name: form.bank_name || null, account_name: form.account_name || null,
      account_number: form.account_number || null, qr_code_url: form.qr_code_url || null,
      target_amount_vnd: form.target_amount_vnd ? parseFloat(form.target_amount_vnd) : null,
      is_active: form.is_active, is_published: form.is_published,
      images: form.images || [],
      created_by: profile?.id, updated_at: new Date().toISOString(),
    };
    if (editingId) {
      await supabase.from('donation_campaigns').update(payload).eq('id', editingId);
      toast({ title: 'Campaign updated' });
    } else {
      await supabase.from('donation_campaigns').insert(payload);
      toast({ title: 'Campaign created' });
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const togglePublish = async (c: Campaign) => {
    await supabase.from('donation_campaigns').update({ is_published: !c.is_published, is_active: !c.is_published ? true : c.is_active }).eq('id', c.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this campaign and all its donations?')) return;
    await supabase.from('donation_campaigns').delete().eq('id', id);
    load();
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingQR(true);
    const path = `donation-qr/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
      setForm(f => ({ ...f, qr_code_url: publicUrl }));
    }
    setUploadingQR(false);
  };

  const handleCampaignImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImage(true);
    const newUrls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `donation-campaigns/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
        newUrls.push(publicUrl);
      }
    }
    setForm(f => ({ ...f, images: [...(f.images || []), ...newUrls] }));
    setUploadingImage(false);
    e.target.value = '';
  };

  const removeCampaignImage = (idx: number) => {
    setForm(f => ({ ...f, images: (f.images || []).filter((_, i) => i !== idx) }));
  };

  const confirmDonation = async (d: Donation, campaign: Campaign) => {
    await supabase.from('donations').update({
      status: 'confirmed',
      confirmed_by: profile?.id,
      confirmed_at: new Date().toISOString(),
    }).eq('id', d.id);

    // Send receipt email
    setSendingReceipt(d.id);
    try {
      await supabase.functions.invoke('send-receipt', {
        body: {
          type: 'donation',
          to_email: d.profiles?.email,
          to_name: `${d.profiles?.first_name} ${d.profiles?.last_name}`,
          data: {
            donor_name: `${d.profiles?.first_name} ${d.profiles?.last_name}`,
            email: d.profiles?.email,
            campaign_title: campaign.title,
            beneficiary_name: campaign.beneficiary_name,
            amount: String(d.amount_vnd),
            payment_reference: d.payment_reference || '',
          },
        },
      });
      await supabase.from('donations').update({ receipt_sent: true }).eq('id', d.id);
      toast({ title: 'Donation confirmed & receipt sent!', description: `Email sent to ${d.profiles?.email}` });
    } catch {
      toast({ title: 'Donation confirmed', description: 'Email receipt failed to send', variant: 'destructive' });
    }
    setSendingReceipt(null);

    // Auto-close campaign if target is reached
    if (campaign.target_amount_vnd) {
      const newTotal = totalRaised(campaign.id) + Number(d.amount_vnd);
      if (newTotal >= campaign.target_amount_vnd && campaign.is_active) {
        await supabase.from('donation_campaigns').update({ is_active: false }).eq('id', campaign.id);
        toast({ title: 'Target achieved!', description: `${campaign.title} has been automatically closed.` });
      }
    }

    load();
  };

  const rejectDonation = async (id: string) => {
    await supabase.from('donations').update({ status: 'rejected' }).eq('id', id);
    toast({ title: 'Donation rejected' });
    load();
  };

  const toggleActive = async (c: Campaign) => {
    await supabase.from('donation_campaigns').update({ is_active: !c.is_active }).eq('id', c.id);
    toast({ title: c.is_active ? 'Campaign closed' : 'Campaign reopened' });
    load();
  };

  const totalRaised = (id: string) => (donations[id] || []).filter(d => d.status === 'confirmed').reduce((s, d) => s + Number(d.amount_vnd), 0);
  const pendingCount = (id: string) => (donations[id] || []).filter(d => d.status === 'pending').length;

  return (
    <AdminLayout title="Donation Campaigns">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Campaigns', value: campaigns.length },
          { label: 'Total Raised', value: VND(Object.values(donations).flat().filter(d => d.status === 'confirmed').reduce((s, d) => s + Number(d.amount_vnd), 0)) },
          { label: 'Pending Confirmations', value: Object.values(donations).flat().filter(d => d.status === 'pending').length },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-5">
        <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Card key={i} className="animate-pulse h-40" />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Heart className="h-16 w-16 mx-auto mb-3 opacity-30" />
          <p>No donation campaigns yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {campaigns.map(c => (
            <Card key={c.id} className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div>
                    <h3 className="font-bold text-foreground text-base">{c.title}</h3>
                    <p className="text-sm text-muted-foreground">Beneficiary: {c.beneficiary_name}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={c.is_published ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted text-muted-foreground'}>
                      {c.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    <Badge className={c.is_active ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-300/40' : 'bg-muted text-muted-foreground'}>
                      {c.is_active ? 'Active' : 'Closed'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                  <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Raised</p>
                    <p className="font-bold text-primary">{VND(totalRaised(c.id))}</p>
                    {c.target_amount_vnd && <p className="text-[10px] text-muted-foreground">of {VND(c.target_amount_vnd)}</p>}
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Donors</p>
                    <p className="font-bold text-foreground">{(donations[c.id] || []).filter(d => d.status === 'confirmed').length}</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 border border-amber-400/20 p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="font-bold text-amber-600">{pendingCount(c.id)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                {c.target_amount_vnd && (() => {
                  const pct = Math.min(100, (totalRaised(c.id) / c.target_amount_vnd) * 100);
                  const achieved = pct >= 100;
                  return (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className={achieved ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                          {achieved ? 'Target achieved!' : `${pct.toFixed(0)}% of goal`}
                        </span>
                        <span className="text-muted-foreground">{VND(c.target_amount_vnd)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${achieved ? 'bg-primary' : 'gradient-primary'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-2 flex-wrap mb-4">
                  <Button size="sm" variant="outline" onClick={() => togglePublish(c)} className={`gap-1 text-xs ${c.is_published ? 'text-muted-foreground' : 'text-primary border-primary hover:bg-primary/10'}`}>
                    {c.is_published ? <><EyeOff className="h-3 w-3" /> Unpublish</> : <><Eye className="h-3 w-3" /> Publish</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(c)} className={`gap-1 text-xs ${c.is_active ? 'text-destructive border-destructive hover:bg-destructive/10' : 'text-primary border-primary hover:bg-primary/10'}`}>
                    {c.is_active ? 'Close Campaign' : 'Reopen Campaign'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)} className="gap-1 text-xs">
                    <Edit className="h-3 w-3" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedCampaign(selectedCampaign?.id === c.id ? null : c)} className="gap-1 text-xs text-primary border-primary hover:bg-primary/10">
                    <Users className="h-3 w-3" /> {selectedCampaign?.id === c.id ? 'Hide Donations' : 'Manage Donations'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(c.id)} className="gap-1 text-xs text-destructive border-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>

                {/* Donations Panel */}
                {selectedCampaign?.id === c.id && (
                  <div className="border-t border-border pt-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground mb-3">Donations</p>
                    {(donations[c.id] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No donations logged yet.</p>
                    ) : (donations[c.id] || []).map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{d.profiles?.first_name} {d.profiles?.last_name}</p>
                          <p className="text-xs text-muted-foreground">{d.profiles?.email} · {format(parseISO(d.created_at), 'dd MMM yyyy')}</p>
                          {d.payment_reference && <p className="text-xs text-muted-foreground">Ref: {d.payment_reference}</p>}
                        </div>
                        <p className="font-bold text-primary">{VND(Number(d.amount_vnd))}</p>
                        <Badge className={`text-[10px] border ${d.status === 'confirmed' ? 'bg-primary/10 text-primary border-primary/30' : d.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-gold/10 text-gold border-gold/30'}`}>
                          {d.status === 'confirmed' ? <CheckCircle className="h-2.5 w-2.5 mr-1 inline" /> : d.status === 'rejected' ? <XCircle className="h-2.5 w-2.5 mr-1 inline" /> : <Clock className="h-2.5 w-2.5 mr-1 inline" />}
                          {d.status}
                        </Badge>
                        {d.receipt_sent && <Badge className="text-[10px] bg-green-500/10 text-green-700 border-green-300/40">Receipt sent</Badge>}
                        {d.status === 'pending' && (
                          <div className="flex gap-1.5">
                            <Button size="sm" onClick={() => confirmDonation(d, c)} disabled={sendingReceipt === d.id} className="gradient-primary text-primary-foreground h-7 text-xs gap-1">
                              <Send className="h-3 w-3" /> {sendingReceipt === d.id ? 'Sending...' : 'Confirm & Receipt'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => rejectDonation(d.id)} className="h-7 text-xs text-destructive border-destructive hover:bg-destructive/10">Reject</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Campaign Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              {editingId ? 'Edit Campaign' : 'New Donation Campaign'}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="info">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="info" className="flex-1">Beneficiary Info</TabsTrigger>
              <TabsTrigger value="payment" className="flex-1">Payment Details</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Campaign Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Medical Support for John Doe" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Beneficiary Name *</Label>
                <Input value={form.beneficiary_name} onChange={e => setForm(f => ({ ...f, beneficiary_name: e.target.value }))} placeholder="Full name of person in need" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Short Description *</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="text-sm" placeholder="Brief summary shown in campaign card..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Full Story</Label>
                <Textarea value={form.story} onChange={e => setForm(f => ({ ...f, story: e.target.value }))} rows={4} className="text-sm" placeholder="Full details of the situation, medical reports, circumstances..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Target Amount (VND, optional)</Label>
                <Input type="number" value={form.target_amount_vnd} onChange={e => setForm(f => ({ ...f, target_amount_vnd: e.target.value }))} placeholder="e.g. 10000000" className="h-9 text-sm" />
              </div>

              {/* Campaign Images Upload */}
              <div className="space-y-2">
                <Label className="text-sm">Campaign Images</Label>
                {(form.images || []).length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {(form.images || []).map((url, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-video">
                        <img src={url} alt={`Campaign image ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeCampaignImage(i)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="cursor-pointer block">
                  <div className={`flex items-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-sm text-muted-foreground text-center justify-center ${uploadingImage ? 'opacity-60 pointer-events-none' : ''}`}>
                    {uploadingImage ? (
                      <><div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Uploading...</>
                    ) : (
                      <><ImageIcon className="h-4 w-4 text-primary" /> {(form.images || []).length > 0 ? 'Add more images' : 'Upload campaign images'} (multiple allowed)</>
                    )}
                  </div>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleCampaignImageUpload} disabled={uploadingImage} />
                </label>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} />
                  Publish (visible to members)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  Active (accepting donations)
                </label>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Bank Name</Label>
                  <Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="e.g. Vietcombank" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Account Number</Label>
                  <Input value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} placeholder="e.g. 0123456789" className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Account Name</Label>
                <Input value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} placeholder="e.g. NGUYEN VAN A" className="h-9 text-sm" />
              </div>

              {/* QR Code Upload */}
              <div className="space-y-2">
                <Label className="text-sm">Payment QR Code</Label>
                {form.qr_code_url && (
                  <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border border-border">
                    <img src={form.qr_code_url} alt="QR" className="w-16 h-16 object-contain rounded border border-border bg-white" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">QR code uploaded</p>
                      <button onClick={() => setForm(f => ({ ...f, qr_code_url: '' }))} className="text-xs text-destructive hover:underline">Remove</button>
                    </div>
                  </div>
                )}
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => document.getElementById('qr-upload')?.click()}>
                  {uploadingQR
                    ? <p className="text-sm text-muted-foreground">Uploading...</p>
                    : <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <QrCode className="h-5 w-5" />
                        <p className="text-xs">{form.qr_code_url ? 'Replace QR code' : 'Upload QR code image'}</p>
                      </div>
                  }
                </div>
                <input id="qr-upload" type="file" accept="image/*" className="hidden" onChange={handleQRUpload} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-3 border-t border-border mt-2">
            <Button onClick={save} disabled={saving} className="flex-1 gradient-primary text-primary-foreground">
              {saving ? 'Saving...' : editingId ? 'Update Campaign' : 'Create Campaign'}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
