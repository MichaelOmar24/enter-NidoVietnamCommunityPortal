import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Passport, OCCUPATION_LABELS, MARITAL_STATUS_LABELS } from '@/lib/types';
import { Search, Eye, Edit, Check, AlertTriangle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface MemberWithPassport extends Profile {
  passport?: Passport;
}

export function AdminMembers() {
  const [members, setMembers] = useState<MemberWithPassport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<MemberWithPassport | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingPassport, setEditingPassport] = useState<Partial<Passport>>({});
  const PAGE_SIZE = 15;
  const { toast } = useToast();

  useEffect(() => { loadMembers(); }, [page, filter, search]);

  const loadMembers = async () => {
    setLoading(true);
    let q = supabase.from('profiles').select('*', { count: 'exact' });
    if (filter !== 'all') q = q.eq('membership_status', filter as 'active' | 'pending' | 'expired');
    if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    q = q.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    const { data, count } = await q;
    setMembers((data || []) as MemberWithPassport[]);
    setTotal(count || 0);
    setLoading(false);
  };

  const viewMember = async (member: MemberWithPassport) => {
    const { data } = await supabase.from('passports').select('*').eq('user_id', member.id).maybeSingle();
    const pp = data as Passport | null;
    const m = { ...member, passport: pp || undefined };
    setSelected(m);
    setEditingPassport(pp || {});
  };

  const updateMemberStatus = async (id: string, status: string) => {
    await supabase.from('profiles').update({ membership_status: status as 'active' | 'pending' | 'expired' }).eq('id', id);
    toast({ title: 'Status updated', description: `Member status changed to ${status}` });
    loadMembers();
    if (selected?.id === id) setSelected(s => s ? { ...s, membership_status: status as 'active' | 'pending' | 'expired' } : null);
  };

  const savePassportEdit = async () => {
    if (!selected?.passport?.id) return;
    await supabase.from('passports').update({
      passport_number: editingPassport.passport_number,
      issue_date: editingPassport.issue_date,
      expiry_date: editingPassport.expiry_date,
      place_of_issue: editingPassport.place_of_issue,
      admin_notes: editingPassport.admin_notes,
      verified: editingPassport.verified,
    }).eq('id', selected.passport.id);
    toast({ title: 'Passport updated', description: 'Passport information has been saved.' });
  };

  const passportDaysToExpiry = (passport?: Passport) => {
    if (!passport?.expiry_date) return null;
    return differenceInDays(parseISO(passport.expiry_date), new Date());
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AdminLayout title="Member Management">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or email..." className="pl-9" />
        </div>
        <Select value={filter} onValueChange={v => { setFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Members ({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Member</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Occupation</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Marital</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">City</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Joined</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded animate-pulse w-full" />
                      </td>
                    </tr>
                  ))
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No members found</td>
                  </tr>
                ) : members.map(member => (
                  <tr key={member.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{member.first_name} {member.last_name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{member.occupation_type?.replace(/_/g, ' ') || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{member.marital_status || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{member.vietnam_city || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge className={
                        member.membership_status === 'active' ? 'bg-primary/20 text-primary' :
                        member.membership_status === 'pending' ? 'bg-gold/20 text-gold' :
                        'bg-destructive/20 text-destructive'
                      }>{member.membership_status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(member.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => viewMember(member)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{selected?.first_name} {selected?.last_name}</DialogTitle>
                            </DialogHeader>
                            {selected && (
                              <div className="space-y-4">
                                {/* Profile info */}
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {[
                                    ['Email', selected.email],
                                    ['Phone', selected.phone],
                                    ['DOB', selected.date_of_birth],
                                    ['Gender', selected.gender],
                                    ['Occupation', selected.occupation_type?.replace(/_/g, ' ')],
                                    ['Marital Status', selected.marital_status],
                                    ['Vietnam City', selected.vietnam_city],
                                    ['State of Origin', selected.nigerian_state_of_origin],
                                  ].map(([k, v]) => (
                                    <div key={k} className="flex flex-col">
                                      <span className="text-muted-foreground text-xs">{k}</span>
                                      <span className="text-foreground capitalize">{v || '-'}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Status control */}
                                <div className="flex gap-2 flex-wrap">
                                  <Button size="sm" className="bg-primary text-primary-foreground gap-1" onClick={() => updateMemberStatus(selected.id, 'active')}>
                                    <Check className="h-3.5 w-3.5" /> Activate
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1 text-gold border-gold hover:bg-gold/10" onClick={() => updateMemberStatus(selected.id, 'pending')}>
                                    <AlertTriangle className="h-3.5 w-3.5" /> Set Pending
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive hover:bg-destructive/10" onClick={() => updateMemberStatus(selected.id, 'expired')}>
                                    <X className="h-3.5 w-3.5" /> Expire
                                  </Button>
                                </div>

                                {/* Passport editing */}
                                {selected.passport && (
                                  <div className="border-t border-border pt-4">
                                    <h4 className="font-semibold text-sm mb-3">Passport Information (Editable)</h4>
                                    {selected.passport.passport_image_url && (
                                      <img src={selected.passport.passport_image_url} alt="Passport" className="w-full h-40 object-cover rounded-lg mb-3" onContextMenu={e => e.preventDefault()} />
                                    )}
                                    {passportDaysToExpiry(selected.passport) !== null && (
                                      <div className={`mb-3 p-2 rounded text-xs font-medium flex items-center gap-1 ${
                                        passportDaysToExpiry(selected.passport)! < 0 ? 'bg-destructive/10 text-destructive' :
                                        passportDaysToExpiry(selected.passport)! <= 365 ? 'bg-gold/10 text-gold' :
                                        'bg-primary/10 text-primary'
                                      }`}>
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        {passportDaysToExpiry(selected.passport)! < 0 ? 'EXPIRED' :
                                         passportDaysToExpiry(selected.passport)! <= 365 ? `Expires in ${passportDaysToExpiry(selected.passport)} days` :
                                         'Valid'}
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                      {[
                                        { label: 'Passport Number', key: 'passport_number', type: 'text' },
                                        { label: 'Place of Issue', key: 'place_of_issue', type: 'text' },
                                        { label: 'Issue Date', key: 'issue_date', type: 'date' },
                                        { label: 'Expiry Date', key: 'expiry_date', type: 'date' },
                                      ].map(({ label, key, type }) => (
                                        <div key={key} className="space-y-1">
                                          <Label className="text-xs">{label}</Label>
                                          <Input
                                            type={type}
                                            value={(editingPassport as Record<string, string>)[key] || ''}
                                            onChange={e => setEditingPassport(p => ({ ...p, [key]: e.target.value }))}
                                            className="h-8 text-sm"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                    <div className="mt-2 space-y-1">
                                      <Label className="text-xs">Admin Notes</Label>
                                      <Textarea
                                        value={editingPassport.admin_notes || ''}
                                        onChange={e => setEditingPassport(p => ({ ...p, admin_notes: e.target.value }))}
                                        rows={2}
                                        className="text-sm"
                                      />
                                    </div>
                                    <div className="flex items-center gap-3 mt-3">
                                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={editingPassport.verified || false}
                                          onChange={e => setEditingPassport(p => ({ ...p, verified: e.target.checked }))}
                                          className="rounded"
                                        />
                                        Mark as Verified
                                      </label>
                                      <Button size="sm" className="gradient-primary text-primary-foreground gap-1 ml-auto" onClick={savePassportEdit}>
                                        <Edit className="h-3.5 w-3.5" /> Save Passport
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
              <Button size="icon" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button size="icon" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
