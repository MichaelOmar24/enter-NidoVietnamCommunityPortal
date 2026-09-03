import { useState, useEffect, useCallback } from 'react';
import { EmbassyLayout } from '@/components/layout/EmbassyLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateCaseReportPdf } from '@/lib/caseReportPdf';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertTriangle, Clock, CheckCircle, XCircle, Eye, FileText,
  Phone, Mail, User, Lock, Scale, RefreshCw, FileDown
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface CaseReport {
  id: string;
  reporter_name: string;
  reporter_email?: string | null;
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
  updated_at?: string;
  is_anonymous?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; classes: string }> = {
  pending: { label: 'Pending Review', icon: Clock, classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  under_review: { label: 'Under Review', icon: RefreshCw, classes: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  resolved: { label: 'Resolved', icon: CheckCircle, classes: 'bg-green-500/15 text-green-400 border-green-500/30' },
  closed: { label: 'Closed', icon: XCircle, classes: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
};

const CASE_LABELS: Record<string, string> = {
  dispute: 'General Dispute', misconduct: 'Misconduct', fraud: 'Fraud / Financial Scam',
  harassment: 'Harassment / Bullying', impersonation: 'Impersonation', other: 'Other',
};

export function EmbassyCaseReports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<CaseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<CaseReport | null>(null);
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('case_reports').select('*').order('created_at', { ascending: false });
    setReports((data || []) as CaseReport[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateCase = async (id: string, status: string) => {
    setUpdating(true);
    const { error } = await supabase.from('case_reports')
      .update({ status, admin_notes: note || null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Case marked as ${STATUS_CONFIG[status]?.label || status}` });
      setSelected(null);
      setNote('');
    }
    setUpdating(false);
    load();
  };

  const filtered = statusFilter === 'all' ? reports : reports.filter(r => r.status === statusFilter);
  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    under_review: reports.filter(r => r.status === 'under_review').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    closed: reports.filter(r => r.status === 'closed').length,
  };

  return (
    <EmbassyLayout title="Consular Desk" subtitle="All reported cases from members and anonymous reporters — full case control">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total Cases', value: stats.total, color: 'text-white' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
          { label: 'Under Review', value: stats.under_review, color: 'text-blue-400' },
          { label: 'Resolved', value: stats.resolved, color: 'text-green-400' },
          { label: 'Closed', value: stats.closed, color: 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="embassy-chart-card p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'all', label: 'All Cases' },
          { key: 'pending', label: 'Pending' },
          { key: 'under_review', label: 'Under Review' },
          { key: 'resolved', label: 'Resolved' },
          { key: 'closed', label: 'Closed' },
        ].map(t => (
          <button key={t.key} onClick={() => setStatusFilter(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${statusFilter === t.key ? 'bg-gold/20 border-gold/40 text-gold' : 'border-embassy-border text-embassy-muted hover:text-embassy-foreground hover:bg-embassy-card'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Cases list */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="embassy-chart-card h-28 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="embassy-chart-card text-center py-20 text-gray-600">
          <Scale className="h-16 w-16 mx-auto mb-3 opacity-30" />
          <p>No case reports {statusFilter !== 'all' ? `with status "${STATUS_CONFIG[statusFilter]?.label}"` : 'submitted yet'}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
            const SIcon = s.icon;
            return (
              <div key={r.id} className="embassy-chart-card p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-bold text-white">{r.title}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border font-medium ${s.classes}`}>
                        <SIcon className="h-2.5 w-2.5" /> {s.label}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border border-white/10 text-gray-400">
                        {CASE_LABELS[r.case_type] || r.case_type}
                      </span>
                      {r.is_anonymous && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-green-500/10 text-green-400 border-green-500/30">
                          <Lock className="h-2.5 w-2.5" /> Anonymous
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-1">
                      <span className="font-medium text-gray-300">{r.is_anonymous ? 'Anonymous Reporter' : r.reporter_name}</span>
                      {' reports against '}
                      <span className="font-medium text-gray-300">{r.reported_name}</span>
                      {' · '}{format(parseISO(r.created_at), 'dd MMM yyyy, HH:mm')}
                    </p>
                    <p className="text-sm text-gray-400 line-clamp-2">{r.description}</p>
                    {r.evidence_urls?.length > 0 && (
                      <p className="text-xs text-gold mt-1 flex items-center gap-1">
                        <FileText className="h-3 w-3" /> {r.evidence_urls.length} evidence file{r.evidence_urls.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline"
                    onClick={() => { setSelected(r); setNote(r.admin_notes || ''); }}
                    className="gap-1 text-xs text-gold border-gold/40 hover:bg-gold/10 shrink-0">
                    <Eye className="h-3 w-3" /> Review Case
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Case Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setNote(''); } }}>
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
                  {selected.is_anonymous ? (
                    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-400/30 gap-1 text-xs">
                      <Lock className="h-3 w-3" /> Anonymous Report
                    </Badge>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-foreground">{selected.reporter_name}</p>
                      {selected.reporter_email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{selected.reporter_email}</p>}
                      {selected.reporter_phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{selected.reporter_phone}</p>}
                    </>
                  )}
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

              {/* Consular Notes */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-1.5">Consular Notes</p>
                <Textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Add internal consular notes about this case..." />
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => updateCase(selected.id, 'under_review')} disabled={updating}
                  className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-300/40 gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Mark Under Review
                </Button>
                <Button size="sm" onClick={() => updateCase(selected.id, 'resolved')} disabled={updating}
                  className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border border-green-300/40 gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Mark Resolved
                </Button>
                <Button size="sm" onClick={() => updateCase(selected.id, 'closed')} disabled={updating}
                  variant="outline" className="gap-1 text-muted-foreground">
                  <XCircle className="h-3.5 w-3.5" /> Close Case
                </Button>
                <Button size="sm" onClick={() => updateCase(selected.id, 'pending')} disabled={updating}
                  variant="outline" className="gap-1 text-amber-600 border-amber-300/40 hover:bg-amber-500/10">
                  <Clock className="h-3.5 w-3.5" /> Reopen as Pending
                </Button>
              </div>

              {/* Document download */}
              <div className="flex gap-2 flex-wrap pt-3 border-t border-border">
                <Button size="sm" onClick={async () => { await generateCaseReportPdf(selected); }}
                  className="gradient-primary text-primary-foreground gap-1.5">
                  <FileDown className="h-3.5 w-3.5" /> Download PDF Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </EmbassyLayout>
  );
}
