import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildResolutionLetter } from '@/lib/caseResolution';
import { generateCasePresentationPdf } from '@/lib/casePresentation';
import type { CaseReportData } from '@/lib/caseReportPdf';
import { Mail, Send, Loader2, FileDown, FileText, CheckCircle, MessageCircle, Users, AlertTriangle } from 'lucide-react';

interface ResolveCaseDialogProps {
  report: CaseReportData | null;
  open: boolean;
  onClose: () => void;
  onResolved: () => void;
}

const MAX_PDF_BASE64 = 8 * 1024 * 1024;

export function ResolveCaseDialog({ report, open, onClose, onResolved }: ResolveCaseDialogProps) {
  const [letter, setLetter] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const reporterEmail = report?.reporter_email || null;
  const reportedEmail = report?.reported_email || null;
  const recipientCount = (reporterEmail ? 1 : 0) + (reportedEmail ? 1 : 0);
  const phoneNumbers = [report?.reporter_phone, report?.reported_phone].filter(Boolean) as string[];
  const whatsappNumber = phoneNumbers[0]?.replace(/[^0-9]/g, '') || '';
  const evidenceUrls = report?.evidence_urls || [];

  useEffect(() => {
    if (open && report) {
      setLetter(buildResolutionLetter(report, report.admin_notes || ''));
      setSubject(`Official Case Resolution — ${report.title} | NIDO Vietnam`);
    }
  }, [open, report]);

  if (!report) return null;

  const closeCaseInSystem = async () => {
    const { error } = await supabase
      .from('case_reports')
      .update({ status: 'resolved', admin_notes: letter, updated_at: new Date().toISOString() })
      .eq('id', report.id);
    if (error) throw new Error(error.message);
  };

  const handleSendAndClose = async () => {
    setSending(true);
    try {
      // 1. Resolution PDF (evidence embedded) — attach if small enough
      let attachments: { filename: string; content: string; contentType: string }[] = [];
      let pdfAttached = true;
      try {
        const pdfBase64 = (await generateCasePresentationPdf(report, letter, 'base64', 'Case Resolution')) as string;
        if (pdfBase64.length <= MAX_PDF_BASE64) {
          attachments = [{ filename: `case-resolution-${report.id.slice(0, 8)}.pdf`, content: pdfBase64, contentType: 'application/pdf' }];
        } else {
          pdfAttached = false;
        }
      } catch {
        pdfAttached = false;
      }

      const evidenceSection = evidenceUrls.length > 0
        ? `\n\nEvidence files:\n${evidenceUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')}`
        : '';

      // 2. Email BOTH parties
      const recipients = [
        ...(reporterEmail ? [{ to: reporterEmail, name: report.reporter_name }] : []),
        ...(reportedEmail ? [{ to: reportedEmail, name: report.reported_name }] : []),
      ];
      let sent = 0;
      const failures: string[] = [];
      for (const r of recipients) {
        const { data, error } = await supabase.functions.invoke('send-member-email', {
          body: {
            to: r.to,
            toName: r.name,
            subject,
            message: letter + evidenceSection,
            attachments,
          },
        });
        if (error || data?.error) failures.push(r.to);
        else sent++;
      }

      // 3. Mark resolved + closed in the system
      await closeCaseInSystem();

      toast({
        title: 'Case resolved & closed',
        description: sent > 0
          ? `Resolution emailed to ${sent} party/parties.${failures.length ? ` Failed: ${failures.join(', ')}.` : ''}${pdfAttached ? '' : ' (PDF too large to attach — download it manually)'}`
          : 'Case closed. No emails could be sent — use the Download button to share the resolution PDF.',
        variant: failures.length && sent === 0 ? 'destructive' : 'default',
      });
      onResolved();
      onClose();
    } catch (err) {
      toast({ title: 'Failed to resolve case', description: String(err), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleCloseWithoutSending = async () => {
    setSending(true);
    try {
      await closeCaseInSystem();
      toast({ title: 'Case resolved & closed', description: 'Marked as resolved without sending notifications.' });
      onResolved();
      onClose();
    } catch (err) {
      toast({ title: 'Failed to close case', description: String(err), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await generateCasePresentationPdf(report, letter, 'save', 'Case Resolution');
      toast({ title: 'Resolution PDF downloaded', description: 'Send it to the parties via WhatsApp or SMS.' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" /> Resolve &amp; Close Case
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Parties */}
          <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Users className="h-3 w-3" /> Resolution will be sent to all parties
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="text-foreground font-medium">Reporter: {report.is_anonymous ? 'Anonymous' : report.reporter_name}</span>
              {reporterEmail
                ? <span className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{reporterEmail}</span>
                : <span className="text-amber-600">no email</span>}
              <span className="text-foreground font-medium">Reported: {report.reported_name}</span>
              {reportedEmail
                ? <span className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{reportedEmail}</span>
                : <span className="text-amber-600">no email</span>}
            </div>
            {recipientCount === 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1 pt-1">
                <AlertTriangle className="h-3 w-3" /> No party emails on file — download the resolution PDF and share via phone instead.
              </p>
            )}
          </div>

          {/* Subject */}
          {recipientCount > 0 && (
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
          )}

          {/* Resolution letter */}
          <div className="space-y-1.5">
            <Label>Resolution Letter (editable)</Label>
            <Textarea
              rows={14}
              value={letter}
              onChange={e => setLetter(e.target.value)}
              className="resize-y text-sm leading-relaxed"
            />
          </div>

          {/* Evidence note */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {evidenceUrls.length > 0
              ? `${evidenceUrls.length} evidence file(s) — embedded in the resolution PDF and linked in the email for both parties`
              : 'No evidence files attached to this case'}
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap pt-2 border-t border-border">
            {recipientCount > 0 && (
              <Button
                className="flex-1 gap-2 bg-green-600 text-white hover:bg-green-700"
                onClick={handleSendAndClose}
                disabled={sending || downloading || !letter.trim() || !subject.trim()}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'Sending & Closing...' : `Send Resolution to ${recipientCount} Part${recipientCount > 1 ? 'ies' : 'y'} & Close Case`}
              </Button>
            )}
            <Button
              variant={recipientCount > 0 ? 'outline' : 'default'}
              className={recipientCount > 0 ? 'gap-2' : 'flex-1 gap-2 bg-green-600 text-white hover:bg-green-700'}
              onClick={handleDownload}
              disabled={downloading || sending || !letter.trim()}
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {downloading ? 'Preparing PDF...' : 'Download Resolution PDF'}
            </Button>
            {whatsappNumber && (
              <Button
                variant="outline"
                className="gap-2 text-green-700 border-green-600/40 hover:bg-green-600/10"
                onClick={() => window.open(`https://wa.me/${whatsappNumber}`, '_blank', 'noopener,noreferrer')}
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
            )}
            <Button variant="outline" onClick={handleCloseWithoutSending} disabled={sending || downloading}>
              Close Without Sending
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
