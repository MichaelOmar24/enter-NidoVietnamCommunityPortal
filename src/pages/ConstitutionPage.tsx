import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  BookOpen, Lock, Award, FileText, Megaphone, RotateCcw,
  ExternalLink, Download, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Doc {
  id: string;
  title: string;
  description?: string;
  document_url?: string;
  document_type: string;
  is_active: boolean;
}

const TABS = [
  { key: 'all', label: 'All Documents', icon: FileText },
  { key: 'constitution', label: 'Constitution', icon: BookOpen },
  { key: 'certificate', label: 'Certificates', icon: Award },
  { key: 'circular', label: 'Circulars', icon: RotateCcw },
  { key: 'announcement', label: 'Announcements', icon: Megaphone },
];

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  constitution: { color: '#00b359', bg: 'rgba(0,179,89,0.12)', label: 'Constitution', icon: BookOpen },
  certificate: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: 'Certificate', icon: Award },
  circular: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Circular', icon: RotateCcw },
  announcement: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Announcement', icon: Megaphone },
};

export function ConstitutionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [viewerDoc, setViewerDoc] = useState<Doc | null>(null);

  useEffect(() => {
    supabase.from('documents').select('*').eq('is_active', true).order('created_at', { ascending: false })
      .then(({ data }) => {
        setDocs((data || []) as Doc[]);
        // Auto-open the first constitution if one exists
        const firstConstitution = (data || []).find((d: Doc) => d.document_type === 'constitution' && d.document_url);
        if (firstConstitution) {
          setViewerDoc(firstConstitution as Doc);
          setActiveTab('constitution');
        }
      });
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center gradient-hero px-4 pt-20">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-5">
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Members Only</h2>
            <p className="text-muted-foreground mb-6">You must be a registered NIDO Vietnam member to access our documents library.</p>
            <Button className="gradient-primary text-primary-foreground gap-2 w-full mb-3" onClick={() => navigate('/register')}>
              Join NIDO Vietnam
            </Button>
            <Button variant="outline" className="w-full text-primary border-primary hover:bg-primary/10" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const filtered = activeTab === 'all' ? docs : docs.filter(d => d.document_type === activeTab);
  const constitutionDoc = docs.find(d => d.document_type === 'constitution' && d.document_url);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pt-[104px] pb-16">
        {/* Hero */}
        <div className="gradient-hero py-10 px-4 mb-8">
          <div className="container mx-auto">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gold/20 border border-gold/30 flex items-center justify-center">
                <FileText className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground">Documents Library</h1>
                <p className="text-primary-foreground/70 text-sm mt-0.5">Official NIDO Vietnam documents — members only</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {TABS.map(tab => {
              const count = tab.key === 'all' ? docs.length : docs.filter(d => d.document_type === tab.key).length;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); if (tab.key !== 'constitution') setViewerDoc(null); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all whitespace-nowrap shrink-0 ${activeTab === tab.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : 'bg-muted'}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Constitution tab — PDF viewer layout */}
          {activeTab === 'constitution' && constitutionDoc && (
            <div className="space-y-4">
              {/* Viewer notice */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gold/5 border border-gold/20 rounded-lg px-4 py-2.5">
                <Lock className="h-3.5 w-3.5 text-gold shrink-0" />
                <span>This document is for viewing purposes only. Downloading is not permitted.</span>
              </div>
              {/* PDF embed */}
              <div className="rounded-xl overflow-hidden shadow-green border border-border bg-muted/20">
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(constitutionDoc.document_url!)}&embedded=true`}
                  title={constitutionDoc.title}
                  className="w-full"
                  style={{ height: 'calc(100vh - 320px)', minHeight: '600px' }}
                  sandbox="allow-scripts allow-same-origin"
                  onContextMenu={e => e.preventDefault()}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                © NIDO Vietnam. This document is confidential and for registered members only.
              </p>
            </div>
          )}

          {/* Certificates — gallery card layout */}
          {activeTab === 'certificate' && (
            <div>
              {filtered.length === 0 ? (
                <EmptyState icon={Award} message="No certificates available yet." />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map(doc => <CertificateCard key={doc.id} doc={doc} />)}
                </div>
              )}
            </div>
          )}

          {/* All / Circulars / Announcements — list layout */}
          {(activeTab === 'all' || activeTab === 'circular' || activeTab === 'announcement') && (
            <div>
              {filtered.length === 0 ? (
                <EmptyState icon={FileText} message="No documents in this category yet." />
              ) : (
                <div className="space-y-3">
                  {filtered.map(doc => <DocumentRow key={doc.id} doc={doc} onView={() => setViewerDoc(doc)} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full-screen viewer modal for non-constitution docs */}
      {viewerDoc && viewerDoc.document_type !== 'constitution' && viewerDoc.document_url && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 bg-card border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              {(() => { const cfg = TYPE_CONFIG[viewerDoc.document_type]; const Icon = cfg?.icon || FileText; return <Icon className="h-5 w-5" style={{ color: cfg?.color }} />; })()}
              <p className="font-semibold text-foreground text-sm">{viewerDoc.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={viewerDoc.document_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </Button>
              </a>
              <Button size="sm" variant="ghost" onClick={() => setViewerDoc(null)}>Close</Button>
            </div>
          </div>
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewerDoc.document_url)}&embedded=true`}
            title={viewerDoc.title}
            className="flex-1 w-full"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}

      <Footer />
    </div>
  );
}

function CertificateCard({ doc }: { doc: Doc }) {
  const cfg = TYPE_CONFIG.certificate;
  const isImage = doc.document_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.document_url);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden hover:border-purple-500/40 hover:shadow-card transition-all group">
      {/* Certificate preview area */}
      <div className="relative bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 h-48 flex items-center justify-center border-b border-border">
        {isImage && doc.document_url ? (
          <img src={doc.document_url} alt={doc.title} className="h-full w-full object-contain p-4" crossOrigin="anonymous" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
              <Award className="h-8 w-8" style={{ color: cfg.color }} />
            </div>
            {!doc.document_url && (
              <span className="text-xs text-muted-foreground">Document coming soon</span>
            )}
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge className="text-[11px] bg-purple-500/20 text-purple-600 border border-purple-500/30">Certificate</Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="font-semibold text-foreground text-sm mb-1">{doc.title}</p>
        {doc.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{doc.description}</p>}
        {doc.document_url && (
          <div className="flex gap-2">
            <a href={doc.document_url} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="sm" className="w-full gap-1.5 text-xs gradient-primary text-primary-foreground">
                <Eye className="h-3.5 w-3.5" /> View Certificate
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentRow({ doc, onView }: { doc: Doc; onView: () => void }) {
  const cfg = TYPE_CONFIG[doc.document_type] || TYPE_CONFIG.circular;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all group">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
        <Icon className="h-5 w-5" style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="font-semibold text-sm text-foreground">{doc.title}</p>
          <Badge className="text-[10px] border" style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color + '40' }}>
            {cfg.label}
          </Badge>
        </div>
        {doc.description && <p className="text-xs text-muted-foreground truncate">{doc.description}</p>}
      </div>
      {doc.document_url && (
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 text-primary border-primary hover:bg-primary/10" onClick={onView}>
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
          <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
