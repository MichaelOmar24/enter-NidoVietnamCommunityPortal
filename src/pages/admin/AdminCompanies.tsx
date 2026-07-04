import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/lib/types';
import { Plus, Check, X, Edit, Trash2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EMPTY: Partial<Company> = { company_name: '', description: '', business_type: '', industry: '', address_in_vietnam: '', website: '', phone: '', email: '', logo_url: '', is_approved: false };

export function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<Company>>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    setCompanies((data || []) as Company[]);
    setLoading(false);
  };

  const set = (k: keyof Company, v: string | boolean | null) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.company_name) return;
    if (editingId) {
      await supabase.from('companies').update(form).eq('id', editingId);
      toast({ title: 'Company updated' });
    } else {
      await supabase.from('companies').insert({ ...form } as Omit<Company, 'id' | 'created_at' | 'updated_at'>);
      toast({ title: 'Company added' });
    }
    setDialogOpen(false);
    setForm(EMPTY);
    setEditingId(null);
    load();
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
    setDialogOpen(true);
  };

  return (
    <AdminLayout title="Business Directory">
      <div className="flex justify-end mb-6">
        <Button onClick={() => { setForm(EMPTY); setEditingId(null); setDialogOpen(true); }} className="gradient-primary text-primary-foreground gap-2">
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
          {companies.map(c => (
            <Card key={c.id} className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-foreground">{c.company_name}</h3>
                    {c.industry && <p className="text-xs text-muted-foreground">{c.industry} · {c.business_type}</p>}
                  </div>
                  <Badge className={c.is_approved ? 'bg-primary/20 text-primary' : 'bg-gold/20 text-gold'}>
                    {c.is_approved ? 'Approved' : 'Pending'}
                  </Badge>
                </div>
                {c.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{c.description}</p>}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => toggleApproval(c.id, c.is_approved)} className={`gap-1 text-xs ${c.is_approved ? 'text-destructive border-destructive hover:bg-destructive/10' : 'text-primary border-primary hover:bg-primary/10'}`}>
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
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Company' : 'Add Company'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {[
              { label: 'Company Name *', key: 'company_name' },
              { label: 'Business Type', key: 'business_type' },
              { label: 'Industry', key: 'industry' },
              { label: 'Address in Vietnam', key: 'address_in_vietnam' },
              { label: 'Website', key: 'website' },
              { label: 'Phone', key: 'phone' },
              { label: 'Email', key: 'email' },
              { label: 'Logo URL', key: 'logo_url' },
            ].map(({ label, key }) => (
              <div key={key} className="space-y-1">
                <Label className="text-sm">{label}</Label>
                <Input value={(form as Record<string, string>)[key] || ''} onChange={e => set(key as keyof Company, e.target.value)} className="h-9 text-sm" />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-sm">Description</Label>
              <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={3} className="text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="approved" checked={form.is_approved || false} onChange={e => set('is_approved', e.target.checked)} />
              <Label htmlFor="approved" className="text-sm cursor-pointer">Approved (visible in directory)</Label>
            </div>
            <div className="flex gap-3">
              <Button onClick={save} className="flex-1 gradient-primary text-primary-foreground">Save</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
