import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Heart, QrCode, Banknote, CheckCircle, Clock, Users,
  ChevronDown, ChevronUp, Send, ImageIcon, AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const VND = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

interface Campaign {
  id: string;
  title: string;
  beneficiary_name: string;
  description: string;
  story?: string;
  images: string[];
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  qr_code_url?: string;
  target_amount_vnd?: number;
  created_at: string;
}

interface Donation {
  id: string;
  campaign_id: string;
  donor_id: string;
  amount_vnd: number;
  payment_reference?: string;
  notes?: string;
  status: string;
  created_at: string;
  profiles?: { first_name: string; last_name: string };
}

export function DonationsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donations, setDonations] = useState<Record<string, Donation[]>>({});
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [donateDialog, setDonateDialog] = useState<{ open: boolean; campaign: Campaign | null }>({ open: false, campaign: null });
  const [form, setForm] = useState({ amount: '', payment_reference: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: camps }, { data: myD }] = await Promise.all([
      supabase.from('donation_campaigns').select('*').eq('is_published', true).eq('is_active', true).order('created_at', { ascending: false }),
      profile ? supabase.from('donations').select('*, profiles!donations_donor_id_fkey(first_name, last_name)').eq('donor_id', profile.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    ]);
    const cs = (camps || []) as Campaign[];
    setCampaigns(cs);
    setMyDonations((myD || []) as Donation[]);

    // Load all confirmed donations per campaign (anonymized totals + names)
    if (cs.length > 0) {
      const { data: allD } = await supabase
        .from('donations')
        .select('*, profiles!donations_donor_id_fkey(first_name, last_name)')
        .in('campaign_id', cs.map(c => c.id))
        .eq('status', 'confirmed')
        .order('confirmed_at', { ascending: false });
      const map: Record<string, Donation[]> = {};
      (allD || []).forEach((d: Donation) => {
        if (!map[d.campaign_id]) map[d.campaign_id] = [];
        map[d.campaign_id].push(d);
      });
      setDonations(map);
    }
    setLoading(false);
  };

  const totalRaised = (id: string) => (donations[id] || []).reduce((s, d) => s + Number(d.amount_vnd), 0);

  const submitDonation = async () => {
    if (!donateDialog.campaign || !profile || !form.amount) return;
    const amt = parseFloat(form.amount.replace(/,/g, ''));
    if (!amt || amt <= 0) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }
    setSubmitting(true);
    await supabase.from('donations').insert({
      campaign_id: donateDialog.campaign.id,
      donor_id: profile.id,
      amount_vnd: amt,
      payment_reference: form.payment_reference || null,
      notes: form.notes || null,
      status: 'pending',
    });
    toast({ title: 'Donation logged!', description: 'Admin will confirm after verifying your transfer. You will receive an email receipt.' });
    setForm({ amount: '', payment_reference: '', notes: '' });
    setDonateDialog({ open: false, campaign: null });
    setSubmitting(false);
    load();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero pt-28 pb-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 hero-pattern pointer-events-none opacity-30" />
        <div className="container mx-auto max-w-3xl text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center mx-auto mb-4">
            <Heart className="h-7 w-7 text-rose-300" />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground mb-3">Community Donations</h1>
          <p className="text-primary-foreground/70 text-base max-w-xl mx-auto">
            Support fellow Nigerians in need. Every donation makes a difference.
          </p>
        </div>
      </section>

      {/* My Donations Summary */}
      {myDonations.length > 0 && (
        <div className="bg-primary/5 border-b border-border py-4 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="flex flex-wrap gap-4 items-center">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Heart className="h-4 w-4 text-rose-500" /> My Contributions</p>
              <div className="flex gap-4 text-sm flex-wrap">
                <span className="text-muted-foreground">Total donated: <strong className="text-primary">{VND(myDonations.filter(d => d.status === 'confirmed').reduce((s, d) => s + Number(d.amount_vnd), 0))}</strong></span>
                <span className="text-muted-foreground">Pending: <strong className="text-gold">{myDonations.filter(d => d.status === 'pending').length}</strong></span>
                <span className="text-muted-foreground">Confirmed: <strong className="text-primary">{myDonations.filter(d => d.status === 'confirmed').length}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns */}
      <section className="flex-1 py-10 px-4 bg-muted/20">
        <div className="container mx-auto max-w-4xl space-y-6">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => <Card key={i} className="animate-pulse h-52" />)
          ) : campaigns.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <Heart className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>No active donation campaigns at the moment.</p>
            </div>
          ) : campaigns.map(c => {
            const raised = totalRaised(c.id);
            const donors = (donations[c.id] || []).length;
            const myD = myDonations.filter(d => d.campaign_id === c.id);
            const isOpen = expanded === c.id;

            return (
              <Card key={c.id} className="shadow-card overflow-hidden">
                {/* Campaign Images */}
                {c.images && c.images.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto">
                    {c.images.slice(0, 3).map((img, i) => (
                      <img key={i} src={img} alt="" className="h-48 object-cover flex-1 min-w-[200px]" />
                    ))}
                  </div>
                )}

                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{c.title}</h2>
                      <p className="text-sm text-muted-foreground">Beneficiary: <strong className="text-foreground">{c.beneficiary_name}</strong></p>
                    </div>
                    {myD.length > 0 && (
                      <Badge className="bg-rose-500/10 text-rose-600 border-rose-300/40 shrink-0 gap-1">
                        <Heart className="h-2.5 w-2.5" /> You donated
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{c.description}</p>

                  {/* Progress */}
                  <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Total Raised</p>
                      <p className="text-xl font-bold text-primary">{VND(raised)}</p>
                      {c.target_amount_vnd && <p className="text-xs text-muted-foreground mt-0.5">of {VND(c.target_amount_vnd)} goal</p>}
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Donors</p>
                      <p className="text-xl font-bold text-foreground">{donors}</p>
                    </div>
                    <Button onClick={() => setDonateDialog({ open: true, campaign: c })} className="gradient-primary text-primary-foreground gap-1.5 shrink-0">
                      <Heart className="h-4 w-4" /> Donate
                    </Button>
                  </div>

                  {/* Expand toggle */}
                  <button onClick={() => setExpanded(isOpen ? null : c.id)} className="text-xs text-primary flex items-center gap-1 hover:underline">
                    {isOpen ? <><ChevronUp className="h-3.5 w-3.5" /> Hide details</> : <><ChevronDown className="h-3.5 w-3.5" /> Show bank details & activity</>}
                  </button>

                  {isOpen && (
                    <div className="mt-4 space-y-4">
                      {/* Story */}
                      {c.story && (
                        <div className="p-4 rounded-xl bg-muted/30 border border-border">
                          <p className="text-sm font-semibold text-foreground mb-2">Full Story</p>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{c.story}</p>
                        </div>
                      )}

                      {/* Bank Details */}
                      {(c.bank_name || c.account_number) && (
                        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><Banknote className="h-4 w-4 text-primary" /> Bank Transfer Details</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {c.bank_name && <><span className="text-muted-foreground">Bank</span><span className="font-medium text-foreground">{c.bank_name}</span></>}
                            {c.account_name && <><span className="text-muted-foreground">Account Name</span><span className="font-medium text-foreground">{c.account_name}</span></>}
                            {c.account_number && <><span className="text-muted-foreground">Account No.</span><span className="font-bold text-primary text-base">{c.account_number}</span></>}
                          </div>
                          {c.qr_code_url && (
                            <div className="mt-3 flex items-start gap-3">
                              <img src={c.qr_code_url} alt="QR Code" className="w-28 h-28 rounded-lg border border-border object-contain bg-white" />
                              <div>
                                <p className="text-xs font-medium text-foreground flex items-center gap-1"><QrCode className="h-3.5 w-3.5" /> Scan to Pay</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Scan QR code with your banking app to transfer funds.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Donation Activity */}
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> Donation Activity</p>
                        {(donations[c.id] || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No confirmed donations yet. Be the first!</p>
                        ) : (
                          <div className="space-y-2">
                            {(donations[c.id] || []).map(d => (
                              <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <Heart className="h-3.5 w-3.5 text-rose-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{d.profiles?.first_name} {d.profiles?.last_name}</p>
                                  <p className="text-xs text-muted-foreground">{format(parseISO(d.created_at), 'dd MMM yyyy')}</p>
                                </div>
                                <p className="font-bold text-primary text-sm">{VND(Number(d.amount_vnd))}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* My donations for this campaign */}
                      {myD.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">My Donations for This Campaign</p>
                          {myD.map(d => (
                            <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card">
                              <Badge className={`text-[10px] border ${d.status === 'confirmed' ? 'bg-primary/10 text-primary border-primary/30' : d.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-gold/10 text-gold border-gold/30'}`}>
                                {d.status === 'confirmed' ? <CheckCircle className="h-2.5 w-2.5 mr-1 inline" /> : <Clock className="h-2.5 w-2.5 mr-1 inline" />}
                                {d.status}
                              </Badge>
                              <span className="text-sm font-bold text-foreground">{VND(Number(d.amount_vnd))}</span>
                              {d.payment_reference && <span className="text-xs text-muted-foreground">Ref: {d.payment_reference}</span>}
                              <span className="text-xs text-muted-foreground ml-auto">{format(parseISO(d.created_at), 'dd MMM yyyy')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Donate Dialog */}
      <Dialog open={donateDialog.open} onOpenChange={o => setDonateDialog(v => ({ ...v, open: o }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" /> Log My Donation
            </DialogTitle>
          </DialogHeader>
          {donateDialog.campaign && (
            <div className="space-y-4 pt-1">
              <div className="rounded-lg bg-muted/30 border border-border p-3 text-sm">
                <p className="font-medium text-foreground">{donateDialog.campaign.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5">Beneficiary: {donateDialog.campaign.beneficiary_name}</p>
              </div>
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Please transfer to the bank account first, then log your donation here with the reference number.
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Amount (VND) *</Label>
                <Input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 500000" className="h-9 text-sm" type="number" min="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Payment Reference / Transaction ID</Label>
                <Input value={form.payment_reference} onChange={e => setForm(f => ({ ...f, payment_reference: e.target.value }))} placeholder="Bank transaction ref..." className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Notes (optional)</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-sm" placeholder="Any message..." />
              </div>
              <div className="flex gap-2">
                <Button onClick={submitDonation} disabled={submitting} className="flex-1 gradient-primary text-primary-foreground gap-1.5">
                  <Send className="h-4 w-4" /> {submitting ? 'Submitting...' : 'Submit Donation'}
                </Button>
                <Button variant="outline" onClick={() => setDonateDialog({ open: false, campaign: null })} className="flex-1">Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
