import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, LogOut, User, LayoutDashboard, Shield, ShieldCheck, HeartHandshake, Heart, Banknote, Megaphone, AlertTriangle, Stamp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { SpouseFamilyDialog } from '@/components/SpouseFamilyDialog';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About NIDO', href: '/about' },
  { label: 'Directory', href: '/directory' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Activities', href: '/activities' },
  { label: 'Hall of Honor', href: '/recognitions' },
  { label: 'Donations', href: '/donations' },
  { label: 'Passport Info', href: '/passport-info' },
  { label: 'Documents', href: '/constitution' },
  { label: 'Contact', href: '/contact' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [spouseDialogOpen, setSpouseDialogOpen] = useState(false);
  const { user, profile, isAdmin, isSuperAdmin, isEmbassyStaff, isTreasurer, isMediaDirector, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Role dashboard links shown in the user menu (desktop dropdown and mobile menu)
  const hasFullAdmin = isAdmin || isSuperAdmin;
  const roleLinks = [
    ...(hasFullAdmin ? [{ label: 'Admin Panel', href: '/admin', Icon: Shield }] : []),
    ...(isTreasurer && !hasFullAdmin ? [{ label: 'Treasurer Portal', href: '/admin', Icon: Banknote }] : []),
    ...(isMediaDirector && !hasFullAdmin ? [{ label: 'Media Director Portal', href: '/admin', Icon: Megaphone }] : []),
    ...(isEmbassyStaff ? [{ label: 'Embassy Portal', href: '/embassy', Icon: ShieldCheck }] : []),
  ];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-smooth",
      scrolled
        ? "bg-card/98 backdrop-blur-md border-b border-border shadow-card"
        : "bg-card/90 backdrop-blur-sm border-b border-border/40"
    )}>
      {/* Top banner */}
      <div className="gradient-primary py-1.5 px-4 text-center text-primary-foreground text-xs font-medium tracking-wide">
        <span>NIDO Vietnam — Nigerians in Diaspora Organization Vietnam &nbsp;·&nbsp; Hotline: +84326189705 &nbsp;·&nbsp; info@nidovietnam.com</span>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png"
              alt="NIDO Vietnam"
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "relative px-3.5 py-2 rounded-lg text-sm font-medium transition-smooth",
                  location.pathname === link.href
                    ? "text-primary bg-primary/10"
                    : "text-foreground/65 hover:text-primary hover:bg-primary/8"
                )}
              >
                {link.label}
                {location.pathname === link.href && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 gradient-primary rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* Auth Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    <User className="h-4 w-4" />
                    <span className="max-w-24 truncate">{profile?.first_name || 'Member'}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="h-4 w-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/welfare')}>
                    <HeartHandshake className="h-4 w-4 mr-2" />
                    Welfare Support
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/recommendation')}>
                    <Stamp className="h-4 w-4 mr-2" />
                    Recommendation Letter
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSpouseDialogOpen(true)}>
                    <Heart className="h-4 w-4 mr-2 text-red-500" />
                    Spouse &amp; Family
                  </DropdownMenuItem>
                  {roleLinks.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {roleLinks.map(({ label, href, Icon }) => (
                        <DropdownMenuItem key={label} onClick={() => navigate(href)}>
                          <Icon className="h-4 w-4 mr-2" />
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" className="text-primary" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button className="gradient-primary text-primary-foreground shadow-green" onClick={() => navigate('/register')}>
                  Join NIDO
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 rounded-md text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-card border-t border-border shadow-card animate-fade-in-up max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {user ? (
              <>
                {/* Functional menus first for logged-in users */}
                <div>
                  <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">My Account</p>
                  {[
                    { label: 'Dashboard', Icon: LayoutDashboard, action: () => { navigate('/dashboard'); setMobileOpen(false); } },
                    { label: 'My Profile', Icon: User, action: () => { navigate('/profile'); setMobileOpen(false); } },
                    { label: 'Welfare Support', Icon: HeartHandshake, action: () => { navigate('/welfare'); setMobileOpen(false); } },
                    { label: 'Recommendation Letter', Icon: Stamp, action: () => { navigate('/recommendation'); setMobileOpen(false); } },
                    { label: 'Spouse & Family', Icon: Heart, action: () => { setSpouseDialogOpen(true); setMobileOpen(false); } },
                    { label: 'Report a Case / Dispute', Icon: AlertTriangle, action: () => { navigate('/report-case'); setMobileOpen(false); } },
                  ].map(({ label, Icon, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-foreground/80 hover:text-primary hover:bg-primary/10 transition-smooth"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {roleLinks.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your Role</p>
                    {roleLinks.map(({ label, href, Icon }) => (
                      <button
                        key={label}
                        onClick={() => { navigate(href); setMobileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-smooth"
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Public site links secondary when logged in */}
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Website</p>
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "block px-4 py-2.5 rounded-md text-sm font-medium transition-smooth",
                        location.pathname === link.href
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/60 hover:text-primary hover:bg-primary/10"
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="mt-2 pt-2 border-t border-border">
                  <Button variant="outline" className="w-full text-destructive border-destructive/50 hover:bg-destructive/10" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "px-4 py-3 rounded-md text-sm font-medium transition-smooth",
                      location.pathname === link.href
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/70 hover:text-primary hover:bg-primary/10"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                  <Button variant="outline" className="flex-1" onClick={() => { navigate('/login'); setMobileOpen(false); }}>
                    Sign In
                  </Button>
                  <Button className="flex-1 gradient-primary text-primary-foreground" onClick={() => { navigate('/register'); setMobileOpen(false); }}>
                    Join NIDO
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <SpouseFamilyDialog open={spouseDialogOpen} onOpenChange={setSpouseDialogOpen} />
    </nav>
  );
}
