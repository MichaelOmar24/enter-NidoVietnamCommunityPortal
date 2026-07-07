import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Heart, Baby, ChevronRight, ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { SpouseNationality } from '@/lib/types';

interface SpouseFamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { title: 'Spouse Details', icon: Heart, desc: 'Tell us about your spouse' },
  { title: 'Children', icon: Baby, desc: 'Children information' },
];

export function SpouseFamilyDialog({ open, onOpenChange }: SpouseFamilyDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    spouse_first_name: '',
    spouse_last_name: '',
    spouse_nationality: (profile?.spouse_nationality || '') as SpouseNationality | '',
    spouse_nationality_other: profile?.spouse_nationality_other || '',
    number_of_kids: profile?.number_of_kids ?? '' as number | '',
  });

  const set = (field: keyof typeof form, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleNext = () => {
    setError(null);
    if (step === 0 && !form.spouse_nationality) {
      setError('Please select your spouse\'s nationality');
      return;
    }
    if (step === 0 && form.spouse_nationality === 'other' && !form.spouse_nationality_other.trim()) {
      setError('Please specify your spouse\'s nationality');
      return;
    }
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { error: updateErr } = await (supabase.from('profiles') as ReturnType<typeof supabase.from>).update({
      spouse_nationality: form.spouse_nationality || null,
      spouse_nationality_other: form.spouse_nationality === 'other' ? form.spouse_nationality_other || null : null,
      number_of_kids: form.number_of_kids !== '' ? Number(form.number_of_kids) : 0,
      marital_status: 'married',
    }).eq('id', user.id);

    if (updateErr) {
      setError('Failed to save. Please try again.');
      setLoading(false);
      return;
    }

    toast({
      title: 'Family details saved!',
      description: 'Your spouse and family information has been updated.',
    });

    setLoading(false);
    onOpenChange(false);
    setStep(0);
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep(0);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Heart className="h-5 w-5 text-red-500" />
            Spouse &amp; Family Registration
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="flex items-center gap-2 mb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  i < step ? 'bg-primary text-primary-foreground' :
                  i === step ? 'gradient-gold text-gold-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {i < step ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-medium text-foreground">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded ${i < step ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1 — Spouse Details */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Spouse First Name</Label>
                  <Input
                    value={form.spouse_first_name}
                    onChange={e => set('spouse_first_name', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Spouse Last Name</Label>
                  <Input
                    value={form.spouse_last_name}
                    onChange={e => set('spouse_last_name', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Spouse Nationality *</Label>
                <Select value={form.spouse_nationality} onValueChange={v => set('spouse_nationality', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nigerian">Nigerian</SelectItem>
                    <SelectItem value="vietnamese">Vietnamese</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.spouse_nationality === 'other' && (
                <div className="space-y-1.5">
                  <Label>Specify Nationality *</Label>
                  <Input
                    value={form.spouse_nationality_other}
                    onChange={e => set('spouse_nationality_other', e.target.value)}
                    placeholder="e.g. Ghanaian, Chinese, Indian..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Children */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Children Information</p>
                <p>Enter the total number of children in your household.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Number of Children</Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={form.number_of_kids === '' ? '' : String(form.number_of_kids)}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    number_of_kids: e.target.value === '' ? '' : Number(e.target.value),
                  }))}
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(0)} className="flex-1 gap-2">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step === 0 ? (
            <Button onClick={handleNext} className="flex-1 gradient-primary text-primary-foreground gap-2">
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 gradient-primary text-primary-foreground">
              {loading ? 'Saving...' : 'Save Family Details'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
