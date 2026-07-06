import { useState, useEffect } from 'react';
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
import { Company, CompanyPrivateInfo, CompanyFeeConfig } from '@/lib/types';
import {
  Plus, Check, X, Edit, Trash2, Building2, Upload, ImageIcon,
  FileText, ShieldCheck, AlertCircle, TrendingUp, Banknote, Settings,
  CreditCard, CalendarCheck, Clock, CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { format, addYears, parseISO, isAfter } from 'date-fns';

const EMPTY: Partial<Company> = {
  company_name: '', description: '', business_type: '', industry: '',
  address_in_vietnam: '', website: '', phone: '', email: '', logo_url: '', is_approved: false,
};

const EMPTY_PRIVATE: CompanyPrivateInfo = {
  company_id: '',
  registration_number: '',
  tax_code: '',
  annual_revenue_vnd: null,
  monthly_revenue_vnd: null,
  trade_volume_notes: '',
  registration_doc_url: '',
  tax_code_doc_url: '',
  is_verified: false,
};

const fmtVND = (n: number | null | undefined) =>
  n ? n >= 1_000_000_000
    ? `${(n / 1_000_000_000).toFixed(1)}B ₫`
    : n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(0)}M ₫`
    : n.toLocaleString('vi-VN') + ' ₫'
  : '—';

function feeStatusInfo(priv?: CompanyPrivateInfo): { label: string; color: string; icon: React.ReactNode } {
  const status = priv?.listing_fee_status;
  if (status === 'paid' && priv?.listing_fee_valid_until) {
    const expired = !isAfter(parseISO(priv.listing_fee_valid_until), new Date());
    if (expired) return { label: 'Expired', color: 'bg-destructive/10 text-destructive border-destructive/30', icon: <Clock className="h-2.5 w-2.5" /> };
    return { label: 'Paid', color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-300/40', icon: <CheckCircle2 className="h-2.5 w-2.5" /> };
  }
  return { label: 'Unpaid', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300/40', icon: <AlertCircle className="h-2.5 w-2.5" /> };
}

export function AdminCompanies() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [privateMap, setPrivateMap] = useState<Record<string, CompanyPrivateInfo>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<Company>>(EMPTY);
  const [privateForm, setPrivateForm] = useState<CompanyPrivateInfo>(EMPTY_PRIVATE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [regDocFile, setRegDocFile] = useState<File | null>(null);
  const [taxDocFile, setTaxDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fee config state
  const [feeConfig, setFeeConfig] = useState<CompanyFeeConfig | null>(null);
  const [editingFee, setEditingFee] = useState(false);
  const [feeInput, setFeeInput] = useState('');
  const [savingFee, setSavingFee] = useState(false);
  const [listingIncome, setListingIncome] = useState(0);
  const [listingPaidCount, setListingPaidCount] = useState(0);

  // Payment dialog
  const [payDialog, setPayDialog] = useState<{ open: boolean; company: Company | null }>({ open: false, company: null });
  const [recordingPayment, setRecordingPayment] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: cos }, { data: privs }, { data: feeRows }, { data: txns }] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('company_private_info').select('*'),
      supabase.from('company_fee_config').select('*').limit(1),
      supabase.from('fund_transactions').select('amount').eq('category', 'company_listing').eq('transaction_type', 'income'),
    ]);
    setCompanies((cos || []) as Company[]);
    const map: Record<string, CompanyPrivateInfo> = {};
    (privs || []).forEach((p: CompanyPrivateInfo) => { if (p.company_id) map[p.company_id] = p; });
    setPrivateMap(map);

    if (feeRows && feeRows.length > 0) setFeeConfig(feeRows[0] as CompanyFeeConfig);
    const income = (txns || []).reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
    setListingIncome(income);

    // Count paid (non-expired) companies
    const paid = Object.values(map).filter(p => {
      if (p.listing_fee_status !== 'paid' || !p.listing_fee_valid_until) return false;
      return isAfter(parseISO(p.listing_fee_valid_until), new Date());
    }).length;
    setListingPaidCount(paid);

    setLoading(false);
  };

  const set = (k: keyof Company, v: string | boolean | null) => setForm(f => ({ ...f, [k]: v }));
  const setPriv = (k: keyof CompanyPrivateInfo, v: string | boolean | number | null) =>
    setPrivateForm(f => ({ ...f, [k]: v }));

  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = e => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  const uploadDoc = async (file: File, companyId: string, docType: 'registration' | 'tax_code') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('companyId', companyId);
    fd.append('docType', docType);
    const { data, error } = await supabase.functions.invoke('upload-company-doc', { body: fd });
    if (error || !data?.url) {
      toast({ title: `Document upload failed (${docType})`, variant: 'destructive' });
      return null;
    }
    return data.url as string;
  };

  const save = async () => {
    if (!form.company_name) return;
    setUploading(true);

    let logo_url = form.logo_url;
    if (logoFile) {
      const fd = new FormData();
      fd.append('file', logoFile);
      fd.append('companyId', editingId || `new_${Date.now()}`);
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('upload-company-logo', { body: fd });
      if (!fnErr && fnData?.url) {
        logo_url = fnData.url;
      } else {
        toast({ title: 'Logo upload failed', variant: 'destructive' });
        setUploading(false);
        return;
      }
    }

    let companyId = editingId;
    if (editingId) {
      await supabase.from('companies').update({ ...form, logo_url }).eq('id', editingId);
      toast({ title: 'Company updated' });
    } else {
      const { data: ins } = await supabase
        .from('companies')
        .insert({ ...form, logo_url } as Omit<Company, 'id' | 'created_at' | 'updated_at'>)
        .select('id')
        .single();
      companyId = ins?.id || null;
      toast({ title: 'Company added' });
    }

    if (companyId) {
      let privUpdated = { ...privateForm };
      if (regDocFile) {
        const url = await uploadDoc(regDocFile, companyId, 'registration');
        if (url) privUpdated = { ...privUpdated, registration_doc_url: url };
      }
      if (taxDocFile) {
        const url = await uploadDoc(taxDocFile, companyId, 'tax_code');
        if (url) privUpdated = { ...privUpdated, tax_code_doc_url: url };
      }

      const payload = {
        company_id: companyId,
        registration_number: privUpdated.registration_number || null,
        tax_code: privUpdated.tax_code || null,
        annual_revenue_vnd: privUpdated.annual_revenue_vnd || null,
        monthly_revenue_vnd: privUpdated.monthly_revenue_vnd || null,
        trade_volume_notes: privUpdated.trade_volume_notes || null,
        registration_doc_url: privUpdated.registration_doc_url || null,
        tax_code_doc_url: privUpdated.tax_code_doc_url || null,
        is_verified: privUpdated.is_verified,
        verified_by: privUpdated.is_verified ? profile?.id : null,
        verified_at: privUpdated.is_verified ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const existing = privateMap[companyId];
      if (existing?.id) {
        await supabase.from('company_private_info').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('company_private_info').insert(payload);
      }
    }

    closeDialog();
    load();
    setUploading(false);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setForm(EMPTY);
    setEditingId(null);
    setLogoFile(null);
    setLogoPreview(null);
    setRegDocFile(null);
    setTaxDocFile(null);
    setPrivateForm(EMPTY_PRIVATE);
  };

  const toggleApproval = async (id: string, current: boolean) => {
    await supabase.from('companies').update({ is_approved: !current }).eq('id', id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this company?')) return;
    await supabase.from('companies').delete().eq('id', id);
    toast({ title: 'Company deleted' });
    load();
  };

  const edit = (c: Company) => {
    setForm(c);
    setEditingId(c.id);
    setLogoFile(null);
    setLogoPreview(null);
    setRegDocFile(null);
    setTaxDocFile(null);
    setPrivateForm(privateMap[c.id] ? { ...EMPTY_PRIVATE, ...privateMap[c.id] } : { ...EMPTY_PRIVATE, company_id: c.id });
    setDialogOpen(true);
  };

  const openAdd = () => {
    setForm(EMPTY);
    setEditingId(null);
    setLogoFile(null);
    setLogoPreview(null);
    setRegDocFile(null);
    setTaxDocFile(null);
    setPrivateForm(EMPTY_PRIVATE);
    setDialogOpen(true);
  };

  // Fee config
  const startEditFee = () => {
    setFeeInput(String(feeConfig?.annual_fee_vnd || 1000000));
    setEditingFee(true);
  };

  const saveFee = async () => {
    const val = parseFloat(feeInput);
    if (!val || val <= 0) { toast({ title: 'Invalid fee amount', variant: 'destructive' }); return; }
    setSavingFee(true);
    if (feeConfig?.id) {
      await supabase.from('company_fee_config').update({ annual_fee_vnd: val, updated_by: profile?.id, updated_at: new Date().toISOString() }).eq('id', feeConfig.id);
    } else {
      await supabase.from('company_fee_config').insert({ annual_fee_vnd: val, updated_by: profile?.id });
    }
    toast({ title: 'Annual listing fee updated' });
    setEditingFee(false);
    setSavingFee(false);
    load();
  };

  // Record payment
  const recordPayment = async () => {
    if (!payDialog.company || !feeConfig) return;
    setRecordingPayment(true);
    const c = payDialog.company;
    const fee = feeConfig.annual_fee_vnd;
    const today = new Date();
    const validUntil = addYears(today, 1);

    // Insert fund transaction
    const { data: txn } = await supabase.from('fund_transactions').insert({
      transaction_type: 'income',
      category: 'company_listing',
      amount: fee,
      currency: 'VND',
      description: `Annual listing fee — ${c.company_name}`,
      reference_type: 'company',
      created_by: profile?.id,
      notes: `Listing fee for year ${today.getFullYear()}–${validUntil.getFullYear()}`,
    }).select('id').single();

    // Upsert company_private_info payment fields
    const existing = privateMap[c.id];
    const paymentPatch = {
      company_id: c.id,
      listing_fee_status: 'paid',
      listing_fee_amount_paid: fee,
      listing_fee_paid_date: format(today, 'yyyy-MM-dd'),
      listing_fee_valid_until: format(validUntil, 'yyyy-MM-dd'),
      listing_fund_transaction_id: txn?.id || null,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await supabase.from('company_private_info').update(paymentPatch).eq('id', existing.id);
    } else {
      await supabase.from('company_private_info').insert({ ...EMPTY_PRIVATE, ...paymentPatch, is_verified: false });
    }

    toast({ title: `Payment recorded for ${c.company_name}`, description: `${fmtVND(fee)} valid until ${format(validUntil, 'dd MMM yyyy')}` });
    setPayDialog({ open: false, company: null });
    setRecordingPayment(false);
    load();
  };

  // Stats
  const allPriv = Object.values(privateMap);
  const totalVolume = allPriv.reduce((s, p) => s + (p.annual_revenue_vnd || 0), 0);
  const verifiedCount = allPriv.filter(p => p.is_verified).length;

  const currentLogo = logoPreview || form.logo_url;

  return (
    <AdminLayout title="Business Directory">

      {/* Fee Config Banner */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-primary">
          <Banknote className="h-4 w-4" />
          <span className="text-sm font-semibold">Annual Listing Fee</span>
        </div>
        {editingFee ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="number" min="0" step="100000"
              value={feeInput}
              onChange={e => setFeeInput(e.target.value)}
              className="h-8 w-40 text-sm"
              placeholder="e.g. 1000000"
            />
            <Button size="sm" onClick={saveFee} disabled={savingFee} className="gradient-primary text-primary-foreground h-8 text-xs">
              {savingFee ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingFee(false)} className="h-8 text-xs">Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1">
            <span className="text-lg font-bold text-foreground">{fmtVND(feeConfig?.annual_fee_vnd ?? 1000000)}</span>
            <span className="text-xs text-muted-foreground">per company / year</span>
            <Button size="sm" variant="ghost" onClick={startEditFee} className="h-7 text-xs gap-1 ml-auto">
              <Settings className="h-3 w-3" /> Update Fee
            </Button>
          </div>
        )}
        <div className="flex items-center gap-4 text-sm border-l border-border pl-4">
          <span className="text-muted-foreground text-xs">Listing Income</span>
          <span className="font-bold text-primary">{fmtVND(listingIncome)}</span>
          <span className="text-xs text-muted-foreground">{listingPaidCount} / {companies.length} paid</span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Companies', value: companies.length, sub: '' },
          { label: 'Total Annual Trade', value: fmtVND(totalVolume), sub: 'Combined annual revenue (VND)' },
          { label: 'Verified', value: verifiedCount, sub: 'Documents reviewed' },
          { label: 'Listing Income', value: fmtVND(listingIncome), sub: `${listingPaidCount} of ${companies.length} paid` },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">{s.label}</p>
            {s.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-5">
        <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse h-36" />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Building2 className="h-16 w-16 mx-auto mb-3 opacity-30" />
          <p>No companies yet. Add the first one!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {companies.map(c => {
            const priv = privateMap[c.id];
            const feeStatus = feeStatusInfo(priv);
            return (
              <Card key={c.id} className="shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt={c.company_name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-foreground">{c.company_name}</h3>
                        {c.industry && <p className="text-xs text-muted-foreground">{c.industry} · {c.business_type}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={c.is_approved ? 'bg-primary/20 text-primary' : 'bg-gold/20 text-gold'}>
                        {c.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                      <Badge className={`text-[10px] gap-1 border ${feeStatus.color}`}>
                        {feeStatus.icon} {feeStatus.label}
                      </Badge>
                      {priv?.is_verified && (
                        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border border-green-300/40 text-[10px] gap-1">
                          <ShieldCheck className="h-2.5 w-2.5" /> Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  {c.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{c.description}</p>}

                  {/* Payment info line */}
                  {priv?.listing_fee_status === 'paid' && priv.listing_fee_valid_until && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <CalendarCheck className="h-3 w-3 text-green-600" />
                      <span>Paid {fmtVND(priv.listing_fee_amount_paid)} · valid until {format(parseISO(priv.listing_fee_valid_until), 'dd MMM yyyy')}</span>
                    </div>
                  )}

                  {/* Private intel summary */}
                  {priv && (priv.annual_revenue_vnd || priv.tax_code || priv.registration_doc_url || priv.tax_code_doc_url) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-3 text-xs">
                      {priv.annual_revenue_vnd && (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <TrendingUp className="h-3 w-3" /> {fmtVND(priv.annual_revenue_vnd)}/yr
                        </span>
                      )}
                      {priv.monthly_revenue_vnd && (
                        <span className="text-muted-foreground">{fmtVND(priv.monthly_revenue_vnd)}/mo</span>
                      )}
                      {priv.tax_code && <span className="text-muted-foreground">Tax: {priv.tax_code}</span>}
                      {(priv.registration_doc_url || priv.tax_code_doc_url) && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <FileText className="h-3 w-3" /> Docs on file
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm" variant="outline" onClick={() => toggleApproval(c.id, c.is_approved)}
                      className={`gap-1 text-xs ${c.is_approved ? 'text-destructive border-destructive hover:bg-destructive/10' : 'text-primary border-primary hover:bg-primary/10'}`}
                    >
                      {c.is_approved ? <><X className="h-3 w-3" /> Unapprove</> : <><Check className="h-3 w-3" /> Approve</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => edit(c)} className="gap-1 text-xs">
                      <Edit className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => setPayDialog({ open: true, company: c })}
                      className="gap-1 text-xs text-primary border-primary hover:bg-primary/10"
                    >
                      <CreditCard className="h-3 w-3" /> Record Payment
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(c.id)} className="gap-1 text-xs text-destructive border-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={payDialog.open} onOpenChange={open => setPayDialog(v => ({ ...v, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Record Annual Payment
            </DialogTitle>
          </DialogHeader>
          {payDialog.company && (
            <div className="space-y-4 pt-1">
              <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company</span>
                  <span className="font-semibold text-foreground">{payDialog.company.company_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Annual Fee</span>
                  <span className="font-bold text-primary text-base">{fmtVND(feeConfig?.annual_fee_vnd ?? 1000000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid Until</span>
                  <span className="font-medium text-foreground">{format(addYears(new Date(), 1), 'dd MMM yyyy')}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This will post income to the treasury and mark the company listing as paid for 12 months.
              </p>
              <div className="flex gap-2">
                <Button onClick={recordPayment} disabled={recordingPayment} className="flex-1 gradient-primary text-primary-foreground gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {recordingPayment ? 'Recording...' : 'Confirm Payment'}
                </Button>
                <Button variant="outline" onClick={() => setPayDialog({ open: false, company: null })} className="flex-1">Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit / Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Company' : 'Add Company'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="public" className="mt-1">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="public" className="flex-1">Public Info</TabsTrigger>
              <TabsTrigger value="private" className="flex-1 gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Private Intel
              </TabsTrigger>
            </TabsList>

            {/* ── PUBLIC TAB ── */}
            <TabsContent value="public" className="space-y-4">
              {[
                { label: 'Company Name *', key: 'company_name' },
                { label: 'Business Type', key: 'business_type' },
                { label: 'Industry', key: 'industry' },
                { label: 'Address in Vietnam', key: 'address_in_vietnam' },
                { label: 'Website', key: 'website' },
                { label: 'Phone', key: 'phone' },
                { label: 'Email', key: 'email' },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-sm">{label}</Label>
                  <Input value={(form as Record<string, string>)[key] || ''} onChange={e => set(key as keyof Company, e.target.value)} className="h-9 text-sm" />
                </div>
              ))}

              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-sm">Company Logo</Label>
                {currentLogo && (
                  <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border border-border">
                    <img src={currentLogo} alt="preview" className="w-14 h-14 object-cover rounded-lg border border-border" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{logoFile ? logoFile.name : 'Current logo'}</p>
                      <button onClick={() => { handleLogoChange(null); set('logo_url', ''); }} className="text-xs text-destructive hover:underline mt-0.5">Remove</button>
                    </div>
                  </div>
                )}
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => document.getElementById('company-logo-upload')?.click()}>
                  {logoFile
                    ? <p className="text-sm text-primary flex items-center justify-center gap-2"><ImageIcon className="h-4 w-4" /> {logoFile.name}</p>
                    : <div className="flex flex-col items-center gap-1 text-muted-foreground"><Upload className="h-5 w-5" /><p className="text-xs">{currentLogo ? 'Click to replace logo' : 'Click to upload logo'}</p><p className="text-[10px]">JPG, PNG, WebP up to 5MB</p></div>
                  }
                </div>
                <input id="company-logo-upload" type="file" accept="image/*" className="hidden" onChange={e => handleLogoChange(e.target.files?.[0] || null)} />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Description</Label>
                <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={3} className="text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="approved" checked={form.is_approved || false} onChange={e => set('is_approved', e.target.checked)} />
                <Label htmlFor="approved" className="text-sm cursor-pointer">Approved (visible in public directory)</Label>
              </div>
            </TabsContent>

            {/* ── PRIVATE TAB ── */}
            <TabsContent value="private" className="space-y-4">
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                This information is strictly private — visible only to admins and embassy intelligence staff. Never shared publicly.
              </div>

              {/* Legal IDs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Registration Number</Label>
                  <Input value={privateForm.registration_number || ''} onChange={e => setPriv('registration_number', e.target.value)} className="h-9 text-sm" placeholder="e.g. 0315123456" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Tax Code</Label>
                  <Input value={privateForm.tax_code || ''} onChange={e => setPriv('tax_code', e.target.value)} className="h-9 text-sm" placeholder="e.g. 0315123456-001" />
                </div>
              </div>

              {/* Financials */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Annual Revenue (VND)</Label>
                  <Input
                    type="number" min="0"
                    value={privateForm.annual_revenue_vnd ?? ''}
                    onChange={e => setPriv('annual_revenue_vnd', e.target.value ? parseFloat(e.target.value) : null)}
                    className="h-9 text-sm" placeholder="e.g. 500000000"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Monthly Revenue (VND)</Label>
                  <Input
                    type="number" min="0"
                    value={privateForm.monthly_revenue_vnd ?? ''}
                    onChange={e => setPriv('monthly_revenue_vnd', e.target.value ? parseFloat(e.target.value) : null)}
                    className="h-9 text-sm" placeholder="e.g. 42000000"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Trade Volume Notes</Label>
                <Textarea value={privateForm.trade_volume_notes || ''} onChange={e => setPriv('trade_volume_notes', e.target.value)} rows={2} className="text-sm" placeholder="Revenue streams, seasonality, export/import notes..." />
              </div>

              {/* Documents */}
              <div className="space-y-3 pt-1">
                <Label className="text-sm font-semibold">Legal Verification Documents</Label>
                <DocUpload
                  label="Business Registration Certificate"
                  currentUrl={privateForm.registration_doc_url}
                  file={regDocFile}
                  onFileChange={setRegDocFile}
                  onClear={() => setPriv('registration_doc_url', '')}
                  inputId="reg-doc-upload"
                />
                <DocUpload
                  label="Tax Code Certificate"
                  currentUrl={privateForm.tax_code_doc_url}
                  file={taxDocFile}
                  onFileChange={setTaxDocFile}
                  onClear={() => setPriv('tax_code_doc_url', '')}
                  inputId="tax-doc-upload"
                />
              </div>

              {/* Verified */}
              <div className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/20">
                <input type="checkbox" id="verified" checked={privateForm.is_verified} onChange={e => setPriv('is_verified', e.target.checked)} className="mt-0.5" />
                <div>
                  <Label htmlFor="verified" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Mark as Legally Verified
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Check only after reviewing registration and tax documents</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-3 border-t border-border mt-2">
            <Button onClick={save} disabled={uploading} className="flex-1 gradient-primary text-primary-foreground">
              {uploading ? 'Saving...' : 'Save Company'}
            </Button>
            <Button variant="outline" onClick={closeDialog} className="flex-1">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function DocUpload({
  label, currentUrl, file, onFileChange, onClear, inputId,
}: {
  label: string;
  currentUrl?: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  onClear: () => void;
  inputId: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {currentUrl && !file && (
        <div className="flex items-center justify-between p-2 bg-muted/20 rounded-lg border border-border text-xs">
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
            <FileText className="h-3 w-3" /> View document
          </a>
          <button onClick={onClear} className="text-destructive hover:underline">Remove</button>
        </div>
      )}
      <div
        className="border border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:border-primary transition-colors"
        onClick={() => document.getElementById(inputId)?.click()}
      >
        {file
          ? <p className="text-xs text-primary flex items-center justify-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {file.name}</p>
          : <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Upload className="h-4 w-4" />
              <p className="text-xs">{currentUrl ? 'Replace document' : 'Upload document'}</p>
              <p className="text-[10px]">PDF, JPG, PNG up to 10MB</p>
            </div>
        }
      </div>
      <input id={inputId} type="file" accept=".pdf,image/*" className="hidden" onChange={e => onFileChange(e.target.files?.[0] || null)} />
    </div>
  );
}
