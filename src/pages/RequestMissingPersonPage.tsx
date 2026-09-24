import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { NIGERIAN_STATES, VIETNAM_CITIES } from '@/lib/types';
import {
  REQUEST_TYPES, RELATIONSHIPS, ASSISTANCE_OPTIONS, CUSTODY_TYPES, STATUS_CONFIG,
  needsConsent, requestTypeLabel, formatReference, type MissingPersonRequest,
} from '@/lib/missingPerson';
import {
  Search, Upload, X, FileText, CheckCircle, User, Users, MapPin,
  ShieldAlert, HeartHandshake, Paperclip, Clock, Landmark, Info
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { trackEvent } from '@enter-pro/analytics-sdk';

interface EvidenceFile {
  file: File;
  url: string;
  uploading: boolean;
  name: string;
}

const EMPTY_FORM = {
  requester_name: '',
  requester_email: '',
  requester_phone: '',
  requester_relationship: 'parent',
  requester_country: 'Nigeria',
  requester_location: '',
  missing_full_name: '',
  missing_aliases: '',
  missing_gender: '',
  missing_date_of_birth: '',
  missing_age: '',
  missing_nigerian_state_of_origin: '',
  missing_passport_number: '',
  missing_phone: '',
  missing_email: '',
  missing_last_known_address: '',
  missing_vietnam_city: '',
  missing_employer: '',
  last_contact_date: '',
  last_contact_details: '',
  request_type: '',
  incident_date: '',
  custody_details: '',
  circumstances: '',
  prior_actions: '',
  assistance_requested: 'verify_only',
  consent_to_share: false,
};

function SectionCard({
  icon: Icon, title, subtitle, children,
}: { icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function RequestMissingPersonPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [requests, setRequests] = useState<MissingPersonRequest[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const loadRequests = useCallback(async () => {
    if (!profile) return;
    setLoadingList(true);
    const { data } = await supabase
      .from('missing_person_requests')
      .select('id, missing_full_name, request_type, status, created_at, embassy_forwarded_at')
      .eq('requester_user_id', profile.id)
      .order('created_at', { ascending: false });
    setRequests((data || []) as MissingPersonRequest[]);
    setLoadingList(false);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    setForm(prev => ({
      ...prev,
      requester_name: `${profile.first_name} ${profile.last_name}`.trim(),
      requester_email: profile.email || '',
      requester_phone: profile.phone || '',
    }));
    loadRequests();
  }, [profile, loadRequests]);

  const custodyRelevant = CUSTODY_TYPES.includes(form.request_type);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newFiles: EvidenceFile[] = files.map(f => ({ file: f, url: '', uploading: true, name: f.name }));
    setEvidenceFiles(prev => [...prev, ...newFiles]);

    for (const entry of newFiles) {
      const ext = entry.file.name.split('.').pop();
      const path = `missing-person/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, entry.file, { upsert: true });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
        setEvidenceFiles(prev =>
          prev.map(f => (f.name === entry.name && f.uploading ? { ...f, url: publicUrl, uploading: false } : f))
        );
      } else {
        setEvidenceFiles(prev => prev.filter(f => !(f.name === entry.name && f.uploading)));
        toast({ title: 'Upload failed', description: `${entry.name} could not be uploaded.`, variant: 'destructive' });
      }
    }
    e.target.value = '';
  };

  const validate = (): string | null => {
    if (!form.requester_name.trim()) return 'Please provide your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.requester_email.trim())) return 'Please provide a valid email address.';
    if (!form.requester_location.trim()) return 'Please tell us your city and country so we can reach you.';
    if (!form.missing_full_name.trim()) return "Please provide the missing person's full name.";
    if (!form.request_type) return 'Please tell us what happened to the person.';
    if (form.circumstances.trim().length < 30) return 'Please describe the situation in at least a few sentences.';
    if (needsConsent(form.assistance_requested) && !form.consent_to_share) {
      return 'Please give consent to share these details with the Nigerian Embassy / Consular authority, or choose verification only.';
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!profile) return;
    const problem = validate();
    if (problem) {
      toast({ title: 'Please check the form', description: problem, variant: 'destructive' });
      return;
    }
    if (evidenceFiles.some(f => f.uploading)) {
      toast({ title: 'Please wait', description: 'Files are still uploading.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase
      .from('missing_person_requests')
      .insert({
        requester_user_id: profile.id,
        requester_name: form.requester_name.trim(),
        requester_email: form.requester_email.trim(),
        requester_phone: form.requester_phone.trim() || null,
        requester_relationship: form.requester_relationship,
        requester_country: form.requester_country.trim() || 'Nigeria',
        requester_location: form.requester_location.trim(),
        missing_full_name: form.missing_full_name.trim(),
        missing_aliases: form.missing_aliases.trim() || null,
        missing_gender: form.missing_gender || null,
        missing_date_of_birth: form.missing_date_of_birth || null,
        missing_age: form.missing_age ? Number(form.missing_age) : null,
        missing_nigerian_state_of_origin: form.missing_nigerian_state_of_origin || null,
        missing_passport_number: form.missing_passport_number.trim() || null,
        missing_phone: form.missing_phone.trim() || null,
        missing_email: form.missing_email.trim() || null,
        missing_last_known_address: form.missing_last_known_address.trim() || null,
        missing_vietnam_city: form.missing_vietnam_city || null,
        missing_employer: form.missing_employer.trim() || null,
        last_contact_date: form.last_contact_date || null,
        last_contact_details: form.last_contact_details.trim() || null,
        request_type: form.request_type,
        incident_date: form.incident_date || null,
        custody_details: custodyRelevant ? form.custody_details.trim() || null : null,
        circumstances: form.circumstances.trim(),
        prior_actions: form.prior_actions.trim() || null,
        assistance_requested: form.assistance_requested,
        consent_to_share: form.consent_to_share,
        evidence_urls: evidenceFiles.filter(f => f.url).map(f => f.url),
        status: 'pending',
      })
      .select('id')
      .single();

    setSubmitting(false);
    if (error || !data) {
      toast({ title: 'Submission failed', description: error?.message || 'Please try again.', variant: 'destructive' });
      return;
    }

    trackEvent('missing_person_request_submitted', {
      eventType: 'custom',
      properties: { request_type: form.request_type, assistance: form.assistance_requested },
    });
    setSubmittedRef(formatReference(data.id));
    setForm(prev => ({ ...EMPTY_FORM, requester_name: prev.requester_name, requester_email: prev.requester_email, requester_phone: prev.requester_phone }));
    setEvidenceFiles([]);
    loadRequests();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (submittedRef) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-24 bg-muted/20">
          <div className="max-w-lg w-full text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Request Received</h2>
            <p className="text-muted-foreground mb-5">
              NIDO Vietnam has received your request for information. A community representative will begin verifying what
              is available and will contact you on the email and phone number you provided.
            </p>
            <Badge className="bg-primary/10 text-primary border-primary/30 text-sm px-4 py-1.5">
              Reference: {submittedRef}
            </Badge>

            <div className="mt-8 text-left rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-foreground mb-3">What happens next</p>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>NIDO acknowledges your request within 3 business days.</li>
                <li>Community representatives verify the information available to NIDO.</li>
                <li>If you asked us to, NIDO raises the matter with the Nigerian Embassy / Consular authority in Vietnam.</li>
                <li>You are updated on the email and phone number you provided.</li>
              </ol>
              <p className="mt-4 text-xs text-muted-foreground border-t border-border pt-3">
                Keep your reference number safe. For urgent developments, contact NIDO Vietnam directly at{' '}
                <strong>info@nidovietnam.com</strong> or <strong>+84326189705</strong>.
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => setSubmittedRef(null)}>Submit another request</Button>
              <Button className="gradient-primary text-primary-foreground" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="gradient-hero pt-28 pb-10 px-4 relative overflow-hidden">
        <div className="absolute inset-0 hero-pattern pointer-events-none opacity-30" />
        <div className="container mx-auto max-w-3xl text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-primary-foreground/10 border border-primary-foreground/20 flex items-center justify-center mx-auto mb-4">
            <Search className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground mb-3">Request Information About a Missing Person</h1>
          <p className="text-primary-foreground/70 text-base max-w-2xl mx-auto">
            For anyone who has disappeared, lost contact with family or friends, may have been detained or arrested, may
            have been taken to prison, is believed to be in custody, or whose whereabouts need to be verified in Vietnam.
          </p>
        </div>
      </section>

      <div className="bg-amber-500/5 border-b border-amber-400/20 py-3 px-4">
        <div className="container mx-auto max-w-4xl space-y-1.5">
          <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            NIDO Vietnam is not a police or tracing agency. Serious cases must also be reported to the local police in
            Vietnam and to the Nigerian Embassy / Consular authority. This form asks NIDO to verify what information is
            available and, when you request it, to follow up with the appropriate authority.
          </p>
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Many requests come from family in Nigeria. You do not need to be in Vietnam to file this — tell us where you
            are so we can reach you at the right times.
          </p>
        </div>
      </div>

      <section className="flex-1 py-10 px-4 bg-muted/20">
        <div className="container mx-auto max-w-4xl space-y-6">

          <SectionCard
            icon={User}
            title="About you (the person requesting)"
            subtitle="So NIDO can reach you wherever you are"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Your Full Name *</Label>
                <Input value={form.requester_name} onChange={e => set('requester_name', e.target.value)} className="h-9 text-sm" placeholder="Your full name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Your Relationship to the Person *</Label>
                <Select value={form.requester_relationship} onValueChange={v => set('requester_relationship', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Email Address *</Label>
                <Input type="email" value={form.requester_email} onChange={e => set('requester_email', e.target.value)} className="h-9 text-sm" placeholder="your@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Phone / WhatsApp</Label>
                <Input value={form.requester_phone} onChange={e => set('requester_phone', e.target.value)} className="h-9 text-sm" placeholder="+234..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Country You Are In *</Label>
                <Input value={form.requester_country} onChange={e => set('requester_country', e.target.value)} className="h-9 text-sm" placeholder="Nigeria" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">City / State *</Label>
                <Input value={form.requester_location} onChange={e => set('requester_location', e.target.value)} className="h-9 text-sm" placeholder="e.g. Lagos, Nigeria" />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={Users}
            title="About the missing person"
            subtitle="As much as you know — leave anything you are unsure about blank"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Full Name *</Label>
                <Input value={form.missing_full_name} onChange={e => set('missing_full_name', e.target.value)} className="h-9 text-sm" placeholder="Their full name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Other Names / Aliases Used</Label>
                <Input value={form.missing_aliases} onChange={e => set('missing_aliases', e.target.value)} className="h-9 text-sm" placeholder="Nicknames, other spellings" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Gender</Label>
                <Select value={form.missing_gender} onValueChange={v => set('missing_gender', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Date of Birth</Label>
                <Input type="date" value={form.missing_date_of_birth} onChange={e => set('missing_date_of_birth', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Approximate Age</Label>
                <Input type="number" min="0" value={form.missing_age} onChange={e => set('missing_age', e.target.value)} className="h-9 text-sm" placeholder="e.g. 34" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">State of Origin in Nigeria</Label>
                <Select value={form.missing_nigerian_state_of_origin} onValueChange={v => set('missing_nigerian_state_of_origin', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Nigerian Passport Number</Label>
                <Input value={form.missing_passport_number} onChange={e => set('missing_passport_number', e.target.value)} className="h-9 text-sm" placeholder="If known" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Their Phone Number</Label>
                <Input value={form.missing_phone} onChange={e => set('missing_phone', e.target.value)} className="h-9 text-sm" placeholder="Last known number" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm">Their Email Address</Label>
                <Input type="email" value={form.missing_email} onChange={e => set('missing_email', e.target.value)} className="h-9 text-sm" placeholder="Last known email" />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={MapPin}
            title="Last known information in Vietnam"
            subtitle="This is what helps NIDO and the community verify anything"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm">Last Known Address in Vietnam</Label>
                <Input value={form.missing_last_known_address} onChange={e => set('missing_last_known_address', e.target.value)} className="h-9 text-sm" placeholder="Street, district, city" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">City in Vietnam</Label>
                <Select value={form.missing_vietnam_city} onValueChange={v => set('missing_vietnam_city', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {VIETNAM_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Employer / School / Institution</Label>
                <Input value={form.missing_employer} onChange={e => set('missing_employer', e.target.value)} className="h-9 text-sm" placeholder="Where they worked or studied" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Date You Last Had Contact</Label>
                <Input type="date" value={form.last_contact_date} onChange={e => set('last_contact_date', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">How Was That Last Contact?</Label>
                <Input value={form.last_contact_details} onChange={e => set('last_contact_details', e.target.value)} className="h-9 text-sm" placeholder="Call, WhatsApp, visit, third party..." />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={ShieldAlert}
            title="What happened"
            subtitle="The more precise this is, the more NIDO can verify"
          >
            <div className="space-y-3">
              <Label className="text-sm">This Person *</Label>
              <div className="grid gap-2">
                {REQUEST_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('request_type', t.value)}
                    className={`text-left rounded-xl border p-3 transition-colors ${
                      form.request_type === t.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${form.request_type === t.value ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                      {t.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 pl-4">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Date Last Seen / Last Heard From</Label>
                <Input type="date" value={form.incident_date} onChange={e => set('incident_date', e.target.value)} className="h-9 text-sm" />
              </div>
            </div>

            {custodyRelevant && (
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1">
                  <Landmark className="h-3.5 w-3.5" /> Detention / Custody Details
                </Label>
                <Textarea
                  value={form.custody_details}
                  onChange={e => set('custody_details', e.target.value)}
                  rows={3}
                  className="text-sm"
                  placeholder="Who is holding them (police, immigration, prison), which facility or city, when, and anything you were told..."
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm">Detailed Account of the Situation *</Label>
              <Textarea
                value={form.circumstances}
                onChange={e => set('circumstances', e.target.value)}
                rows={6}
                className="text-sm"
                placeholder="Describe what happened, dates, who they were with, any calls or messages received, and anything the community in Vietnam may know..."
              />
              <p className="text-xs text-muted-foreground">{form.circumstances.length} characters</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Steps Already Taken</Label>
              <Textarea
                value={form.prior_actions}
                onChange={e => set('prior_actions', e.target.value)}
                rows={3}
                className="text-sm"
                placeholder="Police report, contact with the Embassy, NIDO officials approached, messages to friends in Vietnam..."
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={HeartHandshake}
            title="How NIDO can help"
            subtitle="Verification is always included — embassy follow-up only happens if you ask for it"
          >
            <div className="grid gap-2">
              {ASSISTANCE_OPTIONS.map(a => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => set('assistance_requested', a.value)}
                  className={`text-left rounded-xl border p-3 transition-colors ${
                    form.assistance_requested === a.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${form.assistance_requested === a.value ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                    {a.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 pl-4">{a.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
              <Checkbox
                id="consent"
                checked={form.consent_to_share}
                onCheckedChange={v => set('consent_to_share', v === true)}
                className="mt-0.5"
              />
              <label htmlFor="consent" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                I consent to NIDO Vietnam sharing these details with the Nigerian Embassy / Consular authority in Vietnam
                where it is necessary to verify information or follow up on my request.
                {needsConsent(form.assistance_requested) && <span className="text-destructive font-medium"> Required for embassy follow-up.</span>}
              </label>
            </div>
          </SectionCard>

          <SectionCard icon={Paperclip} title="Supporting Documents" subtitle="Photos, passport copies, police reports, messages — max 10 files">
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
                            <span className="h-3 w-3 border border-primary border-t-transparent rounded-full animate-spin" />
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
                      onClick={() => setEvidenceFiles(prev => prev.filter((_, idx) => idx !== i))}
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
                    <p className="text-sm font-medium text-foreground">Click to upload documents</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Images, PDFs, documents — up to 10 files</p>
                  </div>
                </div>
                <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileSelect} />
              </label>
            )}
          </SectionCard>

          <Button
            onClick={handleSubmit}
            disabled={submitting || evidenceFiles.some(f => f.uploading)}
            className="w-full gradient-primary text-primary-foreground h-12 text-base gap-2"
          >
            <Search className="h-5 w-5" />
            {submitting ? 'Submitting Request...' : 'Submit Request to NIDO'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By submitting, you confirm that the information provided is accurate to the best of your knowledge and that
            you are requesting NIDO Vietnam's assistance on behalf of the person named above.
          </p>

          <Card className="shadow-card">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">Your Requests</h3>
              </div>
              {loadingList ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : requests.length === 0 ? (
                <p className="text-xs text-muted-foreground">You have not submitted any requests yet.</p>
              ) : (
                <div className="space-y-2">
                  {requests.map(r => {
                    const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                    const SIcon = s.icon;
                    return (
                      <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.missing_full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {requestTypeLabel(r.request_type)} · {format(parseISO(r.created_at), 'dd MMM yyyy')} · {formatReference(r.id)}
                          </p>
                        </div>
                        <Badge className={`text-[10px] border gap-1 shrink-0 ${s.classes}`}>
                          <SIcon className="h-2.5 w-2.5" /> {s.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </section>

      <Footer />
    </div>
  );
}
