import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Profile, OCCUPATION_LABELS, MARITAL_STATUS_LABELS, NIGERIAN_STATES, VIETNAM_CITIES,
  RELIGION_LABELS, QUALIFICATION_LABELS, PURPOSE_OF_VISIT_LABELS,
  OccupationType, MaritalStatus, Gender, ReligionType, QualificationType, PurposeOfVisitType, SpouseNationality,
} from '@/lib/types';
import { Save, X, Heart } from 'lucide-react';

interface MemberProfileEditorProps {
  member: Profile;
  onSaved: (updated: Partial<Profile>) => void;
  onCancel: () => void;
}

export function MemberProfileEditor({ member, onSaved, onCancel }: MemberProfileEditorProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: member.first_name || '',
    last_name: member.last_name || '',
    phone: member.phone || '',
    date_of_birth: member.date_of_birth || '',
    gender: (member.gender || '') as Gender | '',
    occupation_type: (member.occupation_type || '') as OccupationType | '',
    occupation_institution_name: member.occupation_institution_name || '',
    occupation_institution_address: member.occupation_institution_address || '',
    occupation_country_state: member.occupation_country_state || '',
    marital_status: (member.marital_status || '') as MaritalStatus | '',
    vietnam_city: member.vietnam_city || '',
    vietnam_address: member.vietnam_address || '',
    nigerian_state_of_origin: member.nigerian_state_of_origin || '',
    lga_of_origin: (member as Profile & { lga_of_origin?: string }).lga_of_origin || '',
    next_of_kin_name: member.next_of_kin_name || '',
    next_of_kin_relationship: member.next_of_kin_relationship || '',
    next_of_kin_phone: member.next_of_kin_phone || '',
    next_of_kin_address: member.next_of_kin_address || '',
    religion: (member.religion || '') as ReligionType | '',
    highest_qualification: (member.highest_qualification || '') as QualificationType | '',
    purpose_of_visit: (member.purpose_of_visit || '') as PurposeOfVisitType | '',
    spouse_first_name: member.spouse_first_name || '',
    spouse_last_name: member.spouse_last_name || '',
    spouse_nationality: (member.spouse_nationality || '') as SpouseNationality | '',
    spouse_nationality_other: member.spouse_nationality_other || '',
    number_of_kids: (member.number_of_kids ?? '') as number | '',
  });

  useEffect(() => {
    setForm({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      phone: member.phone || '',
      date_of_birth: member.date_of_birth || '',
      gender: (member.gender || '') as Gender | '',
      occupation_type: (member.occupation_type || '') as OccupationType | '',
      occupation_institution_name: member.occupation_institution_name || '',
      occupation_institution_address: member.occupation_institution_address || '',
      occupation_country_state: member.occupation_country_state || '',
      marital_status: (member.marital_status || '') as MaritalStatus | '',
      vietnam_city: member.vietnam_city || '',
      vietnam_address: member.vietnam_address || '',
      nigerian_state_of_origin: member.nigerian_state_of_origin || '',
      lga_of_origin: (member as Profile & { lga_of_origin?: string }).lga_of_origin || '',
      next_of_kin_name: member.next_of_kin_name || '',
      next_of_kin_relationship: member.next_of_kin_relationship || '',
      next_of_kin_phone: member.next_of_kin_phone || '',
      next_of_kin_address: member.next_of_kin_address || '',
      religion: (member.religion || '') as ReligionType | '',
      highest_qualification: (member.highest_qualification || '') as QualificationType | '',
      purpose_of_visit: (member.purpose_of_visit || '') as PurposeOfVisitType | '',
      spouse_first_name: member.spouse_first_name || '',
      spouse_last_name: member.spouse_last_name || '',
      spouse_nationality: (member.spouse_nationality || '') as SpouseNationality | '',
      spouse_nationality_other: member.spouse_nationality_other || '',
      number_of_kids: (member.number_of_kids ?? '') as number | '',
    });
  }, [member]);

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      occupation_type: form.occupation_type || null,
      occupation_institution_name: form.occupation_institution_name || null,
      occupation_institution_address: form.occupation_institution_address || null,
      occupation_country_state: form.occupation_country_state || null,
      marital_status: form.marital_status || null,
      vietnam_city: form.vietnam_city || null,
      vietnam_address: form.vietnam_address || null,
      nigerian_state_of_origin: form.nigerian_state_of_origin || null,
      lga_of_origin: form.lga_of_origin || null,
      next_of_kin_name: form.next_of_kin_name || null,
      next_of_kin_relationship: form.next_of_kin_relationship || null,
      next_of_kin_phone: form.next_of_kin_phone || null,
      next_of_kin_address: form.next_of_kin_address || null,
      religion: form.religion || null,
      highest_qualification: form.highest_qualification || null,
      purpose_of_visit: form.purpose_of_visit || null,
      ...(form.marital_status === 'married' ? {
        spouse_first_name: form.spouse_first_name || null,
        spouse_last_name: form.spouse_last_name || null,
        spouse_nationality: form.spouse_nationality || null,
        spouse_nationality_other: form.spouse_nationality === 'other' ? form.spouse_nationality_other || null : null,
        number_of_kids: form.number_of_kids !== '' ? Number(form.number_of_kids) : 0,
      } : {}),
    };

    const { error } = await supabase.from('profiles').update(payload).eq('id', member.id);
    setSaving(false);

    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Profile updated', description: `${form.first_name} ${form.last_name}'s record has been saved.` });
    onSaved(payload as Partial<Profile>);
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>First Name</Label>
          <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Last Name</Label>
          <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
        </div>
      </div>

      {/* Phone & DOB */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Phone Number</Label>
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+84..." />
        </div>
        <div className="space-y-1.5">
          <Label>Date of Birth</Label>
          <Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
        </div>
      </div>

      {/* Gender & Marital */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v as Gender }))}>
            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Marital Status</Label>
          <Select value={form.marital_status} onValueChange={v => setForm(f => ({ ...f, marital_status: v as MaritalStatus }))}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              {Object.entries(MARITAL_STATUS_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Occupation */}
      <div className="space-y-1.5">
        <Label>Occupation</Label>
        <Select value={form.occupation_type} onValueChange={v => setForm(f => ({ ...f, occupation_type: v as OccupationType }))}>
          <SelectTrigger><SelectValue placeholder="Select occupation" /></SelectTrigger>
          <SelectContent>
            {Object.entries(OCCUPATION_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(['student', 'business', 'employee', 'teacher'] as OccupationType[]).includes(form.occupation_type as OccupationType) && (
        <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-3">
          <p className="text-xs font-semibold text-foreground">Institution / Business Details</p>
          <div className="space-y-1.5">
            <Label>Institution / Business Name</Label>
            <Input value={form.occupation_institution_name} onChange={e => setForm(f => ({ ...f, occupation_institution_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Institution / Business Address</Label>
            <Input value={form.occupation_institution_address} onChange={e => setForm(f => ({ ...f, occupation_institution_address: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Country / State</Label>
            <Input value={form.occupation_country_state} onChange={e => setForm(f => ({ ...f, occupation_country_state: e.target.value }))} />
          </div>
        </div>
      )}

      {/* Vietnam City & Address */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Vietnam City</Label>
          <Select value={form.vietnam_city} onValueChange={v => setForm(f => ({ ...f, vietnam_city: v }))}>
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
          <Input value={form.vietnam_address} onChange={e => setForm(f => ({ ...f, vietnam_address: e.target.value }))} />
        </div>
      </div>

      {/* State & LGA of Origin */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>State of Origin</Label>
          <Select value={form.nigerian_state_of_origin} onValueChange={v => setForm(f => ({ ...f, nigerian_state_of_origin: v }))}>
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
          <Input value={form.lga_of_origin} onChange={e => setForm(f => ({ ...f, lga_of_origin: e.target.value }))} placeholder="Local Government Area" />
        </div>
      </div>

      {/* Religion & Qualification */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Religion</Label>
          <Select value={form.religion} onValueChange={v => setForm(f => ({ ...f, religion: v as ReligionType }))}>
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
          <Select value={form.highest_qualification} onValueChange={v => setForm(f => ({ ...f, highest_qualification: v as QualificationType }))}>
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
        <Select value={form.purpose_of_visit} onValueChange={v => setForm(f => ({ ...f, purpose_of_visit: v as PurposeOfVisitType }))}>
          <SelectTrigger><SelectValue placeholder="Select purpose of visit" /></SelectTrigger>
          <SelectContent>
            {Object.entries(PURPOSE_OF_VISIT_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Spouse & Family */}
      {form.marital_status === 'married' && (
        <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-3">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-red-500" /> Spouse &amp; Family Information
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Spouse First Name</Label>
              <Input value={form.spouse_first_name} onChange={e => setForm(f => ({ ...f, spouse_first_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Spouse Last Name</Label>
              <Input value={form.spouse_last_name} onChange={e => setForm(f => ({ ...f, spouse_last_name: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Spouse Nationality</Label>
              <Select value={form.spouse_nationality} onValueChange={v => setForm(f => ({ ...f, spouse_nationality: v as SpouseNationality }))}>
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
                value={form.number_of_kids === '' ? '' : String(form.number_of_kids)}
                onChange={e => setForm(f => ({ ...f, number_of_kids: e.target.value === '' ? '' : Number(e.target.value) }))}
              />
            </div>
          </div>
          {form.spouse_nationality === 'other' && (
            <div className="space-y-1.5">
              <Label>Spouse's Nationality (specify)</Label>
              <Input value={form.spouse_nationality_other} onChange={e => setForm(f => ({ ...f, spouse_nationality_other: e.target.value }))} />
            </div>
          )}
        </div>
      )}

      {/* Next of Kin */}
      <div className="border-t border-border pt-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Next of Kin Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={form.next_of_kin_name} onChange={e => setForm(f => ({ ...f, next_of_kin_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Relationship</Label>
            <Input value={form.next_of_kin_relationship} onChange={e => setForm(f => ({ ...f, next_of_kin_relationship: e.target.value }))} placeholder="e.g. Spouse, Parent" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input value={form.next_of_kin_phone} onChange={e => setForm(f => ({ ...f, next_of_kin_phone: e.target.value }))} placeholder="+234..." />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.next_of_kin_address} onChange={e => setForm(f => ({ ...f, next_of_kin_address: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <Button className="flex-1 gap-2 gradient-primary text-primary-foreground" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4" /> Cancel
        </Button>
      </div>
    </div>
  );
}
