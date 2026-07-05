import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase automatically exchanges the recovery token from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true);
      }
    });
    // Also check if already in a session (token already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
    } else {
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-24 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 hero-pattern pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="w-full max-w-md relative">
          <div className="text-center mb-8">
            <div className="relative inline-block mb-5">
              <div className="absolute inset-0 rounded-full bg-gold/20 blur-xl scale-150" />
              <img src="https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png" alt="NIDO Vietnam" className="relative h-16 w-auto animate-float" />
            </div>
            <h1 className="text-2xl font-bold text-primary-foreground">Set New Password</h1>
            <p className="text-primary-foreground/65 mt-1.5">Choose a strong password for your account</p>
          </div>

          <Card className="shadow-green border-primary/20 glass">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-primary-foreground" />
                </div>
                {done ? 'Password Updated' : 'New Password'}
              </CardTitle>
              <CardDescription>
                {done ? 'Redirecting to your dashboard...' : 'Enter your new password below'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {done ? (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-5 text-center">
                  <CheckCircle className="h-10 w-10 text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">Password changed successfully!</p>
                  <p className="text-xs text-muted-foreground mt-1.5">You will be redirected to your dashboard shortly.</p>
                </div>
              ) : !validSession ? (
                <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-5 text-center">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">Invalid or expired link</p>
                  <p className="text-xs text-muted-foreground mt-1.5">Please request a new password reset from the login page.</p>
                  <Button onClick={() => navigate('/login')} className="mt-4 gradient-primary text-primary-foreground">
                    Back to Login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        required
                        className="h-11 pr-10"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="Re-enter your new password"
                        required
                        className="h-11 pr-10"
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full gradient-primary text-primary-foreground shadow-green h-11 font-semibold" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
