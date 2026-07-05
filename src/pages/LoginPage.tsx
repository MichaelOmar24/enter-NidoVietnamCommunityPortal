import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { trackEvent } from '@enter-pro/analytics-sdk';
import { AlertCircle, Eye, EyeOff, LogIn, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type View = 'login' | 'forgot' | 'forgot-sent';

export function LoginPage() {
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err.message || 'Invalid email or password');
    } else {
      trackEvent('member_login', { eventType: 'custom' });
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) {
      setError(err.message);
    } else {
      setView('forgot-sent');
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
            <h1 className="text-2xl font-bold text-primary-foreground">
              {view === 'login' ? 'Welcome Back' : view === 'forgot' ? 'Reset Password' : 'Check Your Email'}
            </h1>
            <p className="text-primary-foreground/65 mt-1.5">
              {view === 'login' ? 'Sign in to your NIDO Vietnam account' :
               view === 'forgot' ? 'Enter your email to receive a reset link' :
               'A password reset link has been sent'}
            </p>
          </div>

          <Card className="shadow-green border-primary/20 glass">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  {view === 'login' ? <LogIn className="h-4 w-4 text-primary-foreground" /> :
                   view === 'forgot' ? <Mail className="h-4 w-4 text-primary-foreground" /> :
                   <CheckCircle className="h-4 w-4 text-primary-foreground" />}
                </div>
                {view === 'login' ? 'Member Login' : view === 'forgot' ? 'Forgot Password' : 'Email Sent'}
              </CardTitle>
              <CardDescription>
                {view === 'login' ? 'Enter your registered email and password' :
                 view === 'forgot' ? 'We will send a secure reset link to your email' :
                 `We sent a link to ${resetEmail}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* LOGIN FORM */}
              {view === 'login' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={() => { setResetEmail(email); setView('forgot'); setError(null); }}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="h-11 pr-10"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full gradient-primary text-primary-foreground shadow-green h-11 font-semibold" disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              )}

              {/* FORGOT PASSWORD FORM */}
              {view === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email Address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="h-11"
                    />
                  </div>
                  <Button type="submit" className="w-full gradient-primary text-primary-foreground shadow-green h-11 font-semibold" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setView('login'); setError(null); }}
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
                  </button>
                </form>
              )}

              {/* EMAIL SENT CONFIRMATION */}
              {view === 'forgot-sent' && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-5 text-center">
                    <CheckCircle className="h-10 w-10 text-primary mx-auto mb-3" />
                    <p className="text-sm text-foreground font-medium">Reset link sent!</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Check your inbox at <strong>{resetEmail}</strong> and click the link to set a new password. The link expires in 1 hour.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setView('login'); setError(null); }}
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
                  </button>
                </div>
              )}

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Not a member yet?{' '}
                <Link to="/register" className="text-primary font-semibold hover:underline">
                  Join NIDO Vietnam
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
