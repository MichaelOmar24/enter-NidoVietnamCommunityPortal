import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Image, FileText, LogOut,
  ChevronLeft, ChevronRight, Activity, Shield, ShieldCheck, HeartHandshake, Heart, CreditCard, Banknote, Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Navbar } from './Navbar';
import { supabase } from '@/integrations/supabase/client';

const adminLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Members', href: '/admin/members' },
  { icon: CreditCard, label: 'Memberships', href: '/admin/memberships' },
  { icon: Banknote, label: 'Treasury', href: '/admin/treasury' },
  { icon: Building2, label: 'Companies', href: '/admin/companies' },
  { icon: Image, label: 'Gallery', href: '/admin/gallery' },
  { icon: FileText, label: 'Documents', href: '/admin/documents' },
  { icon: Activity, label: 'Activities', href: '/admin/activities' },
  { icon: HeartHandshake, label: 'Welfare', href: '/admin/welfare' },
  { icon: Heart, label: 'Memorial', href: '/admin/deceased' },
  { icon: Inbox, label: 'Messages', href: '/admin/messages' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Load unread message count
    supabase
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'unread')
      .then(({ count }) => setUnreadCount(count || 0));
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1 pt-[60px]">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed top-[60px] left-0 h-[calc(100vh-60px)] bg-sidebar flex flex-col transition-all duration-300 z-40",
            collapsed ? "w-16" : "w-56"
          )}
        >
          {/* Admin Badge */}
          {!collapsed && (
            <div className="p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-gold" />
                <div>
                  <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Nav Items */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {adminLinks.map(({ icon: Icon, label, href }) => (
              <Link
                key={href}
                to={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-smooth",
                  location.pathname === href
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="flex-1">{label}</span>
                )}
                {!collapsed && label === 'Messages' && unreadCount > 0 && (
                  <span className="ml-auto text-[10px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center font-bold shrink-0">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {collapsed && label === 'Messages' && unreadCount > 0 && (
                  <span className="absolute left-8 top-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </Link>
            ))}
            {/* Embassy Portal Link for Super Admins */}
            {isSuperAdmin && (
              <Link
                to="/embassy"
                title={collapsed ? 'Embassy Portal' : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-smooth mt-2',
                  'text-yellow-400/80 hover:bg-yellow-500/10 hover:text-yellow-400'
                )}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Embassy Portal</span>}
              </Link>
            )}
          </nav>

          {/* Bottom actions */}
          <div className="p-2 border-t border-sidebar-border space-y-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm w-full text-sidebar-foreground/60 hover:bg-sidebar-accent transition-smooth"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {!collapsed && <span>Collapse</span>}
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm w-full text-destructive hover:bg-destructive/10 transition-smooth"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={cn("flex-1 transition-all duration-300", collapsed ? "ml-16" : "ml-56")}>
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-muted-foreground text-sm mt-1">NIDO Vietnam Admin Panel</p>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
