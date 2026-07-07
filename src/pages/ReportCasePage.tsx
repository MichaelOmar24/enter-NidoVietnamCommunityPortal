import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle, User, Upload, X, FileText, CheckCircle,
  Phone, Mail, Shield, Paperclip
} from 'lucide-react';

const CASE_TYPES = [
  { value: 'dispute', label: 'General Dispute' },
  { value: 'misconduct', label: 'Misconduct' },
  { value: 'fraud', label: 'Fraud / Financial Scam' },
  { value: 'harassment', label: 'Harassment / Bullying' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Other' },
];

interface EvidenceFile {
  file: File;
  url: string;
  uploading: boolean;
  name: string;
}

export function ReportCasePage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);

  const [form, setForm] = useState({
    // Reporter
    reporter_name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : '',
    reporter_email: profile?.email || '',
    reporter_phone: profile?.phone || '',
    // Reported
    reported_name: '',
    reported_email: '',
    reported_phone: '',
    reported_relationship: 'member',
    // Case
    case_type: 'dispute',
    title: '',
    description: '',
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newFiles: EvidenceFile[] = files.map(f => ({
      file: f,
      url: '',
      uploading: true,
      name: f.name,
    }));
    setEvidenceFiles(prev => [...prev, ...newFiles]);

    // Upload each file
    for (const fileEntry of newFiles) {
      const ext = fileEntry.file.name.split('.').pop();
      const path = `case-reports/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, fileEntry.file, { upsert: true });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
        setEvidenceFiles(prev =>
          prev.map(f => f.name === fileEntry.name && f.uploading ? { ...f, url: publicUrl, uploading: false } : f)
        );
      } else {
        setEvidenceFiles(prev => prev.filter(f => !(f.name === fileEntry.name && f.uploading)));
      }
    }
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!form.reporter_name || !form.reporter_email || !form.reported_name || !form.title || !form.description) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    if (evidenceFiles.some(f => f.uploading)) {
      toast({ title: 'Please wait for files to finish uploading', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const evidence_urls = evidenceFiles.filter(f => f.url).map(f => f.url);

    const { error } = await supabase.from('case_reports').insert({
      reporter_name: form.reporter_name,
      reporter_email: form.reporter_email,
      reporter_phone: form.reporter_phone || null,
      reporter_user_id: profile?.id || null,
      reported_name: form.reported_name,
      reported_email: form.reported_email || null,
      reported_phone: form.reported_phone || null,
      reported_relationship: form.reported_relationship,
      case_type: form.case_type,
      title: form.title,
      description: form.description,
      evidence_urls,
      status: 'pending',
    });

    setSubmitting(false);
    if (error) {
      toast({ title: 'Submission failed', description: 'Please try again', variant: 'destructive' });
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-24 bg-muted/20">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Report Submitted</h2>
            <p className="text-muted-foreground mb-6">
              Your case report has been received. The NIDO Vietnam leadership will review it confidentially and get back to you within 5 business days.
            </p>
            <Badge className="bg-primary/10 text-primary border-primary/30 text-sm px-4 py-1.5">
              Case Reference: NIDO-{Date.now().toString(36).toUpperCase()}
            </Badge>
            <p className="text-xs text-muted-foreground mt-4">
              For urgent matters contact: <strong>info@nidovietnam.com</strong>
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero pt-28 pb-10 px-4 relative overflow-hidden">
        <div className="absolute inset-0 hero-pattern pointer-events-none opacity-30" />
        <div className="container mx-auto max-w-3xl text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-destructive/20 border border-destructive/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground mb-3">Report a Case or Dispute</h1>
          <p className="text-primary-foreground/70 text-base max-w-xl mx-auto">
            Submit a formal complaint or dispute to the NIDO Vietnam leadership. All reports are handled confidentially.
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="bg-amber-500/5 border-b border-amber-400/20 py-3 px-4">
        <div className="container mx-auto max-w-4xl">
          <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <Shield className="h-4 w-4 shrink-0" />
            All reports are strictly confidential and will only be seen by NIDO leadership. False reports may result in membership consequences.
          </p>
        </div>
      </div>

      <section className="flex-1 py-10 px-4 bg-muted/20">
        <div className="container mx-auto max-w-4xl space-y-6">

          {/* Two column — Reporter & Reported */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Reporter */}
            <Card className="shadow-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Your Contact Details</h3>
                  <Badge className="ml-auto text-[10px] border bg-primary/10 text-primary border-primary/30">Reporter</Badge>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Full Name *</Label>
                  <Input
                    value={form.reporter_name}
                    onChange={e => setForm(f => ({ ...f, reporter_name: e.target.value }))}
                    placeholder="Your full name"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email Address *</Label>
                  <Input
                    type="email"
                    value={form.reporter_email}
                    onChange={e => setForm(f => ({ ...f, reporter_email: e.target.value }))}
                    placeholder="your@email.com"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone / WhatsApp</Label>
                  <Input
                    value={form.reporter_phone}
                    onChange={e => setForm(f => ({ ...f, reporter_phone: e.target.value }))}
                    placeholder="+84..."
                    className="h-9 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Reported */}
            <Card className="shadow-card border-destructive/20">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-destructive" />
                  </div>
                  <h3 className="font-semibold text-foreground">Person Being Reported</h3>
                  <Badge className="ml-auto text-[10px] border bg-destructive/10 text-destructive border-destructive/30">Reported</Badge>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Full Name *</Label>
                  <Input
                    value={form.reported_name}
                    onChange={e => setForm(f => ({ ...f, reported_name: e.target.value }))}
                    placeholder="Name of person being reported"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Their Email (if known)</Label>
                  <Input
                    type="email"
                    value={form.reported_email}
                    onChange={e => setForm(f => ({ ...f, reported_email: e.target.value }))}
                    placeholder="their@email.com"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Their Phone (if known)</Label>
                  <Input
                    value={form.reported_phone}
                    onChange={e => setForm(f => ({ ...f, reported_phone: e.target.value }))}
                    placeholder="+84..."
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Relationship to NIDO</Label>
                  <Select value={form.reported_relationship} onValueChange={v => setForm(f => ({ ...f, reported_relationship: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">NIDO Member</SelectItem>
                      <SelectItem value="official">NIDO Official</SelectItem>
                      <SelectItem value="business">Business Owner</SelectItem>
                      <SelectItem value="non_member">Non-Member / External</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Case Details */}
          <Card className="shadow-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="font-semibold text-foreground">Case Details</h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Case Type *</Label>
                  <Select value={form.case_type} onValueChange={v => setForm(f => ({ ...f, case_type: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CASE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Case Title / Subject *</Label>
                  <Input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Brief title for this case"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Detailed Description *</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={6}
                  className="text-sm"
                  placeholder="Provide a full and detailed account of the incident. Include dates, locations, and any relevant context. Be as specific as possible..."
                />
                <p className="text-xs text-muted-foreground">{form.description.length} characters</p>
              </div>
            </CardContent>
          </Card>

          {/* Evidence Upload */}
          <Card className="shadow-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Evidence & Documents</h3>
                  <p className="text-xs text-muted-foreground">Screenshots, photos, documents, PDFs — max 10 files</p>
                </div>
              </div>

              {/* File list */}
              {evidenceFiles.length > 0 && (
                <div className="space-y-2">
                  {evidenceFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                      {f.url && f.file.type.startsWith('image/') ? (
                        <img src={f.url} alt={f.name} className="w-10 h-10 rounded object-cover border border-border shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 border border-border">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.uploading ? (
                            <span className="flex items-center gap-1 text-primary">
                              <div className="h-3 w-3 border border-primary border-t-transparent rounded-full animate-spin" />
                              Uploading...
                            </span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Uploaded
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {evidenceFiles.length < 10 && (
                <label className="cursor-pointer block">
                  <div className="flex flex-col items-center gap-2 py-6 px-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center">
                    <Upload className="h-7 w-7 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Click to upload evidence</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Images, PDFs, documents — up to 10 files</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSubmit}
              disabled={submitting || evidenceFiles.some(f => f.uploading)}
              className="flex-1 gradient-primary text-primary-foreground h-12 text-base gap-2"
            >
              <AlertTriangle className="h-5 w-5" />
              {submitting ? 'Submitting Report...' : 'Submit Case Report'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pb-4">
            By submitting, you confirm that the information provided is accurate to the best of your knowledge.
            For emergencies, contact NIDO leadership directly at <strong>info@nidovietnam.com</strong> or <strong>+84326189705</strong>.
          </p>

        </div>
      </section>

      <Footer />
    </div>
  );
}
