import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateRecommendationLetterPdf } from '@/lib/recommendationLetterPdf';
import { Stamp, Send, Loader2, Clock, Search, CheckCircle, XCircle, FileDown, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const PURPOSES: Record<string, string> = {
  etc: 'Emergency Travel Certificate (ETC) — lost/expired passport',
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

interface RecRequest {
  id: string;
  purpose: string;
  details: string;
  passport_number?: string | null;
  status: string;
  letter_content?: string | null;
  admin_notes?: string | null;
  created_at: string;
}

export function RecommendationPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RecRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [form, setForm] = useState({ purpose: 'etc', passport_number: '', details: '' });

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('recommendation_requests' as never)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRequests((data || []) as unknown as RecRequest[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!user || !profile) return;
    if (!form.details.trim()) {
      toast({ title: 'Details required', description: 'Please explain what you need the recommendation letter for.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('recommendation_requests' as never).insert({
      user_id: user.id,
      purpose: form.purpose,
      passport_number: form.passport_number || null,
      details: form.details.trim(),
    } as never);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Request failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Request submitted', description: 'The admin team will review your request and issue the letter to your email.' });
    setForm({ purpose: 'etc', passport_number: '', details: '' });
    setShowForm(false);
    load();
  };

  const downloadLetter = async (req: RecRequest) => {
    if (!req.letter_content || !profile) return;
    setDownloading(req.id);
    try {
      await generateRecommendationLetterPdf({
        memberName: `${profile.first_name} ${profile.last_name}`.trim(),
        passportNumber: req.passport_number || undefined,
        letterContent: req.letter_content,
      });
    } finally {
      setDownloading(null);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pt-[104px] pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Stamp className="h-7 w-7 text-primary" /> Recommendation Letter
              </h1>
              <p className="text-muted-foreground mt-2">
                Request an official NIDO Vietnam recommendation letter for the Nigerian Embassy (e.g. Emergency Travel Certificate when your passport is lost or expired).
              </p>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="gradient-primary text-primary-foreground gap-2">
                <Send className="h-4 w-4" /> Request Letter
              </Button>
            )}
          </div>

          {/* Request form */}
          {showForm && (
            <Card className="shadow-card mb-8 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base">New Recommendation Request</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Purpose *</Label>
                  <Select value={form.purpose} onValueChange={v => setForm(f => ({ ...f, purpose: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PURPOSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Passport Number (if available)</Label>
                  <Input value={form.passport_number} onChange={e => setForm(f => ({ ...f, passport_number: e.target.value }))} placeholder="e.g. B00144359" />
                </div>
                <div className="space-y-1.5">
                  <Label>Details of Your Request *</Label>
                  <Textarea
                    rows={6}
                    value={form.details}
                    onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
                    placeholder="Explain exactly what you need — e.g. your passport has expired, your current visa situation, where you reside in Vietnam, and why you need the ETC. The more detail you give, the faster the letter can be issued."
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</Button>
                  <Button className="flex-1 gap-2 gradient-primary text-primary-foreground" onClick={submit} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* My requests */}
          <h2 className="text-lg font-bold text-foreground mb-4">My Requests</h2>
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No recommendation requests yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => {
                const s = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                const SIcon = s.icon;
                return (
                  <Card key={req.id} className="shadow-card">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                          <Stamp className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-foreground text-sm">{PURPOSES[req.purpose] || req.purpose}</p>
                            <Badge className={`text-[10px] border gap-1 ${s.color}`}><SIcon className="h-2.5 w-2.5" /> {s.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{req.details}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">Submitted {format(parseISO(req.created_at), 'dd MMM yyyy')}</p>
                          {req.status === 'rejected' && req.admin_notes && (
                            <p className="text-xs text-destructive mt-2 bg-destructive/5 rounded-lg p-2 border border-destructive/20">{req.admin_notes}</p>
                          )}
                        </div>
                        {req.status === 'issued' && req.letter_content && (
                          <Button size="sm" className="gap-1.5 gradient-primary text-primary-foreground shrink-0"
                            onClick={() => downloadLetter(req)} disabled={downloading === req.id}>
                            {downloading === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                            Download Letter
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
