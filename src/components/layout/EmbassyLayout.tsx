import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileSearch, Activity, LogOut,
  ChevronLeft, ChevronRight, ShieldCheck, BarChart3, ScrollText,
  HeartHandshake, ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const embassyLinks = [
  { icon: LayoutDashboard, label: 'Overview', href: '/embassy' },
  { icon: Users, label: 'Member Intelligence', href: '/embassy/members' },
  { icon: BarChart3, label: 'Passport Analytics', href: '/embassy/passports' },
  { icon: FileSearch, label: 'Query Explorer', href: '/embassy/query' },
  { icon: ScrollText, label: 'Activity Feed', href: '/embassy/activity' },
  { icon: HeartHandshake, label: 'Welfare & Memorial', href: '/embassy/welfare' },
];

interface EmbassyLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function EmbassyLayout({ children, title, subtitle }: EmbassyLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, signOut, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen flex embassy-bg">
      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full flex flex-col transition-all duration-300 z-40 border-r border-embassy-border',
        'embassy-sidebar',
        collapsed ? 'w-16' : 'w-60'
      )}>
        {/* Logo area */}
        <div className={cn('p-4 border-b border-embassy-border', collapsed && 'flex justify-center')}>
          {collapsed ? (
            <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-gold" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-xs font-bold text-gold tracking-widest uppercase">Embassy</p>
                <p className="text-[10px] text-embassy-muted leading-tight">Intelligence Portal</p>
              </div>
            </div>
          )}
        </div>

        {/* Staff badge */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-embassy-border">
            <div className="rounded-lg bg-embassy-card border border-embassy-border p-2.5">
              <p className="text-[10px] text-embassy-muted uppercase tracking-wider">Logged in as</p>
              <p className="text-sm font-semibold text-embassy-foreground truncate mt-0.5">
                {profile?.first_name} {profile?.last_name}
              </p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-gold/15 border border-gold/30 text-gold text-[10px] font-semibold">
                <ShieldCheck className="h-2.5 w-2.5" /> Embassy Staff
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {embassyLinks.map(({ icon: Icon, label, href }) => (
            <Link
              key={href}
              to={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                location.pathname === href
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'text-embassy-muted hover:text-embassy-foreground hover:bg-embassy-card',
                collapsed && 'justify-center'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t border-embassy-border space-y-0.5">
          {/* Back to Admin for admins */}
          {(isAdmin || isSuperAdmin) && (
            <button
              onClick={() => navigate('/admin')}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-gold/80 hover:bg-gold/10 hover:text-gold transition-all',
                collapsed && 'justify-center'
              )}
              title={collapsed ? 'Back to Admin' : undefined}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Back to Admin</span>}
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-embassy-muted hover:bg-embassy-card transition-all',
              collapsed && 'justify-center'
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>}
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/'); }}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-red-400 hover:bg-red-500/10 transition-all',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={cn('flex-1 min-h-screen transition-all duration-300', collapsed ? 'ml-16' : 'ml-60')}>
        {/* Top header */}
        <div className="sticky top-0 z-30 border-b border-embassy-border bg-embassy-header px-6 py-3 flex items-center justify-between backdrop-blur">
          <div>
            <h1 className="text-lg font-bold text-embassy-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-embassy-muted mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Live Data</span>
            </div>
            <span className="text-xs text-embassy-muted">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
