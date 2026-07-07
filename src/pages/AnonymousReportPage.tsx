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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ShieldCheck, Lock, Eye, EyeOff, AlertTriangle, ChevronRight, ChevronLeft,
  FileText, User, MapPin, Paperclip, CheckCircle, X, Upload, Info, Copy, Check
} from 'lucide-react';

const CASE_TYPES = [
  { value: 'fraud', label: 'Fraud / Financial Scam', desc: 'Money theft, fake investments, scams' },
  { value: 'harassment', label: 'Harassment / Bullying', desc: 'Verbal, physical, or online abuse' },
  { value: 'impersonation', label: 'Impersonation', desc: 'Identity fraud or false representation' },
  { value: 'misconduct', label: 'Misconduct', desc: 'Abuse of power or breach of trust' },
  { value: 'criminal_activity', label: 'Criminal Activity', desc: 'Drugs, theft, violence or other crime' },
  { value: 'sexual_misconduct', label: 'Sexual Misconduct', desc: 'Inappropriate or illegal sexual behaviour' },
  { value: 'corruption', label: 'Corruption / Bribery', desc: 'Officials abusing power for personal gain' },
  { value: 'dispute', label: 'General Dispute', desc: 'Community or personal disputes' },
  { value: 'other', label: 'Other', desc: 'Any other concern not listed above' },
];

const RELATIONSHIP_OPTIONS = [
  { value: 'member', label: 'NIDO Member' },
  { value: 'official', label: 'NIDO Official / Leader' },
  { value: 'business', label: 'Business Owner' },
  { value: 'non_member', label: 'Non-Member / External Person' },
  { value: 'unknown', label: 'Unknown / Not Sure' },
];

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low — No immediate danger', color: 'text-green-600' },
  { value: 'medium', label: 'Medium — Ongoing issue', color: 'text-amber-600' },
  { value: 'high', label: 'High — Immediate concern', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical — Danger to life or safety', color: 'text-destructive' },
];

interface EvidenceFile {
  file: File;
  url: string;
  uploading: boolean;
  name: string;
}

const STEPS = [
  { title: 'Incident Type', icon: AlertTriangle, desc: 'What kind of incident are you reporting?' },
  { title: 'Incident Details', icon: FileText, desc: 'What happened and when?' },
  { title: 'Person Reported', icon: User, desc: 'Who is being reported?' },
  { title: 'Evidence & Contact', icon: Paperclip, desc: 'Upload evidence (optional)' },
];

export function AnonymousReportPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceCode, setReferenceCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);

  const [form, setForm] = useState({
    case_type: '',
    urgency: 'medium',
    title: '',
    description: '',
    incident_date: '',
    incident_location: '',
    reported_name: '',
    reported_email: '',
    reported_phone: '',
    reported_relationship: 'unknown',
    contact_email: '',
  });

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const validateStep = () => {
    if (step === 0 && !form.case_type) return 'Please select the type of incident.';
    if (step === 1) {
      if (!form.title) return 'Please provide a brief title for the report.';
      if (!form.description || form.description.length < 50) return 'Please provide a detailed description (at least 50 characters).';
    }
    if (step === 2 && !form.reported_name) return 'Please provide the name of the person being reported.';
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => s + 1);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newFiles: EvidenceFile[] = files.map(f => ({
      file: f, url: '', uploading: true, name: f.name,
    }));
    setEvidenceFiles(prev => [...prev, ...newFiles]);

    for (const fileEntry of newFiles) {
      const ext = fileEntry.file.name.split('.').pop();
      const path = `anonymous-reports/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('uploads').upload(path, fileEntry.file, { upsert: true });
      if (!upErr) {
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

  const removeFile = (idx: number) => setEvidenceFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (evidenceFiles.some(f => f.uploading)) {
      toast({ title: 'Please wait for files to finish uploading', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    setError(null);

    const evidence_urls = evidenceFiles.filter(f => f.url).map(f => f.url);

    const { data, error: fnErr } = await supabase.functions.invoke('submit-anonymous-report', {
      body: {
        case_type: form.case_type,
        title: `[${form.urgency.toUpperCase()}] ${form.title}`,
        description: form.description,
        incident_date: form.incident_date || null,
        incident_location: form.incident_location || null,
        reported_name: form.reported_name,
        reported_email: form.reported_email || null,
        reported_phone: form.reported_phone || null,
        reported_relationship: form.reported_relationship,
        contact_email: showContact ? form.contact_email || null : null,
        evidence_urls,
      },
    });

    setSubmitting(false);

    if (fnErr || !data?.success) {
      setError(data?.error || 'Submission failed. Please try again.');
      return;
    }

    setReferenceCode(data.reference);
    setSubmitted(true);
  };

  const copyRef = () => {
    navigator.clipboard.writeText(referenceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-24 bg-muted/20">
          <div className="text-center max-w-lg space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
              <ShieldCheck className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Report Submitted Anonymously</h2>
              <p className="text-muted-foreground">
                Your report has been received and is fully anonymous. NIDO Vietnam leadership will review it confidentially within 5 business days.
              </p>
            </div>

            {/* Reference Code */}
            <div className="p-5 rounded-xl bg-card border border-border shadow-card">
              <p className="text-sm text-muted-foreground mb-2">Your Reference Code</p>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-xl font-mono font-bold text-primary tracking-wider">{referenceCode}</span>
                <button
                  onClick={copyRef}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Save this code. If you provided a contact email, we may reference this code when following up.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm text-left space-y-2">
              <p className="font-semibold text-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" /> What happens next?
              </p>
              <ul className="text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Your identity remains fully protected — no data linking you to this report is stored.</li>
                <li>The leadership team will review your report confidentially.</li>
                <li>If the matter requires action, it will be addressed under NIDO's internal code of conduct.</li>
                <li>For urgent threats to safety, contact Nigerian authorities or local police immediately.</li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              Emergency contacts: <strong>info@nidovietnam.com</strong> · <strong>+84326189705</strong>
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-300 text-xs font-medium mb-4">
            <Lock className="h-3.5 w-3.5" /> 100% Anonymous — No Account Required
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground mb-3">Anonymous Crime & Incident Report</h1>
          <p className="text-primary-foreground/70 text-base max-w-xl mx-auto">
            Report crimes, misconduct, or any incident anonymously. Your identity is never recorded or stored.
            No registration. No login. Complete protection.
          </p>
        </div>
      </section>

      {/* Anonymity Guarantee Bar */}
      <div className="bg-green-500/5 border-b border-green-500/20 py-3 px-4">
        <div className="container mx-auto max-w-4xl flex flex-wrap items-center gap-x-6 gap-y-1 justify-center text-sm">
          <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
            <ShieldCheck className="h-4 w-4" /> No personal data collected
          </span>
          <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
            <EyeOff className="h-4 w-4" /> IP address not logged
          </span>
          <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
            <Lock className="h-4 w-4" /> Report encrypted in transit
          </span>
          <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
            <Eye className="h-4 w-4" /> Only NIDO leadership can view
          </span>
        </div>
      </div>

      <section className="flex-1 py-10 px-4 bg-muted/20">
        <div className="container mx-auto max-w-3xl space-y-6">

          {/* Step Progress */}
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      i < step ? 'gradient-primary text-primary-foreground' :
                      i === step ? 'bg-card border-2 border-primary text-primary' :
                      'bg-card border border-border text-muted-foreground'
                    }`}>
                      {i < step ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span className={`text-xs mt-1 text-center hidden sm:block ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {s.title}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 -mt-4 ${i < step ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* ── STEP 1: Incident Type ── */}
          {step === 0 && (
            <Card className="shadow-card">
              <CardContent className="p-6 space-y-5">
                <div>
                  <h3 className="font-semibold text-foreground text-lg mb-1">What type of incident are you reporting?</h3>
                  <p className="text-sm text-muted-foreground">Select the category that best describes the situation.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {CASE_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => set('case_type', t.value)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        form.case_type === t.value
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                      }`}
                    >
                      <p className={`font-medium text-sm ${form.case_type === t.value ? 'text-primary' : 'text-foreground'}`}>{t.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Urgency Level</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {URGENCY_OPTIONS.map(u => (
                      <button
                        key={u.value}
                        onClick={() => set('urgency', u.value)}
                        className={`text-left p-3 rounded-lg border text-sm transition-all ${
                          form.urgency === u.value ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/30'
                        }`}
                      >
                        <span className={`font-medium block ${form.urgency === u.value ? 'text-primary' : u.color}`}>
                          {u.label.split('—')[0].trim()}
                        </span>
                        <span className="text-xs text-muted-foreground">{u.label.split('—')[1]?.trim()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 2: Incident Details ── */}
          {step === 1 && (
            <Card className="shadow-card">
              <CardContent className="p-6 space-y-5">
                <div>
                  <h3 className="font-semibold text-foreground text-lg mb-1">Describe the incident</h3>
                  <p className="text-sm text-muted-foreground">Be as detailed as possible. The more information you provide, the better we can act on it.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Report Title *</Label>
                  <Input
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="e.g. Fraud by community member in Hanoi — July 2026"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Full Description *</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    rows={8}
                    className="text-sm"
                    placeholder={`Provide a thorough account of what happened. Include:
• What occurred and how it started
• Specific actions or behaviours observed
• Any witnesses or other people involved
• Timeline of events
• Impact on you or others
• Any previous attempts to resolve this`}
                  />
                  <p className={`text-xs ${form.description.length < 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {form.description.length} characters {form.description.length < 50 ? `(minimum 50 required)` : '— good detail'}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5">When did it happen?</Label>
                    <Input
                      type="date"
                      value={form.incident_date}
                      onChange={e => set('incident_date', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Where did it happen?</Label>
                    <Input
                      value={form.incident_location}
                      onChange={e => set('incident_location', e.target.value)}
                      placeholder="City, district, venue..."
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 3: Person Being Reported ── */}
          {step === 2 && (
            <Card className="shadow-card border-destructive/20">
              <CardContent className="p-6 space-y-5">
                <div>
                  <h3 className="font-semibold text-foreground text-lg mb-1">Who are you reporting?</h3>
                  <p className="text-sm text-muted-foreground">Provide as much information as you know about the person being reported.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Full Name of Person Being Reported *</Label>
                  <Input
                    value={form.reported_name}
                    onChange={e => set('reported_name', e.target.value)}
                    placeholder="Name of the individual"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Their Email (if known)</Label>
                    <Input
                      type="email"
                      value={form.reported_email}
                      onChange={e => set('reported_email', e.target.value)}
                      placeholder="their@email.com"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Their Phone (if known)</Label>
                    <Input
                      value={form.reported_phone}
                      onChange={e => set('reported_phone', e.target.value)}
                      placeholder="+84..."
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Their Relationship to NIDO</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {RELATIONSHIP_OPTIONS.map(r => (
                      <button
                        key={r.value}
                        onClick={() => set('reported_relationship', r.value)}
                        className={`text-sm py-2 px-3 rounded-lg border transition-all text-center ${
                          form.reported_relationship === r.value
                            ? 'border-destructive bg-destructive/10 text-destructive font-medium'
                            : 'border-border bg-card hover:border-destructive/30 text-muted-foreground'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 4: Evidence & Optional Contact ── */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Evidence Upload */}
              <Card className="shadow-card">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg mb-1">Evidence & Documents</h3>
                    <p className="text-sm text-muted-foreground">Upload screenshots, photos, recordings, or documents. All optional.</p>
                  </div>

                  {evidenceFiles.length > 0 && (
                    <div className="space-y-2">
                      {evidenceFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                          {f.url && f.file.type.startsWith('image/') ? (
                            <img src={f.url} alt={f.name} className="w-10 h-10 rounded object-cover border border-border shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                            <p className="text-xs">
                              {f.uploading ? (
                                <span className="flex items-center gap-1 text-primary">
                                  <div className="h-3 w-3 border border-primary border-t-transparent rounded-full animate-spin" />
                                  Uploading...
                                </span>
                              ) : (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" /> Uploaded
                                </span>
                              )}
                            </p>
                          </div>
                          <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {evidenceFiles.length < 10 && (
                    <label className="cursor-pointer block">
                      <div className="flex flex-col items-center gap-2 py-8 px-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center">
                        <Upload className="h-7 w-7 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Click to upload evidence</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Images, PDFs, documents — up to 10 files</p>
                        </div>
                      </div>
                      <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileSelect} />
                    </label>
                  )}
                </CardContent>
              </Card>

              {/* Optional Follow-up Contact */}
              <Card className="shadow-card border-primary/20">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Info className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Optional: Allow Follow-up</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        If you want NIDO leadership to contact you for more information, you may provide an email. This is entirely optional and does not affect your anonymity — we will only use it for this report.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowContact(!showContact)}
                    className={`w-full py-2.5 px-4 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      showContact
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {showContact ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showContact ? 'Remove contact email' : 'Add a follow-up contact email (optional)'}
                  </button>

                  {showContact && (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Follow-up Email</Label>
                      <Input
                        type="email"
                        value={form.contact_email}
                        onChange={e => set('contact_email', e.target.value)}
                        placeholder="A secure email address for follow-up only"
                        className="h-9 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        This email is stored only within your report and is visible only to NIDO leadership. It will not be used for any other purpose.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Anonymity Reminder */}
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground mb-1">Your anonymity is guaranteed</p>
                  <p className="text-muted-foreground">
                    No name, no account, no identifying information is required or recorded. Only the content of your report is stored. 
                    Submitting this report does not create any account or link to your device.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => { setStep(s => s - 1); setError(null); }} className="flex-1 gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={handleNext} className="flex-1 gradient-primary text-primary-foreground gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting || evidenceFiles.some(f => f.uploading)}
                className="flex-1 gradient-primary text-primary-foreground h-12 text-base gap-2"
              >
                <ShieldCheck className="h-5 w-5" />
                {submitting ? 'Submitting Anonymously...' : 'Submit Anonymous Report'}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center pb-4">
            For immediate safety emergencies, contact local police or call <strong>+84326189705</strong> directly.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
