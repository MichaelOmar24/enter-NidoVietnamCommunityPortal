import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Profile, Passport, OCCUPATION_LABELS, MARITAL_STATUS_LABELS, NIGERIAN_STATES, VIETNAM_CITIES, RELIGION_LABELS, QUALIFICATION_LABELS, PURPOSE_OF_VISIT_LABELS, OccupationType, MaritalStatus, Gender, ReligionType, QualificationType, PurposeOfVisitType, SpouseNationality } from '@/lib/types';
import { Search, Eye, Edit, Check, AlertTriangle, X, ChevronLeft, ChevronRight, ZoomIn, Fingerprint, FileImage, ShieldCheck, ShieldX, UserPlus, Copy, CheckCheck, Upload, Trash2, Shield, ShieldOff, Heart, Baby } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface MemberWithPassport extends Profile {
  passport?: Passport;
}

export function AdminMembers() {
  const { isSuperAdmin } = useAuth();
  const [members, setMembers] = useState<MemberWithPassport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<MemberWithPassport | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingPassport, setEditingPassport] = useState<Partial<Passport>>({});
  const [passportImageOpen, setPassportImageOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '', first_name: '', last_name: '', phone: '',
    date_of_birth: '', gender: '' as Gender | '',
    occupation_type: '' as OccupationType | '',
    occupation_institution_name: '', occupation_institution_address: '', occupation_country_state: '',
    marital_status: '' as MaritalStatus | '',
    vietnam_city: '', vietnam_address: '', nigerian_state_of_origin: '', lga_of_origin: '',
    next_of_kin_name: '', next_of_kin_relationship: '', next_of_kin_phone: '', next_of_kin_address: '',
    religion: '' as ReligionType | '',
    highest_qualification: '' as QualificationType | '',
    purpose_of_visit: '' as PurposeOfVisitType | '',
    // Spouse & family
    spouse_nationality: '' as SpouseNationality | '',
    spouse_nationality_other: '',
    number_of_kids: '' as number | '',
  });
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [passportForm, setPassportForm] = useState({
    passport_number: '', place_of_issue: '',
    issue_date: '', expiry_date: '',
    is_biometric: false, verified: false, admin_notes: '',
  });
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [spousePassportFile, setSpousePassportFile] = useState<File | null>(null);
  const [spousePassportPreview, setSpousePassportPreview] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberWithPassport | null>(null);
  const [deleting, setDeleting] = useState(false);
  const PAGE_SIZE = 15;
  const { toast } = useToast();

  useEffect(() => { loadMembers(); }, [page, filter, search]);

  const loadMembers = async () => {
    setLoading(true);
    let q = supabase.from('profiles').select('*', { count: 'exact' });
    if (filter !== 'all') q = q.eq('membership_status', filter as 'active' | 'pending' | 'expired');
    if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    q = q.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    const { data, count } = await q;
    setMembers((data || []) as MemberWithPassport[]);
    setTotal(count || 0);
    setLoading(false);
  };

  const viewMember = async (member: MemberWithPassport) => {
    const { data } = await supabase.from('passports').select('*').eq('user_id', member.id).maybeSingle();
    const pp = data as Passport | null;
    const m = { ...member, passport: pp || undefined };
    setSelected(m);
    setEditingPassport(pp || {});
  };

  const updateMemberStatus = async (id: string, status: string) => {
    await supabase.from('profiles').update({ membership_status: status as 'active' | 'pending' | 'expired' }).eq('id', id);
    toast({ title: 'Status updated', description: `Member status changed to ${status}` });
    loadMembers();
    if (selected?.id === id) setSelected(s => s ? { ...s, membership_status: status as 'active' | 'pending' | 'expired' } : null);
  };

  const toggleAdminRole = async (memberId: string, grantAdmin: boolean) => {
    await supabase.from('profiles').update({ is_admin: grantAdmin }).eq('id', memberId);
    toast({
      title: grantAdmin ? 'Admin role granted' : 'Admin role revoked',
      description: grantAdmin ? 'This member can now access the admin panel.' : 'Admin access has been removed.',
    });
    loadMembers();
    if (selected?.id === memberId) setSelected(s => s ? { ...s, is_admin: grantAdmin } : null);
  };

  const toggleEmbassyRole = async (memberId: string, grant: boolean) => {
    await supabase.from('profiles').update({ is_embassy_staff: grant }).eq('id', memberId);
    toast({
      title: grant ? 'Embassy Staff role granted' : 'Embassy Staff role revoked',
      description: grant ? 'This member can now access the Embassy Intelligence Portal.' : 'Embassy access has been removed.',
    });
    loadMembers();
    if (selected?.id === memberId) setSelected(s => s ? { ...s, is_embassy_staff: grant } : null);
  };

  const savePassportEdit = async () => {
    if (!selected?.passport?.id) return;
    await supabase.from('passports').update({
      passport_number: editingPassport.passport_number,
      issue_date: editingPassport.issue_date,
      expiry_date: editingPassport.expiry_date,
      place_of_issue: editingPassport.place_of_issue,
      admin_notes: editingPassport.admin_notes,
      verified: editingPassport.verified,
      is_biometric: editingPassport.is_biometric,
    }).eq('id', selected.passport.id);
    toast({ title: 'Passport updated', description: 'Passport information has been saved.' });
  };

  const passportDaysToExpiry = (passport?: Passport) => {
    if (!passport?.expiry_date) return null;
    return differenceInDays(parseISO(passport.expiry_date), new Date());
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const createUser = async () => {
    if (!createForm.email || !createForm.first_name || !createForm.last_name) {
      toast({ title: 'Missing fields', description: 'Email, first name and last name are required.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        ...createForm,
        gender: createForm.gender || undefined,
        occupation_type: createForm.occupation_type || undefined,
        marital_status: createForm.marital_status || undefined,
        date_of_birth: createForm.date_of_birth || undefined,
        vietnam_city: createForm.vietnam_city || undefined,
        nigerian_state_of_origin: createForm.nigerian_state_of_origin || undefined,
      },
    });

    if (error || data?.error) {
      setCreating(false);
      toast({ title: 'Failed to create account', description: error?.message || data?.error, variant: 'destructive' });
      return;
    }

    const userId = data.user_id;

    // Update profile with extended fields
    if (userId) {
      let spousePassportUrl: string | null = null;
      if (spousePassportFile) {
        const ext = spousePassportFile.name.split('.').pop();
        const fileName = `spouse_passport_${userId}_${Date.now()}.${ext}`;
        const { data: spUploadData, error: spUploadErr } = await supabase.storage
          .from('passport-images')
          .upload(fileName, spousePassportFile);
        if (!spUploadErr && spUploadData) {
          const { data: spUrlData } = supabase.storage.from('passport-images').getPublicUrl(fileName);
          spousePassportUrl = spUrlData.publicUrl;
        }
      }

      await (supabase.from('profiles') as unknown as { update: (d: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<unknown> } }).update({
        occupation_institution_name: createForm.occupation_institution_name || null,
        occupation_institution_address: createForm.occupation_institution_address || null,
        occupation_country_state: createForm.occupation_country_state || null,
        vietnam_address: createForm.vietnam_address || null,
        lga_of_origin: createForm.lga_of_origin || null,
        next_of_kin_name: createForm.next_of_kin_name || null,
        next_of_kin_relationship: createForm.next_of_kin_relationship || null,
        next_of_kin_phone: createForm.next_of_kin_phone || null,
        next_of_kin_address: createForm.next_of_kin_address || null,
        religion: createForm.religion || null,
        highest_qualification: createForm.highest_qualification || null,
        purpose_of_visit: createForm.purpose_of_visit || null,
        ...(createForm.marital_status === 'married' ? {
          spouse_nationality: createForm.spouse_nationality || null,
          spouse_nationality_other: createForm.spouse_nationality === 'other' ? createForm.spouse_nationality_other || null : null,
          number_of_kids: createForm.number_of_kids !== '' ? Number(createForm.number_of_kids) : 0,
          spouse_passport_url: spousePassportUrl,
        } : {}),
      }).eq('id', userId);
    }

    // Handle passport creation if any passport data was provided
    const hasPassportData = passportForm.passport_number || passportForm.issue_date ||
      passportForm.expiry_date || passportForm.place_of_issue || passportFile;

    if (hasPassportData && userId) {
      let passportImageUrl: string | null = null;

      // Upload passport image if provided
      if (passportFile) {
        const fd = new FormData();
        fd.append('file', passportFile);
        fd.append('userId', userId);
        const { data: imgData, error: imgErr } = await supabase.functions.invoke('upload-passport-image', { body: fd });
        if (!imgErr && imgData?.url) passportImageUrl = imgData.url;
      }

      // Insert passport record
      await supabase.from('passports').insert({
        user_id: userId,
        passport_number: passportForm.passport_number || null,
        place_of_issue: passportForm.place_of_issue || null,
        issue_date: passportForm.issue_date || null,
        expiry_date: passportForm.expiry_date || null,
        is_biometric: passportForm.is_biometric,
        verified: passportForm.verified,
        admin_notes: passportForm.admin_notes || null,
        passport_image_url: passportImageUrl,
      });
    }

    // Send full profile + passport notification email to admin
    await supabase.functions.invoke('notify-admin', { body: { user_id: userId } });

    setCreating(false);
    setCreateOpen(false);
    setCreateForm({
      email: '', first_name: '', last_name: '', phone: '',
      date_of_birth: '', gender: '', occupation_type: '',
      occupation_institution_name: '', occupation_institution_address: '', occupation_country_state: '',
      marital_status: '', vietnam_city: '', vietnam_address: '', nigerian_state_of_origin: '', lga_of_origin: '',
      next_of_kin_name: '', next_of_kin_relationship: '', next_of_kin_phone: '', next_of_kin_address: '',
      religion: '', highest_qualification: '', purpose_of_visit: '',
      spouse_nationality: '', spouse_nationality_other: '', number_of_kids: '',
    });
    setPassportForm({ passport_number: '', place_of_issue: '', issue_date: '', expiry_date: '', is_biometric: false, verified: false, admin_notes: '' });
    setPassportFile(null);
    setPassportPreview(null);
    setSpousePassportFile(null);
    setSpousePassportPreview(null);
    setCredentials({ email: createForm.email, password: data.password });
    loadMembers();
  };

  const copyCredentials = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { user_id: deleteTarget.id },
    });
    setDeleting(false);
    if (error || data?.error) {
      toast({ title: 'Delete failed', description: error?.message || data?.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Account deleted', description: `${deleteTarget.first_name} ${deleteTarget.last_name}'s account has been permanently removed.` });
    setDeleteTarget(null);
    loadMembers();
  };

  return (
    <AdminLayout title="Member Management">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or email..." className="pl-9" />
        </div>
        <Select value={filter} onValueChange={v => { setFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button className="gradient-primary text-primary-foreground gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" /> Create Account
        </Button>
      </div>

      {/* Create Account Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Create Member Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              A secure password will be generated automatically and shown after creation.
            </p>

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input value={createForm.first_name} onChange={e => setCreateForm(f => ({ ...f, first_name: e.target.value }))} placeholder="e.g. Chidi" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input value={createForm.last_name} onChange={e => setCreateForm(f => ({ ...f, last_name: e.target.value }))} placeholder="e.g. Okeke" />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email Address *</Label>
                <Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="member@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} placeholder="+84..." />
              </div>
            </div>

            {/* DOB & Gender */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" value={createForm.date_of_birth} onChange={e => setCreateForm(f => ({ ...f, date_of_birth: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={createForm.gender} onValueChange={v => setCreateForm(f => ({ ...f, gender: v as Gender }))}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Occupation & Marital Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Occupation</Label>
                <Select value={createForm.occupation_type} onValueChange={v => setCreateForm(f => ({ ...f, occupation_type: v as OccupationType, occupation_institution_name: '', occupation_institution_address: '', occupation_country_state: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Select occupation" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(OCCUPATION_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Marital Status</Label>
                <Select value={createForm.marital_status} onValueChange={v => setCreateForm(f => ({ ...f, marital_status: v as MaritalStatus }))}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MARITAL_STATUS_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dynamic Occupation Sub-Fields */}
            {(['student', 'business', 'employee', 'teacher'] as OccupationType[]).includes(createForm.occupation_type as OccupationType) && (() => {
              const cfg: Record<string, { title: string; nameLabel: string; addressLabel: string; showCity: boolean }> = {
                student: { title: 'Institution Details', nameLabel: 'Name of Institution', addressLabel: 'Institution Address', showCity: true },
                business: { title: 'Business Details', nameLabel: 'Business Name', addressLabel: 'Business Address', showCity: false },
                employee: { title: 'Employer Details', nameLabel: 'Employer / Company Name', addressLabel: 'Company Address', showCity: false },
                teacher: { title: 'Workplace Details', nameLabel: 'School / Academy / Training Centre Name', addressLabel: 'Workplace Address', showCity: false },
              };
              const c = cfg[createForm.occupation_type];
              return (
                <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-3">
                  <p className="text-xs font-semibold text-foreground">{c.title}</p>
                  <div className="space-y-1.5">
                    <Label>{c.nameLabel}</Label>
                    <Input value={createForm.occupation_institution_name} onChange={e => setCreateForm(f => ({ ...f, occupation_institution_name: e.target.value }))} placeholder={c.nameLabel} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{c.addressLabel}</Label>
                    <Input value={createForm.occupation_institution_address} onChange={e => setCreateForm(f => ({ ...f, occupation_institution_address: e.target.value }))} placeholder="Street address, district..." />
                  </div>
                  {c.showCity && (
                    <div className="space-y-1.5">
                      <Label>City / Province in Vietnam</Label>
                      <Input value={createForm.occupation_country_state} onChange={e => setCreateForm(f => ({ ...f, occupation_country_state: e.target.value }))} placeholder="e.g. Ho Chi Minh City, Hanoi, Da Nang" />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Vietnam City & Address */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vietnam City</Label>
                <Select value={createForm.vietnam_city} onValueChange={v => setCreateForm(f => ({ ...f, vietnam_city: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {VIETNAM_CITIES.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Address in Vietnam</Label>
                <Input value={createForm.vietnam_address} onChange={e => setCreateForm(f => ({ ...f, vietnam_address: e.target.value }))} placeholder="Street address, district..." />
              </div>
            </div>

            {/* State of Origin & LGA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>State of Origin</Label>
                <Select value={createForm.nigerian_state_of_origin} onValueChange={v => setCreateForm(f => ({ ...f, nigerian_state_of_origin: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_STATES.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>LGA of Origin</Label>
                <Input value={createForm.lga_of_origin} onChange={e => setCreateForm(f => ({ ...f, lga_of_origin: e.target.value }))} placeholder="Local Government Area" />
              </div>
            </div>

            {/* Religion & Qualification */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Religion</Label>
                <Select value={createForm.religion} onValueChange={v => setCreateForm(f => ({ ...f, religion: v as ReligionType }))}>
                  <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RELIGION_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Highest Qualification</Label>
                <Select value={createForm.highest_qualification} onValueChange={v => setCreateForm(f => ({ ...f, highest_qualification: v as QualificationType }))}>
                  <SelectTrigger><SelectValue placeholder="Select qualification" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUALIFICATION_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Purpose of Visit */}
            <div className="space-y-1.5">
              <Label>Purpose of Visit to Vietnam</Label>
              <Select value={createForm.purpose_of_visit} onValueChange={v => setCreateForm(f => ({ ...f, purpose_of_visit: v as PurposeOfVisitType }))}>
                <SelectTrigger><SelectValue placeholder="Select purpose of visit" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PURPOSE_OF_VISIT_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Married Sub-Form */}
            {createForm.marital_status === 'married' && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-3">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-red-500" /> Spouse &amp; Family Information
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Spouse Nationality</Label>
                    <Select value={createForm.spouse_nationality} onValueChange={v => setCreateForm(f => ({ ...f, spouse_nationality: v as SpouseNationality }))}>
                      <SelectTrigger><SelectValue placeholder="Select nationality" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vietnamese">Vietnamese</SelectItem>
                        <SelectItem value="nigerian">Nigerian</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Number of Children</Label>
                    <Input
                      type="number" min={0} max={20}
                      value={createForm.number_of_kids === '' ? '' : String(createForm.number_of_kids)}
                      onChange={e => setCreateForm(f => ({ ...f, number_of_kids: e.target.value === '' ? '' : Number(e.target.value) }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                {createForm.spouse_nationality === 'other' && (
                  <div className="space-y-1.5">
                    <Label>Spouse's Nationality (specify)</Label>
                    <Input value={createForm.spouse_nationality_other} onChange={e => setCreateForm(f => ({ ...f, spouse_nationality_other: e.target.value }))} placeholder="e.g. Ghanaian, Chinese, Indian..." />
                  </div>
                )}
                {/* Spouse Passport Upload */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    Spouse Passport <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                  </Label>
                  {spousePassportPreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
                      <img src={spousePassportPreview} alt="Spouse Passport" className="w-full h-36 object-cover" />
                      <button onClick={() => { setSpousePassportFile(null); setSpousePassportPreview(null); }} className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute top-2 left-2">
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-black/60 text-white border-0">
                          <Heart className="h-2.5 w-2.5 mr-1" /> Spouse Passport
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => document.getElementById('create-spouse-passport-upload')?.click()}>
                      <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">Click to upload spouse passport</p>
                    </div>
                  )}
                  <input id="create-spouse-passport-upload" type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setSpousePassportFile(file);
                    if (file) setSpousePassportPreview(URL.createObjectURL(file));
                    else setSpousePassportPreview(null);
                  }} />
                </div>
              </div>
            )}

            {/* Next of Kin */}
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Next of Kin Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input value={createForm.next_of_kin_name} onChange={e => setCreateForm(f => ({ ...f, next_of_kin_name: e.target.value }))} placeholder="Full name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Relationship</Label>
                  <Input value={createForm.next_of_kin_relationship} onChange={e => setCreateForm(f => ({ ...f, next_of_kin_relationship: e.target.value }))} placeholder="e.g. Spouse, Parent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input value={createForm.next_of_kin_phone} onChange={e => setCreateForm(f => ({ ...f, next_of_kin_phone: e.target.value }))} placeholder="+234..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input value={createForm.next_of_kin_address} onChange={e => setCreateForm(f => ({ ...f, next_of_kin_address: e.target.value }))} placeholder="Street address" />
                </div>
              </div>
            </div>

            {/* Passport Section */}
            <div className="border-t border-border pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-foreground text-sm">Passport Information <span className="text-muted-foreground font-normal">(Optional)</span></h4>
              </div>

              {/* Passport Image Upload */}
              <div className="space-y-1.5">
                <Label>Passport Data Page Photo</Label>
                {passportPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
                    <img src={passportPreview} alt="Passport" className="w-full h-44 object-cover" />
                    <div className="absolute top-2 left-2">
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-black/60 text-white border-0">
                        <FileImage className="h-2.5 w-2.5 mr-1" /> Passport Photo
                      </Badge>
                    </div>
                    <button
                      onClick={() => { setPassportFile(null); setPassportPreview(null); }}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => document.getElementById('create-passport-upload')?.click()}
                  >
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />
                    <p className="text-sm text-muted-foreground">Click to upload passport data page</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">JPG, PNG — up to 10MB</p>
                  </div>
                )}
                <input
                  id="create-passport-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setPassportFile(file);
                    if (file) setPassportPreview(URL.createObjectURL(file));
                    else setPassportPreview(null);
                  }}
                />
              </div>

              {/* Passport Number & Place of Issue */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Passport Number</Label>
                  <Input value={passportForm.passport_number} onChange={e => setPassportForm(f => ({ ...f, passport_number: e.target.value }))} placeholder="e.g. A12684777" />
                </div>
                <div className="space-y-1.5">
                  <Label>Place of Issue</Label>
                  <Input value={passportForm.place_of_issue} onChange={e => setPassportForm(f => ({ ...f, place_of_issue: e.target.value }))} placeholder="e.g. KL Malaysia" />
                </div>
              </div>

              {/* Issue & Expiry Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Issue Date</Label>
                  <Input type="date" value={passportForm.issue_date} onChange={e => setPassportForm(f => ({ ...f, issue_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={passportForm.expiry_date} onChange={e => setPassportForm(f => ({ ...f, expiry_date: e.target.value }))} />
                </div>
              </div>

              {/* Biometric & Verified */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={passportForm.is_biometric}
                    onChange={e => setPassportForm(f => ({ ...f, is_biometric: e.target.checked }))}
                    className="rounded"
                  />
                  <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
                  Biometric Passport
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={passportForm.verified}
                    onChange={e => setPassportForm(f => ({ ...f, verified: e.target.checked }))}
                    className="rounded"
                  />
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  Mark as Verified
                </label>
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <Label>Admin Notes</Label>
                <Textarea
                  value={passportForm.admin_notes}
                  onChange={e => setPassportForm(f => ({ ...f, admin_notes: e.target.value }))}
                  rows={2}
                  placeholder="Internal notes about this passport..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button onClick={createUser} disabled={creating} className="flex-1 gradient-primary text-primary-foreground">
                {creating ? 'Creating...' : 'Create Account'}
              </Button>
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog open={!!credentials} onOpenChange={() => setCredentials(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Check className="h-5 w-5" /> Account Created Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              The account has been created. Share these credentials with the member. They will also receive a password setup email.
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Email / Username</p>
                <p className="font-medium text-foreground text-sm">{credentials?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Temporary Password</p>
                <p className="font-mono text-lg font-bold text-primary tracking-wider">{credentials?.password}</p>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              Advise the member to change their password after first login.
            </p>
            <div className="flex gap-3">
              <Button onClick={copyCredentials} variant="outline" className="flex-1 gap-2">
                {copied ? <><CheckCheck className="h-4 w-4 text-primary" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Credentials</>}
              </Button>
              <Button onClick={() => setCredentials(null)} className="flex-1 gradient-primary text-primary-foreground">Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Permanently Delete Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-1">
              <p className="font-semibold text-foreground">{deleteTarget?.first_name} {deleteTarget?.last_name}</p>
              <p className="text-sm text-muted-foreground">{deleteTarget?.email}</p>
              <Badge className="bg-destructive/20 text-destructive mt-1">Expired</Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will <strong className="text-foreground">permanently delete</strong> the account, profile, passport records, and all associated data. <strong className="text-destructive">This action cannot be undone.</strong>
            </p>
            <div className="flex gap-3">
              <Button
                onClick={deleteUser}
                disabled={deleting}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Members ({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Member</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Occupation</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Marital</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">City</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Joined</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded animate-pulse w-full" />
                      </td>
                    </tr>
                  ))
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No members found</td>
                  </tr>
                ) : members.map(member => (
                  <tr key={member.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground flex items-center gap-1.5">
                          {member.first_name} {member.last_name}
                          {member.is_admin && <Shield className="h-3 w-3 text-primary" title="Admin" />}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{member.occupation_type?.replace(/_/g, ' ') || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{member.marital_status || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{member.vietnam_city || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge className={
                        member.membership_status === 'active' ? 'bg-primary/20 text-primary' :
                        member.membership_status === 'pending' ? 'bg-gold/20 text-gold' :
                        'bg-destructive/20 text-destructive'
                      }>{member.membership_status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(member.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => viewMember(member)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{selected?.first_name} {selected?.last_name}</DialogTitle>
                            </DialogHeader>
                            {selected && (
                              <div className="space-y-4">
                                {/* Profile info */}
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {[
                                    ['Email', selected.email],
                                    ['Phone', selected.phone],
                                    ['DOB', selected.date_of_birth],
                                    ['Gender', selected.gender],
                                    ['Occupation', selected.occupation_type?.replace(/_/g, ' ')],
                                    ['Marital Status', selected.marital_status],
                                    ['Vietnam City', selected.vietnam_city],
                                    ['State of Origin', selected.nigerian_state_of_origin],
                                  ].map(([k, v]) => (
                                    <div key={k} className="flex flex-col">
                                      <span className="text-muted-foreground text-xs">{k}</span>
                                      <span className="text-foreground capitalize">{v || '-'}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Spouse & Family Info */}
                                {selected.marital_status === 'married' && (
                                  <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-3">
                                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                      <Heart className="h-3.5 w-3.5 text-red-500" /> Spouse &amp; Family
                                    </p>
                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                      <div>
                                        <span className="text-muted-foreground text-xs block">Spouse Nationality</span>
                                        <span className="text-foreground capitalize">
                                          {(selected as Profile & { spouse_nationality?: string; spouse_nationality_other?: string }).spouse_nationality === 'other'
                                            ? (selected as Profile & { spouse_nationality_other?: string }).spouse_nationality_other || 'Other'
                                            : (selected as Profile & { spouse_nationality?: string }).spouse_nationality || '-'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground text-xs block">Children</span>
                                        <span className="text-foreground flex items-center gap-1">
                                          <Baby className="h-3.5 w-3.5 text-purple-500" />
                                          {(selected as Profile & { number_of_kids?: number }).number_of_kids ?? 0}
                                        </span>
                                      </div>
                                    </div>
                                    {/* Spouse Passport */}
                                    {(selected as Profile & { spouse_passport_url?: string }).spouse_passport_url && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1.5">Spouse Passport</p>
                                        <div className="relative group rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer"
                                          onClick={() => window.open((selected as Profile & { spouse_passport_url?: string }).spouse_passport_url, '_blank')}>
                                          <img
                                            src={(selected as Profile & { spouse_passport_url?: string }).spouse_passport_url}
                                            alt="Spouse Passport"
                                            className="w-full h-36 object-cover transition-transform group-hover:scale-105"
                                            onContextMenu={e => e.preventDefault()}
                                          />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="flex items-center gap-1.5 text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-full">
                                              <ZoomIn className="h-3.5 w-3.5" /> View Full Size
                                            </div>
                                          </div>
                                          <div className="absolute top-2 left-2">
                                            <Badge className="text-[10px] px-1.5 py-0.5 bg-black/60 text-white border-0">
                                              <Heart className="h-2.5 w-2.5 mr-1" /> Spouse Passport
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Status control */}
                                <div className="flex gap-2 flex-wrap">
                                  <Button size="sm" className="bg-primary text-primary-foreground gap-1" onClick={() => updateMemberStatus(selected.id, 'active')}>
                                    <Check className="h-3.5 w-3.5" /> Activate
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1 text-gold border-gold hover:bg-gold/10" onClick={() => updateMemberStatus(selected.id, 'pending')}>
                                    <AlertTriangle className="h-3.5 w-3.5" /> Set Pending
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive hover:bg-destructive/10" onClick={() => updateMemberStatus(selected.id, 'expired')}>
                                    <X className="h-3.5 w-3.5" /> Expire
                                  </Button>
                                </div>

                                {/* Role Assignment — Super Admin Only */}
                                {isSuperAdmin && (
                                  <div className="border border-border rounded-lg p-3 bg-muted/20 space-y-3">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                      <Shield className="h-3.5 w-3.5" /> Role Assignment
                                    </p>

                                    {/* Admin Role */}
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1">
                                        {selected.is_admin ? (
                                          <div className="flex items-center gap-2">
                                            <Badge className="bg-primary/20 text-primary gap-1 text-xs">
                                              <Shield className="h-3 w-3" /> Admin
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">Has admin panel access</span>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">No admin access</span>
                                        )}
                                      </div>
                                      {selected.is_admin ? (
                                        <Button size="sm" variant="outline"
                                          className="gap-1.5 text-destructive border-destructive hover:bg-destructive/10 text-xs"
                                          onClick={() => toggleAdminRole(selected.id, false)}>
                                          <ShieldOff className="h-3.5 w-3.5" /> Revoke Admin
                                        </Button>
                                      ) : (
                                        <Button size="sm"
                                          className="gap-1.5 gradient-primary text-primary-foreground text-xs"
                                          onClick={() => toggleAdminRole(selected.id, true)}>
                                          <Shield className="h-3.5 w-3.5" /> Grant Admin
                                        </Button>
                                      )}
                                    </div>

                                    {/* Embassy Staff Role */}
                                    <div className="flex items-center gap-3 border-t border-border pt-3">
                                      <div className="flex-1">
                                        {(selected as Profile & { is_embassy_staff?: boolean }).is_embassy_staff ? (
                                          <div className="flex items-center gap-2">
                                            <Badge className="bg-yellow-500/20 text-yellow-600 gap-1 text-xs border border-yellow-500/30">
                                              <ShieldCheck className="h-3 w-3" /> Embassy Staff
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">Can access Intelligence Portal</span>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">No embassy portal access</span>
                                        )}
                                      </div>
                                      {(selected as Profile & { is_embassy_staff?: boolean }).is_embassy_staff ? (
                                        <Button size="sm" variant="outline"
                                          className="gap-1.5 text-destructive border-destructive hover:bg-destructive/10 text-xs"
                                          onClick={() => toggleEmbassyRole(selected.id, false)}>
                                          <ShieldOff className="h-3.5 w-3.5" /> Revoke Embassy
                                        </Button>
                                      ) : (
                                        <Button size="sm"
                                          className="gap-1.5 bg-yellow-500/20 text-yellow-700 border border-yellow-500/40 hover:bg-yellow-500/30 text-xs"
                                          onClick={() => toggleEmbassyRole(selected.id, true)}>
                                          <ShieldCheck className="h-3.5 w-3.5" /> Grant Embassy Access
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Passport editing */}
                                {selected.passport && (
                                  <div className="border-t border-border pt-4">
                                    <h4 className="font-semibold text-sm mb-3">Passport Information (Editable)</h4>

                                    {/* Passport Image + Biometric Banner */}
                                    <div className="flex gap-3 mb-4">
                                      {/* Passport Image Card */}
                                      <div className="flex-1">
                                        {selected.passport.passport_image_url ? (
                                          <div className="relative group rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer"
                                            onClick={() => setPassportImageOpen(true)}>
                                            <img
                                              src={selected.passport.passport_image_url}
                                              alt="Passport"
                                              className="w-full h-36 object-cover transition-transform group-hover:scale-105"
                                              onContextMenu={e => e.preventDefault()}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                              <div className="flex items-center gap-1.5 text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-full">
                                                <ZoomIn className="h-3.5 w-3.5" /> View Full Size
                                              </div>
                                            </div>
                                            <div className="absolute top-2 left-2">
                                              <Badge className="text-[10px] px-1.5 py-0.5 bg-black/60 text-white border-0">
                                                <FileImage className="h-2.5 w-2.5 mr-1" /> Passport Photo
                                              </Badge>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="w-full h-36 rounded-lg border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-muted-foreground">
                                            <FileImage className="h-8 w-8 mb-1 opacity-40" />
                                            <span className="text-xs">No passport image uploaded</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Biometric Status Card */}
                                      <div className="w-36 flex flex-col gap-2">
                                        <div className={`flex-1 rounded-lg border flex flex-col items-center justify-center p-3 text-center ${
                                          selected.passport.is_biometric
                                            ? 'border-primary/30 bg-primary/5'
                                            : 'border-muted bg-muted/20'
                                        }`}>
                                          <Fingerprint className={`h-7 w-7 mb-1.5 ${selected.passport.is_biometric ? 'text-primary' : 'text-muted-foreground/40'}`} />
                                          <span className="text-[11px] font-semibold leading-tight">
                                            {selected.passport.is_biometric ? 'Biometric' : 'Non-Biometric'}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground mt-0.5">passport</span>
                                        </div>
                                        <div className={`rounded-lg border flex flex-col items-center justify-center p-2.5 text-center ${
                                          selected.passport.verified
                                            ? 'border-emerald-500/30 bg-emerald-500/5'
                                            : 'border-amber-500/30 bg-amber-500/5'
                                        }`}>
                                          {selected.passport.verified
                                            ? <ShieldCheck className="h-5 w-5 mb-1 text-emerald-500" />
                                            : <ShieldX className="h-5 w-5 mb-1 text-amber-500" />}
                                          <span className={`text-[11px] font-semibold ${selected.passport.verified ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {selected.passport.verified ? 'Verified' : 'Unverified'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Expiry Banner */}
                                    {passportDaysToExpiry(selected.passport) !== null && (
                                      <div className={`mb-3 p-2 rounded text-xs font-medium flex items-center gap-1 ${
                                        passportDaysToExpiry(selected.passport)! < 0 ? 'bg-destructive/10 text-destructive' :
                                        passportDaysToExpiry(selected.passport)! <= 365 ? 'bg-gold/10 text-gold' :
                                        'bg-primary/10 text-primary'
                                      }`}>
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        {passportDaysToExpiry(selected.passport)! < 0 ? 'EXPIRED' :
                                         passportDaysToExpiry(selected.passport)! <= 365 ? `Expires in ${passportDaysToExpiry(selected.passport)} days` :
                                         'Valid'}
                                      </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                      {[
                                        { label: 'Passport Number', key: 'passport_number', type: 'text' },
                                        { label: 'Place of Issue', key: 'place_of_issue', type: 'text' },
                                        { label: 'Issue Date', key: 'issue_date', type: 'date' },
                                        { label: 'Expiry Date', key: 'expiry_date', type: 'date' },
                                      ].map(({ label, key, type }) => (
                                        <div key={key} className="space-y-1">
                                          <Label className="text-xs">{label}</Label>
                                          <Input
                                            type={type}
                                            value={(editingPassport as Record<string, string>)[key] || ''}
                                            onChange={e => setEditingPassport(p => ({ ...p, [key]: e.target.value }))}
                                            className="h-8 text-sm"
                                          />
                                        </div>
                                      ))}
                                    </div>

                                    {/* Biometric toggle */}
                                    <div className="mt-3 flex items-center gap-2">
                                      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={editingPassport.is_biometric || false}
                                          onChange={e => setEditingPassport(p => ({ ...p, is_biometric: e.target.checked }))}
                                          className="rounded"
                                        />
                                        <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
                                        Biometric Passport
                                      </label>
                                    </div>

                                    <div className="mt-2 space-y-1">
                                      <Label className="text-xs">Admin Notes</Label>
                                      <Textarea
                                        value={editingPassport.admin_notes || ''}
                                        onChange={e => setEditingPassport(p => ({ ...p, admin_notes: e.target.value }))}
                                        rows={2}
                                        className="text-sm"
                                      />
                                    </div>
                                    <div className="flex items-center gap-3 mt-3">
                                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={editingPassport.verified || false}
                                          onChange={e => setEditingPassport(p => ({ ...p, verified: e.target.checked }))}
                                          className="rounded"
                                        />
                                        Mark as Verified
                                      </label>
                                      <Button size="sm" className="gradient-primary text-primary-foreground gap-1 ml-auto" onClick={savePassportEdit}>
                                        <Edit className="h-3.5 w-3.5" /> Save Passport
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {/* Passport Image Lightbox */}
                        <Dialog open={passportImageOpen} onOpenChange={setPassportImageOpen}>
                          <DialogContent className="max-w-3xl p-2 bg-black/95 border-border/20">
                            <DialogHeader className="px-4 pt-3 pb-1">
                              <DialogTitle className="text-white text-sm flex items-center gap-2">
                                <FileImage className="h-4 w-4" />
                                Passport Image — {selected?.first_name} {selected?.last_name}
                              </DialogTitle>
                            </DialogHeader>
                            {selected?.passport?.passport_image_url && (
                              <div className="flex flex-col items-center gap-3 p-2">
                                <img
                                  src={selected.passport.passport_image_url}
                                  alt="Passport full view"
                                  className="w-full max-h-[70vh] object-contain rounded"
                                  onContextMenu={e => e.preventDefault()}
                                />
                                <div className="flex items-center gap-3">
                                  <Badge className={`gap-1 ${selected.passport.is_biometric ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                    <Fingerprint className="h-3 w-3" />
                                    {selected.passport.is_biometric ? 'Biometric' : 'Non-Biometric'}
                                  </Badge>
                                  <Badge className={`gap-1 ${selected.passport.verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                    {selected.passport.verified ? <ShieldCheck className="h-3 w-3" /> : <ShieldX className="h-3 w-3" />}
                                    {selected.passport.verified ? 'Verified' : 'Unverified'}
                                  </Badge>
                                  {selected.passport.passport_number && (
                                    <span className="text-xs text-white/60">#{selected.passport.passport_number}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                      {/* Delete button — only for expired accounts */}
                      {member.membership_status === 'expired' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          title="Delete account permanently"
                          onClick={() => setDeleteTarget(member)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
              <Button size="icon" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button size="icon" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
