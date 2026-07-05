import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Heart, Search, X, Calendar, MapPin, Edit, Trash2, Plane, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const CAUSE_OPTIONS = [
  { value: 'illness', label: 'Illness' },
  { value: 'accident', label: 'Accident' },
  { value: 'natural_causes', label: 'Natural Causes' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'other', label: 'Other' },
];

const REMAINS_OPTIONS = [
  { value: 'transferred_to_nigeria', label: 'Transferred back home to Nigeria' },
  { value: 'buried_in_vietnam', label: 'Buried in Vietnam' },
  { value: 'cremated_buried_vietnam', label: 'Cremated and buried in Vietnam' },
  { value: 'cremated_sent_nigeria', label: 'Cremated and ashes sent to Nigeria' },
  { value: 'cremated_sent_other', label: 'Cremated and ashes sent to another country' },
  { value: 'other', label: 'Other' },
];

const REMAINS_LABEL: Record<string, string> = {
  transferred_to_nigeria: 'Transferred to Nigeria',
  buried_in_vietnam: 'Buried in Vietnam',
  cremated_buried_vietnam: 'Cremated & Buried in Vietnam',
  cremated_sent_nigeria: 'Cremated — Ashes to Nigeria',
  cremated_sent_other: 'Cremated — Ashes Abroad',
  other: 'Other',
};

const REMAINS_COLOR: Record<string, string> = {
  transferred_to_nigeria: 'bg-green-500/10 text-green-700 border-green-300 dark:text-green-400',
  buried_in_vietnam: 'bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-400',
  cremated_buried_vietnam: 'bg-purple-500/10 text-purple-700 border-purple-300 dark:text-purple-400',
  cremated_sent_nigeria: 'bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400',
  cremated_sent_other: 'bg-orange-500/10 text-orange-700 border-orange-300 dark:text-orange-400',
  other: 'bg-muted text-muted-foreground border-border',
};

interface DeceasedMember {
  id: string;
  member_id?: string;
  full_name: string;
  date_of_death: string;
  place_of_death?: string;
  cause_of_death: string;
  description: string;
  is_nido_member: boolean;
  remains_disposition?: string;
  destination_country?: string;
  community_raised_amount?: number;
  community_raised_currency?: string;
  created_at: string;
}

const BLANK_FORM = {
  full_name: '',
  date_of_death: '',
  place_of_death: '',
  cause_of_death: 'unknown',
  description: '',
  is_nido_member: true,
  remains_disposition: '',
  destination_country: '',
  community_raised_amount: '',
  community_raised_currency: 'VND',
};

export function AdminDeceased() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<DeceasedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK_FORM);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('deceased_members')
      .select('*')
      .order('date_of_death', { ascending: false });
    setRecords((data || []) as DeceasedMember[]);
    setLoading(false);
  };

  const openNew = () => { setForm(BLANK_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (r: DeceasedMember) => {
    setForm({
      full_name: r.full_name,
      date_of_death: r.date_of_death,
      place_of_death: r.place_of_death || '',
      cause_of_death: r.cause_of_death,
      description: r.description,
      is_nido_member: r.is_nido_member,
      remains_disposition: r.remains_disposition || '',
      destination_country: r.destination_country || '',
      community_raised_amount: r.community_raised_amount ? String(r.community_raised_amount) : '',
      community_raised_currency: r.community_raised_currency || 'VND',
    });
    setEditId(r.id);
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.date_of_death || !form.description) {
      toast({ title: 'Missing fields', description: 'Full name, date of death, and description are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      full_name: form.full_name,
      date_of_death: form.date_of_death,
      place_of_death: form.place_of_death || null,
      cause_of_death: form.cause_of_death,
      description: form.description,
      is_nido_member: form.is_nido_member,
      remains_disposition: form.remains_disposition || null,
      destination_country: (form.remains_disposition === 'cremated_sent_other' && form.destination_country) ? form.destination_country : null,
      community_raised_amount: form.community_raised_amount ? parseFloat(form.community_raised_amount) : null,
      community_raised_currency: form.community_raised_amount ? form.community_raised_currency : null,
      created_by: profile!.id,
      updated_at: new Date().toISOString(),
    };
    if (editId) {
      await supabase.from('deceased_members').update(payload).eq('id', editId);
      toast({ title: 'Record updated' });
    } else {
      await supabase.from('deceased_members').insert(payload);
      toast({ title: 'Record added', description: `${form.full_name} has been added to the memorial record.` });
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const deleteRecord = async (id: string) => {
    await supabase.from('deceased_members').delete().eq('id', id);
    toast({ title: 'Record deleted' });
    setDeleteConfirm(null);
    load();
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'VND') return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const filtered = records.filter(r => r.full_name.toLowerCase().includes(search.toLowerCase()));
  const totalRaised = records.reduce((sum, r) => sum + (r.community_raised_amount || 0), 0);

  return (
    <AdminLayout title="Deceased Members Memorial">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Badge variant="outline" className="shrink-0">{filtered.length} records</Badge>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2 shrink-0" onClick={openNew}>
          <Plus className="h-4 w-4" /> Add Memorial Record
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">{records.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Records</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">{records.filter(r => r.is_nido_member).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">NIDO Members</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">
            {records.filter(r => r.date_of_death >= new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]).length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">This Year</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-lg font-bold text-foreground truncate">
            {totalRaised > 0 ? new Intl.NumberFormat('vi-VN').format(totalRaised) + ' ₫' : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Raised</p>
        </div>
      </div>

      {/* Records grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-48 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{search ? 'No records match your search' : 'No memorial records yet'}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map(r => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <p className="font-bold text-foreground">{r.full_name}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.is_nido_member && (
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">NIDO Member</Badge>
                    )}
                    {r.remains_disposition && (
                      <Badge variant="outline" className={`text-[10px] ${REMAINS_COLOR[r.remains_disposition] || 'bg-muted text-muted-foreground'}`}>
                        <Plane className="h-2.5 w-2.5 mr-1" />
                        {REMAINS_LABEL[r.remains_disposition] || r.remains_disposition}
                        {r.remains_disposition === 'cremated_sent_other' && r.destination_country ? ` (${r.destination_country})` : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {format(parseISO(r.date_of_death), 'dd MMMM yyyy')}
                </span>
                {r.place_of_death && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {r.place_of_death}
                  </span>
                )}
                <span className="capitalize">{r.cause_of_death.replace('_', ' ')}</span>
              </div>

              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2 mb-3">{r.description}</p>

              {r.community_raised_amount && r.community_raised_amount > 0 && (
                <div className="flex items-center gap-2 pt-2.5 border-t border-border">
                  <DollarSign className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Community raised: <span className="font-semibold text-green-700 dark:text-green-400">
                      {formatCurrency(r.community_raised_amount, r.community_raised_currency || 'VND')}
                    </span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <p className="font-bold text-foreground">{editId ? 'Edit Memorial Record' : 'Add Memorial Record'}</p>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              {/* Full Name */}
              <div>
                <Label>Full Name *</Label>
                <Input className="mt-1.5" placeholder="Full name of the deceased" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>

              {/* Date + Cause */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date of Death *</Label>
                  <Input type="date" className="mt-1.5" value={form.date_of_death} onChange={e => setForm(f => ({ ...f, date_of_death: e.target.value }))} />
                </div>
                <div>
                  <Label>Cause of Death *</Label>
                  <Select value={form.cause_of_death} onValueChange={v => setForm(f => ({ ...f, cause_of_death: v }))}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAUSE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Place of Death */}
              <div>
                <Label>Place of Death</Label>
                <Input className="mt-1.5" placeholder="City / Country" value={form.place_of_death} onChange={e => setForm(f => ({ ...f, place_of_death: e.target.value }))} />
              </div>

              {/* NIDO member */}
              <div className="flex items-center gap-3">
                <input type="checkbox" id="nido_member" checked={form.is_nido_member} onChange={e => setForm(f => ({ ...f, is_nido_member: e.target.checked }))} className="h-4 w-4 accent-primary" />
                <Label htmlFor="nido_member" className="cursor-pointer">Was a NIDO Vietnam member</Label>
              </div>

              {/* Remains Disposition */}
              <div>
                <Label>Remains / Final Arrangements</Label>
                <Select value={form.remains_disposition} onValueChange={v => setForm(f => ({ ...f, remains_disposition: v, destination_country: v !== 'cremated_sent_other' ? '' : f.destination_country }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select arrangement..." /></SelectTrigger>
                  <SelectContent>
                    {REMAINS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Destination country (only if cremated_sent_other) */}
              {form.remains_disposition === 'cremated_sent_other' && (
                <div>
                  <Label>Destination Country</Label>
                  <Input className="mt-1.5" placeholder="Country where ashes were sent" value={form.destination_country} onChange={e => setForm(f => ({ ...f, destination_country: e.target.value }))} />
                </div>
              )}

              {/* Community Raised */}
              <div>
                <Label>Community Support Raised</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Amount raised by community"
                    className="flex-1"
                    value={form.community_raised_amount}
                    onChange={e => setForm(f => ({ ...f, community_raised_amount: e.target.value }))}
                  />
                  <Select value={form.community_raised_currency} onValueChange={v => setForm(f => ({ ...f, community_raised_currency: v }))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VND">VND</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="NGN">NGN</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>Description of Case *</Label>
                <Textarea className="mt-1.5 min-h-[100px]" placeholder="Brief description of the death case, circumstances, and any relevant information..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="submit" className="flex-1 gradient-primary text-primary-foreground" disabled={saving}>
                  {saving ? 'Saving...' : editId ? 'Update Record' : 'Add Record'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-xl">
            <p className="font-bold text-foreground mb-2">Delete Memorial Record?</p>
            <p className="text-sm text-muted-foreground mb-5">This action cannot be undone. The memorial record will be permanently removed.</p>
            <div className="flex gap-3">
              <Button variant="destructive" className="flex-1" onClick={() => deleteRecord(deleteConfirm)}>Delete</Button>
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
