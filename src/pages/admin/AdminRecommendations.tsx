import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateRecommendationLetterPdf } from '@/lib/recommendationLetterPdf';
import { Stamp, Clock, Search, CheckCircle, XCircle, Eye, Loader2, FileDown, Mail, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const NL = String.fromCharCode(10);

interface RecRequest {
  id: string;
  user_id: string;
  purpose: string;
  details: string;
  passport_number?: string | null;
  status: string;
  letter_content?: string | null;
  admin_notes?: string | null;
  created_at: string;
  profiles?: { first_name: string; last_name: string; email: string; phone?: string | null; vietnam_city?: string | null };
}

const PURPOSES: Record<string, string> = {
  etc: 'Emergency Travel Certificate (ETC)',
  passport_renewal: 'Passport Renewal',
  visa_application: 'Visa Application',
  bank_account: 'Bank Account Opening',
  other: 'Other Official Purpose',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Review', color: 'bg-gold/15 text-gold border-gold/30', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: Search },
  issued: { label: 'Letter Issued', color: 'bg-green-500/15 text-green-700 border-green-500/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
};

function buildDefaultLetter(req: RecRequest): string {
  const name = req.profiles ? `${req.profiles.first_name} ${req.profiles.last_name}`.trim() : 'the member';
  const passportLine = req.passport_number ? ` with Passport number ${req.passport_number}` : '';
  const purposeText: Record<string, string> = {
    etc: "to aid their application for an Emergency Travel Certificate (ETC). The bearer's International Passport is expired or lost.",
    passport_renewal: 'to support their Nigerian passport renewal application.',
    visa_application: 'to support their visa application.',
    bank_account: 'to support their application to open a bank account.',
    other: 'for the official purpose stated in their request.',
  };
  return [
    `I, DR. Michael Omar, am pleased to be writing this recommendation letter on behalf of the individual mentioned above, a citizen of Nigeria${passportLine}. Resident temporarily in Vietnam.`,
    ``,
    `I write this recommendation for ${name} ${purposeText[req.purpose] || purposeText.other}`,
    ``,
    req.details,
    ``,
    `I am unaware of any ongoing conflicts or personal issues among Nigerian community members or Vietnamese residents concerning this individual.`,
    ``,
    `I respectfully request the embassy's assistance with this matter.`,
  ].join(NL);
}

export function AdminRecommendations() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<RecRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RecRequest | null>(null);
  const [letter, setLetter] = useState('');
  const [recipientName, setRecipientName] = useState('Mrs. Hannatu Karau');
  const [signerName, setSignerName] = useState('DR. Michael Omar');
  const [adminNote, setAdminNote] = useState('');
  const [working, setWorking] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recommendation_requests' as never)
      .select('*, profiles!recommendation_requests_user_id_fkey(first_name, last_name, email, phone, vietnam_city)')
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Failed to load requests', description: error.message, variant: 'destructive' });
    setRequests((data || []) as unknown as RecRequest[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openReview = (req: RecRequest) => {
    setSelected(req);
    setLetter(req.letter_content || buildDefaultLetter(req));
    setAdminNote(req.admin_notes || '');
  };

  const filtered = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter);

  const issueLetter = async (sendEmail: boolean) => {
    if (!selected) return;
    if (!letter.trim()) {
      toast({ title: 'Letter is empty', description: 'Please write the letter content first.', variant: 'destructive' });
      return;
    }
    setWorking(true);
    try {
      const memberName = selected.profiles ? `${selected.profiles.first_name} ${selected.profiles.last_name}`.trim() : 'Member';
      const memberEmail = selected.profiles?.email;

      // Generate the letterhead PDF
      const pdfBase64 = (await generateRecommendationLetterPdf({
        memberName,
        passportNumber: selected.passport_number,
        letterContent: letter,
        recipientName,
        signerName,
      }, 'base64')) as string;

      // Save letter + status
      const { error } = await supabase.from('recommendation_requests' as never).update({
        status: 'issued',
        letter_content: letter,
        admin_notes: adminNote || null,
        updated_at: new Date().toISOString(),
      } as never).eq('id', selected.id);
      if (error) throw new Error(error.message);

      // Email the letter to the member
      if (sendEmail && memberEmail) {
        const emailMessage = [
          `Dear ${memberName},`,
          ``,
          `Your recommendation letter request has been approved. Please find your official NIDO Vietnam recommendation letter attached as a PDF.`,
          ``,
          adminNote ? `Note from admin: ${adminNote}` : `Present this letter to the Nigerian Embassy as required.`,
          ``,
          `Sincerely,`,
          `NIDO Vietnam Admin`,
        ].join(NL);
        const { data: fnData, error: fnErr } = await supabase.functions.invoke('send-member-email', {
          body: {
            to: memberEmail,
            toName: memberName,
            subject: `Your NIDO Vietnam Recommendation Letter — ${PURPOSES[selected.purpose] || selected.purpose}`,
            message: emailMessage,
            attachments: [{ filename: `recommendation-letter-${memberName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`, content: pdfBase64, contentType: 'application/pdf' }],
          },
        });
        if (fnErr || fnData?.error) {
          toast({ title: 'Letter issued but email failed', description: fnData?.error || fnErr?.message, variant: 'destructive' });
          setWorking(false);
          setSelected(null);
          load();
          return;
        }
      }

      toast({ title: 'Letter issued', description: sendEmail && memberEmail ? `PDF emailed to ${memberEmail}` : 'Letter issued and saved.' });
      setSelected(null);
      load();
    } catch (err) {
      toast({ title: 'Failed to issue letter', description: String(err), variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  };

  const downloadOnly = async () => {
    if (!selected || !letter.trim()) return;
    setWorking(true);
    try {
      const memberName = selected.profiles ? `${selected.profiles.first_name} ${selected.profiles.last_name}`.trim() : 'Member';
      await generateRecommendationLetterPdf({
        memberName,
        passportNumber: selected.passport_number,
        letterContent: letter,
        recipientName,
        signerName,
      });
    } finally {
      setWorking(false);
    }
  };

  const rejectRequest = async () => {
    if (!selected) return;
    setWorking(true);
    const { error } = await supabase.from('recommendation_requests' as never).update({
      status: 'rejected',
      admin_notes: adminNote || null,
      updated_at: new Date().toISOString(),
    } as never).eq('id', selected.id);
    setWorking(false);
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Request rejected' });
    setSelected(null);
    load();
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    issued: requests.filter(r => r.status === 'issued').length,
  };

  return (
    <AdminLayout title="Recommendation Letters">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Requests', value: stats.total, color: 'text-foreground' },
          { label: 'Pending', value: stats.pending, color: 'text-gold' },
          { label: 'Issued', value: stats.issued, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'pending', 'issued', 'rejected'].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${statusFilter === f ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'}`}>
            {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading requests...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Stamp className="h-16 w-16 mx-auto mb-3 opacity-30" />
          <p>No recommendation requests{statusFilter !== 'all' ? ` with this status` : ''}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
            const SIcon = s.icon;
            return (
              <Card key={r.id} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <Stamp className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-bold text-foreground">{r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : 'Member'}</p>
                        <Badge className={`text-[10px] border gap-1 ${s.color}`}><SIcon className="h-2.5 w-2.5" /> {s.label}</Badge>
                        <Badge className="text-[10px] border bg-muted text-muted-foreground">{PURPOSES[r.purpose] || r.purpose}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <User className="h-3 w-3" />{r.profiles?.email}
                        {r.passport_number && <> · Passport: {r.passport_number}</>}
                        {' · '}{format(parseISO(r.created_at), 'dd MMM yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{r.details}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openReview(r)}
                      className="gap-1 text-xs text-primary border-primary hover:bg-primary/10 shrink-0">
                      <Eye className="h-3 w-3" /> Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stamp className="h-4 w-4 text-primary" />
              Recommendation Request — {selected?.profiles ? `${selected.profiles.first_name} ${selected.profiles.last_name}` : ''}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              {/* Member + request info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">Member</p>
                  <p className="text-sm font-semibold text-foreground">{selected.profiles?.first_name} {selected.profiles?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{selected.profiles?.email}</p>
                  {selected.profiles?.phone && <p className="text-xs text-muted-foreground">{selected.profiles.phone}</p>}
                  {selected.profiles?.vietnam_city && <p className="text-xs text-muted-foreground">{selected.profiles.vietnam_city}</p>}
                </div>
                <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Request</p>
                  <p className="text-sm font-semibold text-foreground">{PURPOSES[selected.purpose] || selected.purpose}</p>
                  {selected.passport_number && <p className="text-xs text-muted-foreground">Passport: {selected.passport_number}</p>}
                  <p className="text-xs text-muted-foreground">{format(parseISO(selected.created_at), 'dd MMM yyyy, HH:mm')}</p>
                </div>
              </div>

              {/* Member's stated details */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Member's Request Details</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted/30 rounded-lg p-3 border border-border">{selected.details}</p>
              </div>

              {/* Letterhead settings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Recipient (Head of Mission)</Label>
                  <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Signer Name</Label>
                  <Input value={signerName} onChange={e => setSignerName(e.target.value)} />
                </div>
              </div>

              {/* Editable letter */}
              <div className="space-y-1.5">
                <Label>Letter Content (fully editable)</Label>
                <Textarea rows={12} value={letter} onChange={e => setLetter(e.target.value)} className="resize-y text-sm leading-relaxed" />
                <p className="text-[11px] text-muted-foreground">Rendered on the official NIDO Vietnam letterhead with logo, seal and signature.</p>
              </div>

              {/* Admin note */}
              <div className="space-y-1.5">
                <Label>Admin Note (optional — included in the member's email)</Label>
                <Textarea rows={2} value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="e.g. instructions for the embassy appointment..." />
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap pt-3 border-t border-border">
                <Button onClick={() => issueLetter(true)} disabled={working}
                  className="flex-1 gap-2 gradient-primary text-primary-foreground">
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {working ? 'Issuing...' : 'Issue Letter & Email to Member'}
                </Button>
                <Button variant="outline" onClick={downloadOnly} disabled={working} className="gap-2">
                  <FileDown className="h-4 w-4" /> Download PDF
                </Button>
                <Button variant="outline" onClick={rejectRequest} disabled={working}
                  className="gap-2 text-destructive border-destructive/50 hover:bg-destructive/10">
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
