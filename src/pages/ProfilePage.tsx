import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Passport, NIGERIAN_STATES, VIETNAM_CITIES, OCCUPATION_LABELS, MARITAL_STATUS_LABELS, OccupationType, MaritalStatus } from '@/lib/types';
import { User, Save, Upload, CheckCircle, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [passport, setPassport] = useState<Passport | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Change password state
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', date_of_birth: '',
    gender: '', occupation_type: '', marital_status: '', vietnam_city: '',
    vietnam_address: '', nigerian_state_of_origin: '',
    // passport fields
    passport_number: '', issue_date: '', expiry_date: '', place_of_issue: '',
  });

  useEffect(() => {
    if (profile) {
      setForm(f => ({
        ...f,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        occupation_type: profile.occupation_type || '',
        marital_status: profile.marital_status || '',
        vietnam_city: profile.vietnam_city || '',
        vietnam_address: profile.vietnam_address || '',
        nigerian_state_of_origin: profile.nigerian_state_of_origin || '',
      }));
      fetchPassport(profile.id);
    }
  }, [profile]);

  const fetchPassport = async (userId: string) => {
    const { data } = await supabase.from('passports').select('*').eq('user_id', userId).maybeSingle();
    const p = data as Passport | null;
    setPassport(p);
    if (p) {
      setForm(f => ({
        ...f,
        passport_number: p.passport_number || '',
        issue_date: p.issue_date || '',
        expiry_date: p.expiry_date || '',
        place_of_issue: p.place_of_issue || '',
      }));
    }
  };

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from('profiles').update({
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender as 'male' | 'female' | 'other',
      occupation_type: form.occupation_type as OccupationType,
      marital_status: form.marital_status as MaritalStatus,
      vietnam_city: form.vietnam_city,
      vietnam_address: form.vietnam_address,
      nigerian_state_of_origin: form.nigerian_state_of_origin,
    }).eq('id', profile.id);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    }
    setSaving(false);
  };

  const savePassport = async () => {
    if (!profile) return;
    setSaving(true);

    let passport_image_url = passport?.passport_image_url;

    if (passportFile) {
      const fd = new FormData();
      fd.append('file', passportFile);
      fd.append('userId', profile.id);
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('upload-passport-image', { body: fd });
      if (!fnErr && fnData?.url) {
        passport_image_url = fnData.url;
      } else {
        toast({ title: 'Upload failed', description: fnErr?.message || 'Could not upload image', variant: 'destructive' });
      }
    }

    const passportData = {
      user_id: profile.id,
      passport_number: form.passport_number || null,
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
      place_of_issue: form.place_of_issue || null,
      passport_image_url,
    };

    if (passport) {
      await supabase.from('passports').update(passportData).eq('id', passport.id);
    } else {
      await supabase.from('passports').insert({ ...passportData, is_biometric: false, verified: false });
    }

    await fetchPassport(profile.id);
    toast({ title: 'Passport saved', description: 'Your passport information has been updated.' });
    setSaving(false);
  };

  const changePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setPwSaving(true);
    setPwMessage(null);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
    if (error) {
      setPwMessage({ type: 'error', text: error.message });
    } else {
      setPwMessage({ type: 'success', text: 'Password updated successfully!' });
      setPwForm({ newPassword: '', confirmPassword: '' });
    }
    setPwSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pt-20 pb-12 px-4 bg-muted/20">
        <div className="container mx-auto max-w-3xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <User className="h-6 w-6 text-primary" /> Profile Settings
            </h1>
            <p className="text-muted-foreground mt-1">Manage your personal information</p>
          </div>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
              {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Personal Info */}
          <Card className="shadow-card mb-6">
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>First Name</Label>
                  <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Last Name</Label>
                  <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
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
                <div className="space-y-1">
                  <Label>State of Origin</Label>
                  <Select value={form.nigerian_state_of_origin} onValueChange={v => set('nigerian_state_of_origin', v)}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Occupation</Label>
                  <Select value={form.occupation_type} onValueChange={v => set('occupation_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(OCCUPATION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Marital Status</Label>
                  <Select value={form.marital_status} onValueChange={v => set('marital_status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MARITAL_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>City in Vietnam</Label>
                  <Select value={form.vietnam_city} onValueChange={v => set('vietnam_city', v)}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {VIETNAM_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Address in Vietnam</Label>
                  <Input value={form.vietnam_address} onChange={e => set('vietnam_address', e.target.value)} />
                </div>
              </div>
              <Button onClick={saveProfile} disabled={saving} className="gradient-primary text-primary-foreground gap-2">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>

          {/* Passport Info */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Passport Information
                {passport?.verified && <Badge className="gradient-primary text-primary-foreground text-xs">Verified</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {passport?.passport_image_url && (
                <img src={passport.passport_image_url} alt="Passport" className="h-36 rounded-lg object-cover" onContextMenu={e => e.preventDefault()} />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Passport Number</Label>
                  <Input value={form.passport_number} onChange={e => set('passport_number', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Place of Issue</Label>
                  <Input value={form.place_of_issue} onChange={e => set('place_of_issue', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Issue Date</Label>
                  <Input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Passport Photo Page</Label>
                <div
                  className="mt-1.5 border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-smooth"
                  onClick={() => document.getElementById('pp-upload')?.click()}
                >
                  {passportFile ? (
                    <p className="text-sm text-primary">{passportFile.name} selected</p>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">Click to upload / replace passport image</p>
                    </>
                  )}
                </div>
                <input id="pp-upload" type="file" accept="image/*" className="hidden" onChange={e => setPassportFile(e.target.files?.[0] || null)} />
              </div>
              <Button onClick={savePassport} disabled={saving} className="gradient-primary text-primary-foreground gap-2">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Passport Info'}
              </Button>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="shadow-card mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" /> Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pwMessage && (
                <Alert variant={pwMessage.type === 'error' ? 'destructive' : 'default'}>
                  {pwMessage.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertDescription>{pwMessage.text}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showNewPw ? 'text' : 'password'}
                      value={pwForm.newPassword}
                      onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                      placeholder="Min. 8 characters"
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Confirm Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={pwForm.confirmPassword}
                      onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      placeholder="Re-enter new password"
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <Button onClick={changePassword} disabled={pwSaving || !pwForm.newPassword} className="gradient-primary text-primary-foreground gap-2">
                <KeyRound className="h-4 w-4" /> {pwSaving ? 'Updating...' : 'Update Password'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
