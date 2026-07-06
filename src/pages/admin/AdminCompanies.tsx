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
import { Company, CompanyPrivateInfo } from '@/lib/types';
import {
  Plus, Check, X, Edit, Trash2, Building2, Upload, ImageIcon,
  FileText, ShieldCheck, AlertCircle, TrendingUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

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

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: cos }, { data: privs }] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('company_private_info').select('*'),
    ]);
    setCompanies((cos || []) as Company[]);
    const map: Record<string, CompanyPrivateInfo> = {};
    (privs || []).forEach((p: CompanyPrivateInfo) => { if (p.company_id) map[p.company_id] = p; });
    setPrivateMap(map);
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

    // Upload logo if changed
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

    // Save company
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

    // Save private info
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

  // Stats
  const allPriv = Object.values(privateMap);
  const totalVolume = allPriv.reduce((s, p) => s + (p.annual_revenue_vnd || 0), 0);
  const verifiedCount = allPriv.filter(p => p.is_verified).length;
  const docsCount = allPriv.filter(p => p.registration_doc_url || p.tax_code_doc_url).length;

  const currentLogo = logoPreview || form.logo_url;

  return (
    <AdminLayout title="Business Directory">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Companies', value: companies.length, sub: '' },
          { label: 'Total Annual Trade', value: fmtVND(totalVolume), sub: 'Combined annual revenue (VND)' },
          { label: 'Verified', value: verifiedCount, sub: 'Documents reviewed' },
          { label: 'Docs on File', value: docsCount, sub: 'Registration or tax doc' },
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
                      {priv?.is_verified && (
                        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border border-green-300/40 text-[10px] gap-1">
                          <ShieldCheck className="h-2.5 w-2.5" /> Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  {c.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{c.description}</p>}

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
