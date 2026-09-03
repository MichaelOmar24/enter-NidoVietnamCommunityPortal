import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  NIGERIAN_STATES, VIETNAM_CITIES, OCCUPATION_LABELS, MARITAL_STATUS_LABELS,
  QUALIFICATION_LABELS, RELIGION_LABELS, PURPOSE_OF_VISIT_LABELS,
  OccupationType, MaritalStatus, QualificationType, ReligionType, PurposeOfVisitType, SpouseNationality
} from '@/lib/types';
import { AlertCircle, CheckCircle, Upload, User, Briefcase, FileText, ChevronRight, ChevronLeft, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@enter-pro/analytics-sdk';

interface FormData {
  // Step 1 — Personal Info
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  nigerian_state_of_origin: string;
  // Step 2 — Profile Details
  occupation_type: OccupationType;
  occupation_institution_name: string;
  occupation_institution_address: string;
  occupation_country_state: string;
  marital_status: MaritalStatus;
  vietnam_city: string;
  vietnam_address: string;
  // Step 3 — Additional Details
  next_of_kin_name: string;
  next_of_kin_relationship: string;
  next_of_kin_phone: string;
  next_of_kin_address: string;
  highest_qualification: QualificationType | '';
  religion: ReligionType | '';
  purpose_of_visit: PurposeOfVisitType | '';
  // Step 4 — Passport
  passport_number: string;
  issue_date: string;
  expiry_date: string;
  place_of_issue: string;
  passport_image: File | null;
  // Spouse & family fields (shown when married)
  spouse_nationality: SpouseNationality | '';
  spouse_nationality_other: string;
  number_of_kids: number | '';
}

const STEPS = [
  { title: 'Personal Information', icon: User, desc: 'Basic identity details' },
  { title: 'Profile Details', icon: Briefcase, desc: 'Occupation & location' },
  { title: 'Additional Details', icon: Heart, desc: 'Next of kin, education & purpose' },
  { title: 'Passport Details', icon: FileText, desc: 'Passport information & upload' },
];

// Dynamic sub-fields shown per occupation type
const OCCUPATION_DETAIL_CONFIG: Partial<Record<OccupationType, {
  sectionTitle: string;
  nameLabel: string;
  addressLabel: string;
  showCountryState: boolean;
}>> = {
  student: {
    sectionTitle: 'Institution Details',
    nameLabel: 'Name of Institution',
    addressLabel: 'Institution Address',
    showCountryState: true,
  },
  business: {
    sectionTitle: 'Business Details',
    nameLabel: 'Business Name',
    addressLabel: 'Business Address',
    showCountryState: false,
  },
  employee: {
    sectionTitle: 'Employer Details',
    nameLabel: 'Employer / Company Name',
    addressLabel: 'Company Address',
    showCountryState: false,
  },
  teacher: {
    sectionTitle: 'Workplace Details',
    nameLabel: 'School / Academy / Training Centre Name',
    addressLabel: 'Workplace Address',
    showCountryState: false,
  },
};

export function RegisterPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<FormData>({
    first_name: '', last_name: '', email: '', password: '', confirm_password: '',
    phone: '', date_of_birth: '', gender: 'male', nigerian_state_of_origin: '',
    occupation_type: 'other',
    occupation_institution_name: '', occupation_institution_address: '', occupation_country_state: '',
    marital_status: 'single', vietnam_city: '', vietnam_address: '',
    next_of_kin_name: '', next_of_kin_relationship: '', next_of_kin_phone: '', next_of_kin_address: '',
    highest_qualification: '', religion: '', purpose_of_visit: '',
    passport_number: '', issue_date: '', expiry_date: '', place_of_issue: '', passport_image: null,
    spouse_nationality: '', spouse_nationality_other: '', number_of_kids: '',
  });
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const set = (field: keyof FormData, value: string | File | null) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const validateStep = () => {
    setError(null);
    if (step === 0) {
      if (!form.first_name || !form.last_name) return 'Please enter your full name';
      if (!form.email) return 'Email is required';
      if (!form.password || form.password.length < 6) return 'Password must be at least 6 characters';
      if (form.password !== form.confirm_password) return 'Passwords do not match';
    }
    if (step === 1) {
      if (!form.occupation_type) return 'Please select your occupation';
      if (!form.marital_status) return 'Please select your marital status';
      if (!form.vietnam_city) return 'Please select your city in Vietnam';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    // Create user + basic profile FIRST (need auth session before uploading to storage)
    const { error: signUpErr } = await signUp(form.email, form.password, {
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      date_of_birth: form.date_of_birth || undefined,
      gender: form.gender,
      occupation_type: form.occupation_type,
      marital_status: form.marital_status,
      vietnam_city: form.vietnam_city,
      vietnam_address: form.vietnam_address,
      nigerian_state_of_origin: form.nigerian_state_of_origin,
    });

    if (signUpErr) {
      setError(signUpErr.message);
      setLoading(false);
      return;
    }

    // Now authenticated — get the user
    const { data: { user } } = await supabase.auth.getUser();
    let passportUploadFailed: string | null = null;
    if (user) {
      // Run passport image upload and profile update in parallel to save time
      const [passportUploadResult] = await Promise.all([
        // Upload passport image (authenticated session now active)
        (async () => {
          if (!form.passport_image) return undefined;
          const ext = form.passport_image.name.split('.').pop();
          const fileName = `passport_${user.id}_${Date.now()}.${ext}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('passport-images')
            .upload(fileName, form.passport_image);
          if (uploadErr) {
            console.warn('Passport upload error:', uploadErr.message);
            passportUploadFailed = uploadErr.message;
            return undefined;
          }
          if (uploadData) {
            const { data: urlData } = supabase.storage.from('passport-images').getPublicUrl(fileName);
            return urlData.publicUrl;
          }
          return undefined;
        })(),

        // Update profile with extended fields (independent of image upload)
        (supabase.from('profiles') as unknown as { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> } }).update({
          occupation_institution_name: form.occupation_institution_name || null,
          occupation_institution_address: form.occupation_institution_address || null,
          occupation_country_state: form.occupation_country_state || null,
          next_of_kin_name: form.next_of_kin_name || null,
          next_of_kin_relationship: form.next_of_kin_relationship || null,
          next_of_kin_phone: form.next_of_kin_phone || null,
          next_of_kin_address: form.next_of_kin_address || null,
          highest_qualification: form.highest_qualification || null,
          religion: form.religion || null,
          purpose_of_visit: form.purpose_of_visit || null,
          ...(form.marital_status === 'married' ? {
            spouse_nationality: form.spouse_nationality || null,
            spouse_nationality_other: form.spouse_nationality === 'other' ? form.spouse_nationality_other || null : null,
            number_of_kids: form.number_of_kids !== '' ? Number(form.number_of_kids) : 0,
          } : {}),
        }).eq('id', user.id),
      ]);

      const passport_image_url = passportUploadResult;

      // Insert passport record after upload completes
      if (form.passport_number || passport_image_url) {
        await supabase.from('passports').insert({
          user_id: user.id,
          passport_number: form.passport_number || undefined,
          issue_date: form.issue_date || undefined,
          expiry_date: form.expiry_date || undefined,
          place_of_issue: form.place_of_issue || undefined,
          passport_image_url,
          is_biometric: false,
          verified: false,
        });
      }

      // Warn the user clearly if the passport image could not be uploaded
      if (passportUploadFailed) {
        toast({
          title: 'Passport image not uploaded',
          description: `Your account was created, but the passport photo failed to upload (${passportUploadFailed}). Please log in and re-upload it from your dashboard.`,
          variant: 'destructive',
        });
      }
    }

    setSuccess(true);
    setLoading(false);

    trackEvent('member_registered', {
      eventType: 'conversion',
      properties: {
        city: form.vietnam_city || 'unknown',
        occupation: form.occupation_type || 'other',
        purpose_of_visit: form.purpose_of_visit || 'unknown',
      },
    });

    toast({
      title: 'Registration Successful!',
      description: 'Welcome to NIDO Vietnam. Your profile has been created.',
    });

    setTimeout(() => navigate('/dashboard'), 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-24 gradient-hero">
          <Card className="w-full max-w-md text-center shadow-green p-8">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to NIDO Vietnam!</h2>
            <p className="text-muted-foreground">Your registration was successful. Redirecting to your dashboard...</p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const occupationConfig = OCCUPATION_DETAIL_CONFIG[form.occupation_type];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 px-4 py-24 gradient-hero">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <img src="https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png" alt="NIDO Vietnam" className="h-14 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-primary-foreground">Join NIDO Vietnam</h1>
            <p className="text-primary-foreground/70 mt-1">Register as a NIDO community member</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex-1 flex flex-col items-center relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 transition-smooth ${
                    i < step ? 'gradient-primary text-primary-foreground' :
                    i === step ? 'gradient-gold text-gold-foreground' :
                    'bg-card text-muted-foreground border border-border'
                  }`}>
                    {i < step ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <p className="text-xs mt-2 text-center hidden sm:block text-primary-foreground/70">{s.title}</p>
                  {i < STEPS.length - 1 && (
                    <div className={`absolute top-5 left-1/2 w-full h-0.5 ${i < step ? 'bg-primary' : 'bg-border'}`} style={{ left: '50%' }} />
                  )}
                </div>
              );
            })}
          </div>

          <Progress value={((step + 1) / STEPS.length) * 100} className="mb-6 h-1.5" />

          <Card className="shadow-green border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Step {step + 1}: {STEPS[step].title}</CardTitle>
              <CardDescription>{STEPS[step].desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* ─── STEP 1: Personal Info ─── */}
              {step === 0 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Chukwuemeka" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Obi" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address *</Label>
                    <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 characters" />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password *</Label>
                      <Input type="password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} placeholder="Repeat password" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+234..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={form.gender} onValueChange={v => set('gender', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>State of Origin</Label>
                      <Select value={form.nigerian_state_of_origin} onValueChange={v => set('nigerian_state_of_origin', v)}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>
                          {NIGERIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* ─── STEP 2: Profile Details ─── */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label>Occupation / User Type *</Label>
                    <Select value={form.occupation_type} onValueChange={v => {
                      set('occupation_type', v as OccupationType);
                      // Clear dynamic fields when switching occupation
                      setForm(prev => ({ ...prev, occupation_type: v as OccupationType, occupation_institution_name: '', occupation_institution_address: '', occupation_country_state: '' }));
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(OCCUPATION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dynamic occupation sub-fields */}
                  {occupationConfig && (
                    <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-3">
                      <p className="text-sm font-semibold text-foreground">{occupationConfig.sectionTitle}</p>
                      <div className="space-y-2">
                        <Label>{occupationConfig.nameLabel}</Label>
                        <Input
                          value={form.occupation_institution_name}
                          onChange={e => set('occupation_institution_name', e.target.value)}
                          placeholder={occupationConfig.nameLabel}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{occupationConfig.addressLabel}</Label>
                        <Input
                          value={form.occupation_institution_address}
                          onChange={e => set('occupation_institution_address', e.target.value)}
                          placeholder="Street address, district..."
                        />
                      </div>
                      {occupationConfig.showCountryState && (
                        <div className="space-y-2">
                          <Label>City / Province in Vietnam</Label>
                          <Input
                            value={form.occupation_country_state}
                            onChange={e => set('occupation_country_state', e.target.value)}
                            placeholder="e.g. Ho Chi Minh City, Hanoi, Da Nang"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Marital Status *</Label>
                    <Select value={form.marital_status} onValueChange={v => set('marital_status', v as MaritalStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MARITAL_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ── Married sub-form ── */}
                  {form.marital_status === 'married' && (
                    <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-4">
                      <p className="text-sm font-semibold text-foreground">Spouse &amp; Family Information</p>

                      {/* Spouse nationality */}
                      <div className="space-y-2">
                        <Label>Spouse Nationality</Label>
                        <Select value={form.spouse_nationality} onValueChange={v => set('spouse_nationality', v as SpouseNationality)}>
                          <SelectTrigger><SelectValue placeholder="Select spouse nationality" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vietnamese">Vietnamese</SelectItem>
                            <SelectItem value="nigerian">Nigerian</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Custom nationality text box */}
                      {form.spouse_nationality === 'other' && (
                        <div className="space-y-2">
                          <Label>Spouse's Nationality (specify)</Label>
                          <Input
                            value={form.spouse_nationality_other}
                            onChange={e => set('spouse_nationality_other', e.target.value)}
                            placeholder="e.g. Ghanaian, Chinese, Indian..."
                          />
                        </div>
                      )}

                      {/* Number of kids */}
                      <div className="space-y-2">
                        <Label>Number of Children</Label>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={form.number_of_kids === '' ? '' : String(form.number_of_kids)}
                          onChange={e => setForm(prev => ({ ...prev, number_of_kids: e.target.value === '' ? '' : Number(e.target.value) }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>City in Vietnam *</Label>
                    <Select value={form.vietnam_city} onValueChange={v => set('vietnam_city', v)}>
                      <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                      <SelectContent>
                        {VIETNAM_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Address in Vietnam</Label>
                    <Input value={form.vietnam_address} onChange={e => set('vietnam_address', e.target.value)} placeholder="Street address, district..." />
                  </div>
                </>
              )}

              {/* ─── STEP 3: Additional Details ─── */}
              {step === 2 && (
                <>
                  {/* Next of Kin */}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Next of Kin Details</p>
                    <p className="text-xs text-muted-foreground">Emergency contact information</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={form.next_of_kin_name} onChange={e => set('next_of_kin_name', e.target.value)} placeholder="Full name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Input value={form.next_of_kin_relationship} onChange={e => set('next_of_kin_relationship', e.target.value)} placeholder="e.g. Spouse, Parent, Sibling" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input value={form.next_of_kin_phone} onChange={e => set('next_of_kin_phone', e.target.value)} placeholder="+234..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={form.next_of_kin_address} onChange={e => set('next_of_kin_address', e.target.value)} placeholder="Street address" />
                    </div>
                  </div>

                  <Separator className="my-2" />

                  {/* Qualification */}
                  <div className="space-y-2">
                    <Label>Highest Qualification</Label>
                    <Select value={form.highest_qualification} onValueChange={v => set('highest_qualification', v as QualificationType)}>
                      <SelectTrigger><SelectValue placeholder="Select qualification" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUALIFICATION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator className="my-2" />

                  {/* Religion */}
                  <div className="space-y-2">
                    <Label>Religion</Label>
                    <Select value={form.religion} onValueChange={v => set('religion', v as ReligionType)}>
                      <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(RELIGION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator className="my-2" />

                  {/* Purpose of Visit */}
                  <div className="space-y-2">
                    <Label>Purpose of Visiting Vietnam</Label>
                    <Select value={form.purpose_of_visit} onValueChange={v => set('purpose_of_visit', v as PurposeOfVisitType)}>
                      <SelectTrigger><SelectValue placeholder="Select purpose of visit" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PURPOSE_OF_VISIT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* ─── STEP 4: Passport ─── */}
              {step === 3 && (
                <>
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/30 text-sm">
                    <p className="font-semibold text-foreground mb-1">Passport information is required</p>
                    <p className="text-muted-foreground">Your passport details are mandatory for membership. You can update them later from your dashboard if needed.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Passport Number</Label>
                      <Input value={form.passport_number} onChange={e => set('passport_number', e.target.value)} placeholder="A00000000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Place of Issue</Label>
                      <Input value={form.place_of_issue} onChange={e => set('place_of_issue', e.target.value)} placeholder="Lagos, Abuja..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Issue Date</Label>
                      <Input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Passport Image</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-smooth cursor-pointer"
                      onClick={() => document.getElementById('passport-upload')?.click()}>
                      {form.passport_image ? (
                        <div>
                          <img src={URL.createObjectURL(form.passport_image)} alt="Passport" className="h-32 mx-auto rounded object-cover mb-2" />
                          <p className="text-sm text-primary">{form.passport_image.name}</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload passport photo page</p>
                          <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 5MB</p>
                        </>
                      )}
                    </div>
                    <input
                      id="passport-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => set('passport_image', e.target.files?.[0] || null)}
                    />
                  </div>
                </>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-4">
                {step > 0 && (
                  <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 gap-2">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                )}
                {step < STEPS.length - 1 ? (
                  <Button onClick={handleNext} className="flex-1 gradient-primary text-primary-foreground gap-2">
                    Continue <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={loading} className="flex-1 gradient-primary text-primary-foreground">
                    {loading ? 'Registering...' : 'Complete Registration'}
                  </Button>
                )}
              </div>

              {step === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  Already a member?{' '}
                  <Link to="/login" className="text-primary hover:underline">Sign In</Link>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
