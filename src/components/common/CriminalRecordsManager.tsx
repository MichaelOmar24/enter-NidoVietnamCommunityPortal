import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Gavel, Search, Plus, Pencil, Trash2, Loader2, FileText, Upload, X,
  Lock, UserCheck, Plane, Scale, Calendar, MapPin, Banknote
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export interface CriminalRecord {
  id: string;
  full_name: string;
  passport_number?: string | null;
  date_of_birth?: string | null;
  nigerian_state_of_origin?: string | null;
  crime_category: string;
  crime_description?: string | null;
  crime_date?: string | null;
  arrest_date?: string | null;
  court_name?: string | null;
  court_city?: string | null;
  case_number?: string | null;
  conviction_date?: string | null;
  sentence_years?: number | null;
  sentence_start?: string | null;
  sentence_end?: string | null;
  prison_name?: string | null;
  prison_city?: string | null;
  fine_amount?: number | null;
  fine_currency?: string | null;
  fine_paid?: boolean;
  fine_paid_date?: string | null;
  legal_documents?: string[];
  release_status: string;
  release_date?: string | null;
  clemency_status: string;
  clemency_date?: string | null;
  clemency_details?: string | null;
  notes?: string | null;
  created_at: string;
}

const CRIME_CATEGORIES: Record<string, string> = {
  drug_trafficking: 'Drug Trafficking', fraud: 'Fraud / Financial Crime', theft: 'Theft',
  assault: 'Assault', murder: 'Murder / Homicide', immigration_offense: 'Immigration Offense',
  cybercrime: 'Cybercrime', smuggling: 'Smuggling', other: 'Other',
};

const RELEASE_STATUSES: Record<string, { label: string; color: string }> = {
  in_custody: { label: 'In Custody', color: 'bg-red-500/15 text-red-600 border-red-500/30' },
  released: { label: 'Released', color: 'bg-green-500/15 text-green-600 border-green-500/30' },
  paroled: { label: 'Paroled', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  deported: { label: 'Deported', color: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
  transferred: { label: 'Transferred', color: 'bg-gray-500/15 text-gray-500 border-gray-500/30' },
  deceased: { label: 'Deceased', color: 'bg-gray-500/15 text-gray-500 border-gray-500/30' },
};

const CLEMENCY_STATUSES: Record<string, { label: string; color: string }> = {
  none: { label: 'No Clemency', color: 'bg-muted text-muted-foreground border-border' },
  applied: { label: 'Clemency Applied', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  under_review: { label: 'Clemency Under Review', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  granted: { label: 'Clemency Granted', color: 'bg-green-500/15 text-green-600 border-green-500/30' },
  denied: { label: 'Clemency Denied', color: 'bg-red-500/15 text-red-600 border-red-500/30' },
};

const EMPTY: Partial<CriminalRecord> = {
  full_name: '', passport_number: '', date_of_birth: '', nigerian_state_of_origin: '',
  crime_category: 'other', crime_description: '', crime_date: '', arrest_date: '',
  court_name: '', court_city: '', case_number: '', conviction_date: '',
  sentence_years: undefined, sentence_start: '', sentence_end: '',
  prison_name: '', prison_city: '',
  fine_amount: undefined, fine_currency: 'VND', fine_paid: false, fine_paid_date: '',
  legal_documents: [],
  release_status: 'in_custody', release_date: '',
  clemency_status: 'none', clemency_date: '', clemency_details: '',
  notes: '',
};

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return d; }
};

const fmtMoney = (n?: number | null, c?: string | null) =>
  n == null ? '—' : `${Number(n).toLocaleString()} ${c || 'VND'}`;

export function CriminalRecordsManager() {
  const { toast } = useToast();
  const [records, setRecords] = useState<CriminalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CriminalRecord>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('criminal_records' as never).select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load records', description: error.message, variant: 'destructive' });
    }
    setRecords((data || []) as unknown as CriminalRecord[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof CriminalRecord, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => {
    setForm(EMPTY);
    setEditingId(null);
    setDocFiles([]);
    setDialogOpen(true);
  };

  const openEdit = (r: CriminalRecord) => {
    setForm({ ...r });
    setEditingId(r.id);
    setDocFiles([]);
    setDialogOpen(true);
  };

  const uploadDocuments = async (recordId: string, existing: string[]): Promise<string[]> => {
    if (docFiles.length === 0) return existing;
    setUploadingDocs(true);
    const urls = [...existing];
    for (const file of docFiles) {
      const path = `criminal-records/${recordId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file);
      if (!error) {
        urls.push(supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl);
      }
    }
    setUploadingDocs(false);
    return urls;
  };

  const save = async () => {
    if (!form.full_name?.trim()) {
      toast({ title: 'Missing field', description: 'Full name is required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const recordId = editingId || crypto.randomUUID();
    const docs = await uploadDocuments(recordId, form.legal_documents || []);

    const payload = {
      full_name: form.full_name.trim(),
      passport_number: form.passport_number || null,
      date_of_birth: form.date_of_birth || null,
      nigerian_state_of_origin: form.nigerian_state_of_origin || null,
      crime_category: form.crime_category || 'other',
      crime_description: form.crime_description || null,
      crime_date: form.crime_date || null,
      arrest_date: form.arrest_date || null,
      court_name: form.court_name || null,
      court_city: form.court_city || null,
      case_number: form.case_number || null,
      conviction_date: form.conviction_date || null,
      sentence_years: form.sentence_years ?? null,
      sentence_start: form.sentence_start || null,
      sentence_end: form.sentence_end || null,
      prison_name: form.prison_name || null,
      prison_city: form.prison_city || null,
      fine_amount: form.fine_amount ?? null,
      fine_currency: form.fine_currency || 'VND',
      fine_paid: form.fine_paid || false,
      fine_paid_date: form.fine_paid ? form.fine_paid_date || null : null,
      legal_documents: docs,
      release_status: form.release_status || 'in_custody',
      release_date: form.release_date || null,
      clemency_status: form.clemency_status || 'none',
      clemency_date: form.clemency_date || null,
      clemency_details: form.clemency_details || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('criminal_records' as never).update(payload as never).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('criminal_records' as never).insert({ id: recordId, ...payload } as never));
    }

    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editingId ? 'Record updated' : 'Record created' });
    setDialogOpen(false);
    setDocFiles([]);
    load();
  };

  const remove = async (r: CriminalRecord) => {
    if (!confirm(`Permanently delete the criminal record for "${r.full_name}"?\n\nThis cannot be undone.`)) return;
    const { error } = await supabase.from('criminal_records' as never).delete().eq('id', r.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Record deleted' });
    load();
  };

  const removeDocument = (url: string) => {
    setForm(f => ({ ...f, legal_documents: (f.legal_documents || []).filter(u => u !== url) }));
  };

  const q = search.toLowerCase();
  const filtered = records.filter(r =>
    (statusFilter === 'all' || r.release_status === statusFilter) &&
    (!q || r.full_name.toLowerCase().includes(q) || (r.passport_number || '').toLowerCase().includes(q) || (r.case_number || '').toLowerCase().includes(q))
  );

  const stats = {
    total: records.length,
    inCustody: records.filter(r => r.release_status === 'in_custody').length,
    released: records.filter(r => ['released', 'paroled'].includes(r.release_status)).length,
    deported: records.filter(r => r.release_status === 'deported').length,
    clemencyGranted: records.filter(r => r.clemency_status === 'granted').length,
  };

  const sel = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground';

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total Cases', value: stats.total, icon: Gavel, color: 'text-foreground' },
          { label: 'In Custody', value: stats.inCustody, icon: Lock, color: 'text-red-500' },
          { label: 'Released', value: stats.released, icon: UserCheck, color: 'text-green-600' },
          { label: 'Deported', value: stats.deported, icon: Plane, color: 'text-purple-600' },
          { label: 'Clemency Granted', value: stats.clemencyGranted, icon: Scale, color: 'text-primary' },
        ].map(s => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="p-3.5 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, passport or case number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${sel} sm:w-48`}>
          <option value="all">All Statuses</option>
          {Object.entries(RELEASE_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Button onClick={openCreate} className="gap-2 gradient-primary text-primary-foreground shrink-0">
          <Plus className="h-4 w-4" /> New Record
        </Button>
      </div>

      {/* Records list */}
      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading records...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Gavel className="h-16 w-16 mx-auto mb-3 opacity-30" />
          <p>{records.length === 0 ? 'No criminal records yet. Create the first one.' : 'No records match your filters.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const rs = RELEASE_STATUSES[r.release_status] || RELEASE_STATUSES.in_custody;
            const cs = CLEMENCY_STATUSES[r.clemency_status] || CLEMENCY_STATUSES.none;
            return (
              <Card key={r.id} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <Gavel className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-bold text-foreground">{r.full_name}</p>
                        <Badge className={`text-[10px] border ${rs.color}`}>{rs.label}</Badge>
                        <Badge className="text-[10px] border bg-muted text-muted-foreground">{CRIME_CATEGORIES[r.crime_category] || r.crime_category}</Badge>
                        {r.clemency_status !== 'none' && <Badge className={`text-[10px] border ${cs.color}`}>{cs.label}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {r.case_number && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />Case {r.case_number}</span>}
                        {r.court_name && <span className="flex items-center gap-1"><Scale className="h-3 w-3" />{r.court_name}{r.court_city ? `, ${r.court_city}` : ''}</span>}
                        {r.prison_name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.prison_name}{r.prison_city ? `, ${r.prison_city}` : ''}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3">
                        {r.sentence_years != null && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{r.sentence_years} year{Number(r.sentence_years) === 1 ? '' : 's'}</span>}
                        {r.sentence_end && <span>Release due: {fmtDate(r.sentence_end)}</span>}
                        {r.fine_amount != null && <span className="flex items-center gap-1"><Banknote className="h-3 w-3" />{fmtMoney(r.fine_amount, r.fine_currency)} {r.fine_paid ? '(paid)' : '(unpaid)'}</span>}
                        {r.legal_documents && r.legal_documents.length > 0 && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{r.legal_documents.length} document(s)</span>}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)} className="gap-1 text-xs text-primary border-primary hover:bg-primary/10">
                        <Pencil className="h-3 w-3" /> View / Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => remove(r)} title="Delete record permanently"
                        className="gap-1 text-xs text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) { setDialogOpen(false); setDocFiles([]); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-4 w-4 text-destructive" />
              {editingId ? `Criminal Record — ${form.full_name}` : 'New Criminal Record'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Citizen identity */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Citizen Identity</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Full Name *</Label><Input value={form.full_name || ''} onChange={e => set('full_name', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Passport Number</Label><Input value={form.passport_number || ''} onChange={e => set('passport_number', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>State of Origin (Nigeria)</Label><Input value={form.nigerian_state_of_origin || ''} onChange={e => set('nigerian_state_of_origin', e.target.value)} /></div>
              </div>
            </section>

            {/* Crime details */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Crime Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Crime Category *</Label>
                  <select className={sel} value={form.crime_category || 'other'} onChange={e => set('crime_category', e.target.value)}>
                    {Object.entries(CRIME_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label>Crime Date</Label><Input type="date" value={form.crime_date || ''} onChange={e => set('crime_date', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Arrest Date</Label><Input type="date" value={form.arrest_date || ''} onChange={e => set('arrest_date', e.target.value)} /></div>
              </div>
              <div className="space-y-1.5 mt-3"><Label>Crime Description</Label><Textarea rows={2} value={form.crime_description || ''} onChange={e => set('crime_description', e.target.value)} /></div>
            </section>

            {/* Court information */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Court Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Court Name</Label><Input value={form.court_name || ''} onChange={e => set('court_name', e.target.value)} placeholder="e.g. People's Court of Hanoi" /></div>
                <div className="space-y-1.5"><Label>Court City</Label><Input value={form.court_city || ''} onChange={e => set('court_city', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Case Number</Label><Input value={form.case_number || ''} onChange={e => set('case_number', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Conviction Date</Label><Input type="date" value={form.conviction_date || ''} onChange={e => set('conviction_date', e.target.value)} /></div>
              </div>
            </section>

            {/* Conviction period & prison */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Conviction Period & Prison</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Sentence (years)</Label><Input type="number" step="0.5" min="0" value={form.sentence_years ?? ''} onChange={e => set('sentence_years', e.target.value === '' ? undefined : Number(e.target.value))} /></div>
                <div className="space-y-1.5"><Label>Sentence Start</Label><Input type="date" value={form.sentence_start || ''} onChange={e => set('sentence_start', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Sentence End</Label><Input type="date" value={form.sentence_end || ''} onChange={e => set('sentence_end', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Prison Name</Label><Input value={form.prison_name || ''} onChange={e => set('prison_name', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Prison City</Label><Input value={form.prison_city || ''} onChange={e => set('prison_city', e.target.value)} /></div>
              </div>
            </section>

            {/* Financial penalties */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Financial Penalties</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1.5"><Label>Fine Amount</Label><Input type="number" min="0" value={form.fine_amount ?? ''} onChange={e => set('fine_amount', e.target.value === '' ? undefined : Number(e.target.value))} /></div>
                <div className="space-y-1.5"><Label>Currency</Label>
                  <select className={sel} value={form.fine_currency || 'VND'} onChange={e => set('fine_currency', e.target.value)}>
                    <option value="VND">VND</option><option value="USD">USD</option><option value="NGN">NGN</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <input type="checkbox" id="fine_paid" checked={form.fine_paid || false} onChange={e => set('fine_paid', e.target.checked)} />
                  <Label htmlFor="fine_paid" className="cursor-pointer">Fine Paid</Label>
                </div>
                {form.fine_paid && (
                  <div className="space-y-1.5"><Label>Payment Date</Label><Input type="date" value={form.fine_paid_date || ''} onChange={e => set('fine_paid_date', e.target.value)} /></div>
                )}
              </div>
            </section>

            {/* Release status */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Release Status</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Status</Label>
                  <select className={sel} value={form.release_status || 'in_custody'} onChange={e => set('release_status', e.target.value)}>
                    {Object.entries(RELEASE_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label>Release Date</Label><Input type="date" value={form.release_date || ''} onChange={e => set('release_date', e.target.value)} /></div>
              </div>
            </section>

            {/* Clemency records */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Clemency Records</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Clemency Status</Label>
                  <select className={sel} value={form.clemency_status || 'none'} onChange={e => set('clemency_status', e.target.value)}>
                    {Object.entries(CLEMENCY_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                {form.clemency_status !== 'none' && (
                  <div className="space-y-1.5"><Label>Clemency Date</Label><Input type="date" value={form.clemency_date || ''} onChange={e => set('clemency_date', e.target.value)} /></div>
                )}
              </div>
              {form.clemency_status !== 'none' && (
                <div className="space-y-1.5 mt-3"><Label>Clemency Details</Label><Textarea rows={2} value={form.clemency_details || ''} onChange={e => set('clemency_details', e.target.value)} placeholder="Application details, decisions, references..." /></div>
              )}
            </section>

            {/* Legal documents */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Legal Documents</p>
              <input ref={docInputRef} type="file" multiple className="hidden" onChange={e => setDocFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => docInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Upload Document
              </Button>
              <div className="space-y-1.5 mt-2">
                {(form.legal_documents || []).map((url, i) => (
                  <div key={url} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex-1">Document {i + 1}</a>
                    <button type="button" onClick={() => removeDocument(url)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                {docFiles.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs text-foreground truncate flex-1">{f.name} (will upload on save)</span>
                    <button type="button" onClick={() => setDocFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive shrink-0"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </section>

            {/* Notes */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Internal Notes</p>
              <Textarea rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Confidential notes for embassy/admin use..." />
            </section>

            <div className="flex gap-3 pt-2 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button className="flex-1 gap-2 gradient-primary text-primary-foreground" onClick={save} disabled={saving || uploadingDocs}>
                {(saving || uploadingDocs) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
                {saving || uploadingDocs ? 'Saving...' : editingId ? 'Save Changes' : 'Create Record'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
