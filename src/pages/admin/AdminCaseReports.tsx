import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Clock, CheckCircle, XCircle, Eye, FileText, Phone, Mail, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface CaseReport {
  id: string;
  reporter_name: string;
  reporter_email: string;
  reporter_phone?: string;
  reported_name: string;
  reported_email?: string;
  reported_phone?: string;
  reported_relationship: string;
  case_type: string;
  title: string;
  description: string;
  evidence_urls: string[];
  status: string;
  admin_notes?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Review', color: 'bg-gold/20 text-gold border-gold/30', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-primary/10 text-primary border-primary/30', icon: Eye },
  resolved: { label: 'Resolved', color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-300/40', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-muted text-muted-foreground border-border', icon: XCircle },
};

const CASE_LABELS: Record<string, string> = {
  dispute: 'General Dispute', misconduct: 'Misconduct', fraud: 'Fraud / Financial Scam',
  harassment: 'Harassment / Bullying', impersonation: 'Impersonation', other: 'Other',
};

export function AdminCaseReports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<CaseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CaseReport | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('case_reports').select('*').order('created_at', { ascending: false });
    setReports((data || []) as CaseReport[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    await supabase.from('case_reports').update({ status, admin_notes: adminNote || null, updated_at: new Date().toISOString() }).eq('id', id);
    toast({ title: `Case marked as ${status}` });
    setUpdating(false);
    setSelected(null);
    setAdminNote('');
    load();
  };

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    under_review: reports.filter(r => r.status === 'under_review').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
  };

  return (
    <AdminLayout title="Case Reports">
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Reports', value: stats.total, color: 'text-foreground' },
          { label: 'Pending', value: stats.pending, color: 'text-gold' },
          { label: 'Under Review', value: stats.under_review, color: 'text-primary' },
          { label: 'Resolved', value: stats.resolved, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse h-28" />)}</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <AlertTriangle className="h-16 w-16 mx-auto mb-3 opacity-30" />
          <p>No case reports submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => {
            const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
            const SIcon = s.icon;
            return (
              <Card key={r.id} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-bold text-foreground">{r.title}</p>
                        <Badge className={`text-[10px] border gap-1 ${s.color}`}>
                          <SIcon className="h-2.5 w-2.5" /> {s.label}
                        </Badge>
                        <Badge className="text-[10px] border bg-muted text-muted-foreground">
                          {CASE_LABELS[r.case_type] || r.case_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        <span className="font-medium text-foreground">{r.reporter_name}</span> reports against <span className="font-medium text-foreground">{r.reported_name}</span>
                        {' · '}{format(parseISO(r.created_at), 'dd MMM yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                      {r.evidence_urls?.length > 0 && (
                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {r.evidence_urls.length} evidence file{r.evidence_urls.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setSelected(r); setAdminNote(r.admin_notes || ''); }}
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

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setAdminNote(''); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              {selected?.title}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              {/* Contacts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1"><User className="h-3 w-3" /> Reporter</p>
                  <p className="text-sm font-semibold text-foreground">{selected.reporter_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{selected.reporter_email}</p>
                  {selected.reporter_phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{selected.reporter_phone}</p>}
                </div>
                <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wide flex items-center gap-1"><User className="h-3 w-3" /> Reported</p>
                  <p className="text-sm font-semibold text-foreground">{selected.reported_name}</p>
                  {selected.reported_email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{selected.reported_email}</p>}
                  {selected.reported_phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{selected.reported_phone}</p>}
                  <p className="text-xs text-muted-foreground capitalize">Relationship: {selected.reported_relationship}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Detailed Description</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted/30 rounded-lg p-3 border border-border">{selected.description}</p>
              </div>

              {/* Evidence */}
              {selected.evidence_urls?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Evidence Files ({selected.evidence_urls.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selected.evidence_urls.map((url, i) => (
                      url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-24 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity" />
                        </a>
                      ) : (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-muted/30 hover:bg-primary/5 transition-colors text-xs text-primary">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          Document {i + 1}
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Note */}
              <div>
                <Label className="text-sm mb-1.5 block">Admin Notes</Label>
                <Textarea rows={3} value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Add internal notes about this case..." />
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => updateStatus(selected.id, 'under_review')} disabled={updating}
                  className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 gap-1">
                  <Eye className="h-3.5 w-3.5" /> Mark Under Review
                </Button>
                <Button size="sm" onClick={() => updateStatus(selected.id, 'resolved')} disabled={updating}
                  className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border border-green-300/40 gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Mark Resolved
                </Button>
                <Button size="sm" onClick={() => updateStatus(selected.id, 'closed')} disabled={updating}
                  variant="outline" className="gap-1 text-muted-foreground">
                  <XCircle className="h-3.5 w-3.5" /> Close Case
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
