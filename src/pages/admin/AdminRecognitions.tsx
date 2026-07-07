import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Award, Eye, EyeOff, Search, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ImageUploadButton } from '@/components/common/ImageUploadButton';

interface MemberOption { id: string; first_name: string; last_name: string; email: string; }

interface Recognition {
  id: string;
  profile_id: string;
  award_title: string;
  category: string;
  description: string;
  awarded_date: string;
  is_published: boolean;
  image_url?: string;
  profiles?: { first_name: string; last_name: string; email: string; profile_picture_url?: string };
}

const CATEGORIES = [
  { value: 'leadership',        label: 'Leadership',         color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300/40' },
  { value: 'humanitarian',      label: 'Humanitarian',       color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300/40' },
  { value: 'business',          label: 'Business Excellence',color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300/40' },
  { value: 'youth',             label: 'Youth Excellence',   color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-300/40' },
  { value: 'community_service', label: 'Community Service',  color: 'bg-primary/10 text-primary border-primary/30' },
  { value: 'cultural',          label: 'Cultural Ambassador',color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300/40' },
  { value: 'academic',          label: 'Academic Excellence',color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-300/40' },
];

const catInfo = (val: string) => CATEGORIES.find(c => c.value === val) || CATEGORIES[4];

export function AdminRecognitions() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const [form, setForm] = useState({
    profile_id: '', award_title: '', category: 'community_service',
    description: '', awarded_date: format(new Date(), 'yyyy-MM-dd'), is_published: false, image_url: '',
  });

  useEffect(() => { load(); loadMembers(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('member_recognitions')
      .select('*, profiles!member_recognitions_profile_id_fkey(first_name, last_name, email, profile_picture_url)')
      .order('awarded_date', { ascending: false });
    setRecognitions((data || []) as Recognition[]);
    setLoading(false);
  };

  const loadMembers = async () => {
    const { data } = await supabase.from('profiles').select('id, first_name, last_name, email').order('first_name');
    setMembers((data || []) as MemberOption[]);
  };

  const openAdd = () => {
    setForm({ profile_id: '', award_title: '', category: 'community_service', description: '', awarded_date: format(new Date(), 'yyyy-MM-dd'), is_published: false, image_url: '' });
    setEditingId(null);
    setMemberSearch('');
    setDialogOpen(true);
  };

  const openEdit = (r: Recognition) => {
    setForm({
      profile_id: r.profile_id,
      award_title: r.award_title,
      category: r.category,
      description: r.description,
      awarded_date: r.awarded_date,
      is_published: r.is_published,
      image_url: r.image_url || '',
    });
    setEditingId(r.id);
    const m = members.find(m => m.id === r.profile_id);
    setMemberSearch(m ? `${m.first_name} ${m.last_name}` : '');
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.profile_id || !form.award_title || !form.description) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = { ...form, awarded_by: profile?.id, updated_at: new Date().toISOString() };
    if (editingId) {
      await supabase.from('member_recognitions').update(payload).eq('id', editingId);
      toast({ title: 'Recognition updated' });
    } else {
      await supabase.from('member_recognitions').insert(payload);
      toast({ title: 'Recognition created' });
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const togglePublish = async (r: Recognition) => {
    await supabase.from('member_recognitions').update({ is_published: !r.is_published }).eq('id', r.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this recognition?')) return;
    await supabase.from('member_recognitions').delete().eq('id', id);
    toast({ title: 'Recognition deleted' });
    load();
  };

  const filteredMembers = members.filter(m =>
    `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(memberSearch.toLowerCase())
  ).slice(0, 6);

  const filtered = recognitions.filter(r => {
    const name = `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.toLowerCase();
    return !search || name.includes(search.toLowerCase()) || r.award_title.toLowerCase().includes(search.toLowerCase());
  });

  const publishedCount = recognitions.filter(r => r.is_published).length;

  return (
    <AdminLayout title="Member Recognitions">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Recognitions', value: recognitions.length },
          { label: 'Published', value: publishedCount },
          { label: 'Draft', value: recognitions.length - publishedCount },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by member or award..." className="pl-9 h-9 text-sm" />
        </div>
        <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Add Recognition
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse h-28" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Award className="h-16 w-16 mx-auto mb-3 opacity-30" />
          <p>No recognitions yet. Honour your first outstanding member!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const cat = catInfo(r.category);
            return (
              <Card key={r.id} className="shadow-card">
                <CardContent className="p-4 flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                    {r.profiles?.profile_picture_url ? (
                      <img src={r.profiles.profile_picture_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">
                        {r.profiles?.first_name?.[0]}{r.profiles?.last_name?.[0]}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-bold text-foreground">{r.profiles?.first_name} {r.profiles?.last_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-sm text-primary font-medium flex items-center gap-1">
                            <Star className="h-3.5 w-3.5" /> {r.award_title}
                          </p>
                          <Badge className={`text-[10px] border ${cat.color}`}>{cat.label}</Badge>
                          <Badge className={r.is_published ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-300/40 text-[10px]' : 'bg-muted text-muted-foreground text-[10px]'}>
                            {r.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">{format(parseISO(r.awarded_date), 'dd MMM yyyy')}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{r.description}</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => togglePublish(r)} className={`gap-1 text-xs ${r.is_published ? 'text-muted-foreground' : 'text-primary border-primary hover:bg-primary/10'}`}>
                        {r.is_published ? <><EyeOff className="h-3 w-3" /> Unpublish</> : <><Eye className="h-3 w-3" /> Publish</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)} className="gap-1 text-xs">
                        <Edit className="h-3 w-3" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => remove(r.id)} className="gap-1 text-xs text-destructive border-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              {editingId ? 'Edit Recognition' : 'Add Recognition'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">

            {/* Member picker */}
            <div className="space-y-1.5">
              <Label className="text-sm">Member *</Label>
              <Input
                placeholder="Search member by name or email..."
                value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setForm(f => ({ ...f, profile_id: '' })); }}
                className="h-9 text-sm"
              />
              {memberSearch && !form.profile_id && filteredMembers.length > 0 && (
                <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
                  {filteredMembers.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setForm(f => ({ ...f, profile_id: m.id })); setMemberSearch(`${m.first_name} ${m.last_name}`); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-smooth border-b border-border/50 last:border-0"
                    >
                      <span className="font-medium text-foreground">{m.first_name} {m.last_name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{m.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {form.profile_id && (
                <p className="text-xs text-primary flex items-center gap-1"><Star className="h-3 w-3" /> Member selected</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Award Title *</Label>
              <Input value={form.award_title} onChange={e => setForm(f => ({ ...f, award_title: e.target.value }))} placeholder="e.g. Community Champion of the Year" className="h-9 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Award Date</Label>
              <Input type="date" value={form.awarded_date} onChange={e => setForm(f => ({ ...f, awarded_date: e.target.value }))} className="h-9 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Description / Citation *</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} className="text-sm" placeholder="Describe the member's outstanding contribution..." />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Award Photo / Certificate (optional)</Label>
              <ImageUploadButton
                value={form.image_url}
                onChange={url => setForm(f => ({ ...f, image_url: url }))}
                folder="recognition-photos"
                label="Upload award photo or certificate"
                previewHeight="h-40"
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/20">
              <input type="checkbox" id="pub" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} />
              <Label htmlFor="pub" className="text-sm cursor-pointer">Publish immediately (visible on Hall of Honor page)</Label>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={save} disabled={saving} className="flex-1 gradient-primary text-primary-foreground">
                {saving ? 'Saving...' : editingId ? 'Update Recognition' : 'Create Recognition'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
