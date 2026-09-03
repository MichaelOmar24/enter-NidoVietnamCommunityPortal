import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Mail, Send, Users, Phone, MapPin, Loader2, Copy, CheckCheck, MailPlus } from 'lucide-react';

interface MemberContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  vietnam_address: string | null;
  vietnam_city: string | null;
  membership_status: string;
  membership_type: string;
}

export function AdminContacts() {
  const [members, setMembers] = useState<MemberContact[]>([]);
  const [filtered, setFiltered] = useState<MemberContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [directTarget, setDirectTarget] = useState<MemberContact | null>(null);
  const [directForm, setDirectForm] = useState({ subject: '', message: '' });
  const [directSending, setDirectSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadMembers(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      members.filter(m =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone || '').includes(q) ||
        (m.vietnam_city || '').toLowerCase().includes(q)
      )
    );
  }, [search, members]);

  const loadMembers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone, vietnam_address, vietnam_city, membership_status, membership_type')
      .order('first_name', { ascending: true });
    setMembers((data as MemberContact[]) || []);
    setFiltered((data as MemberContact[]) || []);
    setLoading(false);
  };

  const handleCopyEmails = () => {
    const emails = filtered.map(m => m.email).join(', ');
    navigator.clipboard.writeText(emails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied', description: `${filtered.length} email address(es) copied to clipboard.` });
  };

  const handleBroadcast = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      toast({ title: 'Missing fields', description: 'Please enter a subject and message.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-broadcast-email', {
        body: { subject: form.subject, message: form.message, senderName: 'NIDO Vietnam Admin' },
      });
      if (error) throw error;
      toast({
        title: 'Broadcast Sent',
        description: `Email delivered to ${data.sent} member(s).${data.failed > 0 ? ` ${data.failed} failed.` : ''}`,
      });
      setBroadcastOpen(false);
      setForm({ subject: '', message: '' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to send broadcast. Please try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleDirectEmail = async () => {
    if (!directTarget || !directForm.subject.trim() || !directForm.message.trim()) {
      toast({ title: 'Missing fields', description: 'Please enter a subject and message.', variant: 'destructive' });
      return;
    }
    setDirectSending(true);
    const { data, error } = await supabase.functions.invoke('send-member-email', {
      body: {
        to: directTarget.email,
        toName: `${directTarget.first_name} ${directTarget.last_name}`,
        subject: directForm.subject,
        message: directForm.message,
      },
    });
    setDirectSending(false);
    if (error || data?.error) {
      toast({ title: 'Failed to send', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Email sent', description: `Delivered to ${directTarget.email}` });
    setDirectTarget(null);
    setDirectForm({ subject: '', message: '' });
  };

  const statusBadge = (status: string) => {    if (status === 'active') return <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">Active</Badge>;
    if (status === 'pending') return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">Pending</Badge>;
    return <Badge className="bg-muted text-muted-foreground text-[10px]">{status}</Badge>;
  };

  return (
    <AdminLayout title="Contacts & Broadcast Email">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{members.length}</p>
              <p className="text-xs text-muted-foreground">Total Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{members.filter(m => m.email).length}</p>
              <p className="text-xs text-muted-foreground">Email Addresses</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
              <Send className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{members.filter(m => m.membership_status === 'active').length}</p>
              <p className="text-xs text-muted-foreground">Active Members</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleCopyEmails} className="shrink-0 gap-2">
          {copied ? <CheckCheck className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : `Copy ${filtered.length} Emails`}
        </Button>
        <Button onClick={() => setBroadcastOpen(true)} className="shrink-0 gap-2">
          <Send className="h-4 w-4" />
          Send Broadcast Email
        </Button>
      </div>

      {/* Contacts Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Member Contact Directory
            {search && <span className="text-muted-foreground font-normal">— {filtered.length} result(s)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading contacts...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No contacts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">#</th>
                    <th className="pb-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Name</th>
                    <th className="pb-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Email</th>
                    <th className="pb-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Phone</th>
                    <th className="pb-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">City / Address</th>
                    <th className="pb-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Status</th>
                    <th className="pb-3 pl-2 text-muted-foreground font-medium text-xs uppercase tracking-wide">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => (
                    <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 text-muted-foreground">{i + 1}</td>
                      <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap">
                        {m.first_name} {m.last_name}
                      </td>
                      <td className="py-3 pr-4">
                        <a
                          href={`mailto:${m.email}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3 shrink-0" />
                          {m.email}
                        </a>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {m.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            {m.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground max-w-[200px]">
                        {m.vietnam_city || m.vietnam_address ? (
                          <span className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                            <span className="truncate">
                              {[m.vietnam_city, m.vietnam_address].filter(Boolean).join(', ')}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3">{statusBadge(m.membership_status)}</td>
                      <td className="py-3 pl-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setDirectTarget(m); setDirectForm({ subject: '', message: '' }); }}
                          className="gap-1 text-xs text-primary border-primary hover:bg-primary/10"
                          title={`Send email to ${m.first_name}`}
                        >
                          <MailPlus className="h-3 w-3" /> Email
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Broadcast Email Dialog */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Broadcast Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-md bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
              This email will be sent to all <strong>{members.length}</strong> registered member(s) at once.
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g. Urgent Notice — Community Meeting"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here. Each member will receive a personalised email addressed to their name..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={8}
                className="resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setBroadcastOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={handleBroadcast} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'Sending...' : `Send to All ${members.length} Members`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Direct Member Email Dialog */}
      <Dialog open={!!directTarget} onOpenChange={o => { if (!o) { setDirectTarget(null); setDirectForm({ subject: '', message: '' }); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MailPlus className="h-5 w-5 text-primary" />
              Email {directTarget?.first_name} {directTarget?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-md bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
              Sending to <strong>{directTarget?.email}</strong> from info@nidovietnam.com
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="direct-subject">Subject</Label>
              <Input
                id="direct-subject"
                placeholder="e.g. Your membership renewal"
                value={directForm.subject}
                onChange={e => setDirectForm(f => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="direct-message">Message</Label>
              <Textarea
                id="direct-message"
                placeholder="Type your message to this member..."
                value={directForm.message}
                onChange={e => setDirectForm(f => ({ ...f, message: e.target.value }))}
                rows={8}
                className="resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDirectTarget(null)} disabled={directSending}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={handleDirectEmail} disabled={directSending}>
                {directSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {directSending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
