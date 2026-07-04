import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Lock, Download, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ConstitutionPage() {
  const { user } = useAuth();
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('documents')
        .select('document_url')
        .eq('document_type', 'constitution')
        .eq('is_active', true)
        .maybeSingle();
      if (data?.document_url) setDocUrl(data.document_url);
    };
    fetch();
  }, []);

  const viewerUrl = docUrl
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(docUrl)}&embedded=true`
    : null;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center gradient-hero px-4">
          <Card className="w-full max-w-md text-center p-8 shadow-green">
            <Lock className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Members Only</h2>
            <p className="text-muted-foreground mb-6">You must be a registered NIDO Vietnam member to view the constitution.</p>
            <Button className="gradient-primary text-primary-foreground gap-2 w-full" onClick={() => navigate('/register')}>
              Join NIDO Vietnam
            </Button>
            <Button variant="outline" className="w-full mt-3 text-primary border-primary hover:bg-primary/10" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-20 flex-1">
        {/* Header */}
        <div className="gradient-hero py-10 px-4">
          <div className="container mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <BookOpen className="h-10 w-10 text-gold" />
                <div>
                  <h1 className="text-2xl font-bold text-primary-foreground">NIDO Vietnam Constitution</h1>
                  <p className="text-primary-foreground/70 text-sm">Amended Constitution — Official Document</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="gradient-gold text-gold-foreground border-0">Members Only</Badge>
                <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground/70 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> View Only
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Notice bar */}
        <div className="bg-gold/10 border-b border-gold/30 py-3 px-4">
          <div className="container mx-auto flex items-center gap-2 text-sm text-foreground/80">
            <Download className="h-4 w-4 text-gold" />
            <span>This document is for viewing purposes only. Downloading is not permitted.</span>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="container mx-auto px-4 py-6">
          {viewerUrl ? (
            <div className="rounded-xl overflow-hidden shadow-green border border-border bg-muted/20">
              <iframe
                src={viewerUrl}
                title="NIDO Vietnam Constitution"
                className="w-full"
                style={{ height: 'calc(100vh - 250px)', minHeight: '600px' }}
                sandbox="allow-scripts allow-same-origin"
                onContextMenu={e => e.preventDefault()}
              />
            </div>
          ) : (
            <Card className="shadow-card text-center py-16">
              <CardContent>
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Loading constitution document...</p>
                {docUrl && (
                  <a href={docUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="mt-4 gap-2 text-primary border-primary hover:bg-primary/10">
                      <ExternalLink className="h-4 w-4" /> Open in Browser
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground text-center mt-4">
            © NIDO Vietnam. This document is confidential and for registered members only.
            Right-click and download are disabled.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
