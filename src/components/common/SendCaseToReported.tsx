import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildCoverNote, generateCasePresentationPdf } from '@/lib/casePresentation';
import type { CaseReportData } from '@/lib/caseReportPdf';
import { filesToAttachments, type EmailAttachment } from '@/lib/emailAttachments';
import { Mail, Phone, Send, Loader2, FileDown, FileText, AlertTriangle, MessageCircle, User } from 'lucide-react';

interface SendCaseToReportedProps {
  report: CaseReportData | null;
  open: boolean;
  onClose: () => void;
}

const MAX_EVIDENCE_ATTACH = 5;

async function urlToAttachment(url: string, index: number): Promise<EmailAttachment | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size > 8 * 1024 * 1024) return null; // skip files over 8MB
    const ext = url.split('.').pop()?.split('?')[0] || 'bin';
    const file = new File([blob], `evidence-${index + 1}.${ext}`, { type: blob.type });
    const [attachment] = await filesToAttachments([file]);
    return attachment;
  } catch {
    return null;
  }
}

export function SendCaseToReported({ report, open, onClose }: SendCaseToReportedProps) {
  const [coverNote, setCoverNote] = useState('');
  const [subject, setSubject] = useState('');
  const [evidence, setEvidence] = useState<EmailAttachment[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const hasEmail = !!report?.reported_email;
  const hasPhone = !!report?.reported_phone;
  const whatsappNumber = (report?.reported_phone || '').replace(/[^0-9]/g, '');

  // Reset form when a new report is opened
  useEffect(() => {
    if (open && report) {
      setCoverNote(buildCoverNote(report));
      setSubject(`Request for Urgent Meeting and Resolution Regarding Official Case Report — ${report.title}`);
      setEvidence([]);
      // Pre-load evidence files so they're ready to attach
      const urls = (report.evidence_urls || []).slice(0, MAX_EVIDENCE_ATTACH);
      if (urls.length > 0) {
        setLoadingEvidence(true);
        Promise.all(urls.map((u, i) => urlToAttachment(u, i)))
          .then(results => setEvidence(results.filter((a): a is EmailAttachment => a !== null)))
          .finally(() => setLoadingEvidence(false));
      }
    }
  }, [open, report]);

  if (!report) return null;

  const handleSendEmail = async () => {
    if (!hasEmail) return;
    setSending(true);
    try {
      // Generate the official case-notice PDF and attach it alongside the evidence files
      const pdfBase64 = (await generateCasePresentationPdf(report, coverNote, 'base64')) as string;
      const attachments: EmailAttachment[] = [
        { filename: `official-case-notice-${report.id.slice(0, 8)}.pdf`, content: pdfBase64, contentType: 'application/pdf' },
        ...evidence,
      ];
      const { data, error } = await supabase.functions.invoke('send-member-email', {
        body: {
          to: report.reported_email,
          toName: report.reported_name,
          subject,
          message: coverNote,
          attachments,
        },
      });
      if (error || data?.error) {
        toast({ title: 'Failed to send', description: data?.error || error?.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Case notice sent', description: `Delivered to ${report.reported_email}` });
      onClose();
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await generateCasePresentationPdf(report, coverNote, 'save');
      toast({ title: 'Letter downloaded', description: 'Send the PDF to the reported party via WhatsApp or SMS.' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Send Case Notice to Reported Party
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Recipient */}
          <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 space-y-1.5">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide flex items-center gap-1">
              <User className="h-3 w-3" /> Recipient — Reported Party
            </p>
            <p className="text-sm font-semibold text-foreground">{report.reported_name}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {hasEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{report.reported_email}</span>}
              {hasPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{report.reported_phone}</span>}
              {!hasEmail && !hasPhone && <span className="text-destructive">No contact details on file for this person.</span>}
            </div>
          </div>

          {/* Delivery mode notice */}
          {hasEmail ? (
            <div className="rounded-md bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
              The cover letter, official case-notice PDF and {evidence.length} evidence file(s) will be emailed to <strong>{report.reported_email}</strong> from info@nidovietnam.com.
            </div>
          ) : (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>No email address on file — download the official letter as a PDF and send it to the mobile number <strong>{report.reported_phone || '—'}</strong> (e.g. via WhatsApp).</span>
            </div>
          )}

          {/* Subject (email mode) */}
          {hasEmail && (
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
          )}

          {/* Cover note */}
          <div className="space-y-1.5">
            <Label>Cover Letter (editable)</Label>
            <Textarea
              rows={14}
              value={coverNote}
              onChange={e => setCoverNote(e.target.value)}
              className="resize-y text-sm leading-relaxed"
            />
          </div>

          {/* Evidence status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {loadingEvidence
              ? 'Preparing evidence attachments...'
              : report.evidence_urls?.length
                ? `${evidence.length} of ${Math.min(report.evidence_urls.length, MAX_EVIDENCE_ATTACH)} evidence file(s) ready to attach${report.evidence_urls.length > MAX_EVIDENCE_ATTACH ? ` (first ${MAX_EVIDENCE_ATTACH} only)` : ''}`
                : 'No evidence files attached to this case'}
            {loadingEvidence && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap pt-2 border-t border-border">
            {hasEmail ? (
              <Button
                className="flex-1 gap-2 gradient-primary text-primary-foreground"
                onClick={handleSendEmail}
                disabled={sending || loadingEvidence || !coverNote.trim() || !subject.trim()}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'Sending...' : 'Send Case Notice Email'}
              </Button>
            ) : (
              <>
                <Button
                  className="flex-1 gap-2 gradient-primary text-primary-foreground"
                  onClick={handleDownload}
                  disabled={downloading || !coverNote.trim()}
                >
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  {downloading ? 'Preparing PDF...' : 'Download Letter (PDF)'}
                </Button>
                {whatsappNumber && (
                  <Button
                    variant="outline"
                    className="gap-2 text-green-700 border-green-600/40 hover:bg-green-600/10"
                    onClick={() => window.open(`https://wa.me/${whatsappNumber}`, '_blank', 'noopener,noreferrer')}
                  >
                    <MessageCircle className="h-4 w-4" /> Open WhatsApp
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" onClick={onClose} disabled={sending || downloading}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
