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
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
            <h1 className="text-2xl font-bold text-primary-foreground">Welcome Back</h1>
            <p className="text-primary-foreground/65 mt-1.5">Sign in to your NIDO Vietnam account</p>
          </div>

          <Card className="shadow-green border-primary/20 glass">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <LogIn className="h-4 w-4 text-primary-foreground" />
                </div>
                Member Login
              </CardTitle>
              <CardDescription>Enter your registered email and password</CardDescription>
            </CardHeader>
            <CardContent>
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
                  <Label htmlFor="password">Password</Label>
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
