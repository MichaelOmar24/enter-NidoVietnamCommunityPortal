import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MailOpen, Mail, RefreshCw, Reply, Send, Loader2, Inbox as InboxIcon, User, Forward } from 'lucide-react';

interface InboxMessage {
  uid: number;
  subject: string;
  fromName: string;
  fromAddress: string;
  date: string | null;
  seen: boolean;
}

interface FullMessage extends InboxMessage {
  messageId: string | null;
  text: string;
  html: string | null;
}

function formatDate(d: string | null) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AdminInbox() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FullMessage | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<'reply' | 'forward'>('reply');
  const [forwardTo, setForwardTo] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.functions.invoke('fetch-inbox', { body: { limit: 50 } });
    if (err || data?.error) {
      let msg = err?.message || data?.error || 'Failed to load inbox';
      try {
        const ctx = (err as { context?: Response } | null)?.context;
        if (ctx) {
          const bodyErr = await ctx.json().catch(() => null);
          if (bodyErr?.error) msg = bodyErr.error;
        }
      } catch { /* keep */ }
      setError(msg);
      setMessages([]);
    } else {
      setMessages(data.messages || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openMessage = async (msg: InboxMessage) => {
    setLoadingMessage(true);
    setSelected(null);
    setReplyText('');
    setMode('reply');
    setForwardTo('');
    setForwardNote('');
    const { data, error: err } = await supabase.functions.invoke('fetch-inbox', { body: { uid: msg.uid } });
    setLoadingMessage(false);
    if (err || data?.error) {
      toast({ title: 'Could not load message', description: data?.error || err?.message, variant: 'destructive' });
      return;
    }
    setSelected(data as FullMessage);
    // Mark as read in the local list view
    setMessages(list => list.map(m => m.uid === msg.uid ? { ...m, seen: true } : m));
  };

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    const { data, error: err } = await supabase.functions.invoke('send-member-email', {
      body: {
        to: selected.fromAddress,
        toName: selected.fromName || undefined,
        subject: selected.subject.startsWith('Re:') ? selected.subject : `Re: ${selected.subject}`,
        message: replyText,
        inReplyTo: selected.messageId || undefined,
        references: selected.messageId || undefined,
      },
    });
    setSending(false);
    if (err || data?.error) {
      toast({ title: 'Reply failed', description: data?.error || err?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Reply sent', description: `Sent to ${selected.fromAddress}` });
    setReplyText('');
    setSelected(null);
  };

  const sendForward = async () => {
    if (!selected || !forwardTo.trim()) return;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forwardTo.trim());
    if (!emailOk) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address to forward to.', variant: 'destructive' });
      return;
    }
    setSending(true);
    const originalBody = selected.text || (selected.html ? selected.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '');
    const forwardedContent = `${forwardNote.trim() ? forwardNote.trim() + '\n\n' : ''}---------- Forwarded message ----------
From: ${selected.fromName ? `${selected.fromName} <${selected.fromAddress}>` : selected.fromAddress}
Date: ${selected.date || ''}
Subject: ${selected.subject}
To: info@nidovietnam.com

${originalBody}`;
    const fwdSubject = selected.subject.replace(/^(fwd?:\s*)+/i, '');
    const { data, error: err } = await supabase.functions.invoke('send-member-email', {
      body: {
        to: forwardTo.trim(),
        subject: `Fwd: ${fwdSubject}`,
        message: forwardedContent,
      },
    });
    setSending(false);
    if (err || data?.error) {
      toast({ title: 'Forward failed', description: data?.error || err?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Email forwarded', description: `Sent to ${forwardTo.trim()}` });
    setForwardTo('');
    setForwardNote('');
    setSelected(null);
  };

  const unread = messages.filter(m => !m.seen).length;

  return (
    <AdminLayout title="Email Inbox">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <InboxIcon className="h-4 w-4 text-primary" />
          <span><strong className="text-foreground">{total}</strong> messages in info@nidovietnam.com{unread > 0 && <> · <span className="text-primary font-medium">{unread} unread</span></>}</span>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="ml-auto gap-2 text-primary border-primary hover:bg-primary/10">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Message list */}
      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading inbox...</span>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-muted-foreground">
          <Mail className="h-16 w-16 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">Could not load the inbox</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <InboxIcon className="h-16 w-16 mx-auto mb-3 opacity-30" />
          <p>The inbox is empty.</p>
        </div>
      ) : (
        <Card className="shadow-card overflow-hidden">
          <div className="divide-y divide-border">
            {messages.map(m => (
              <button
                key={m.uid}
                onClick={() => openMessage(m)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors ${!m.seen ? 'bg-primary/[0.03]' : ''}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${m.seen ? 'bg-muted' : 'gradient-primary'}`}>
                  <User className={`h-4 w-4 ${m.seen ? 'text-muted-foreground' : 'text-primary-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`truncate text-sm ${m.seen ? 'text-foreground/80' : 'font-bold text-foreground'}`}>
                      {m.fromName || m.fromAddress}
                    </p>
                    {!m.seen && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className={`truncate text-sm ${m.seen ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>{m.subject}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(m.date)}</span>
                {m.seen ? <MailOpen className="h-4 w-4 text-muted-foreground/40 shrink-0" /> : <Mail className="h-4 w-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Read / Reply Dialog */}
      <Dialog open={!!selected || loadingMessage} onOpenChange={o => { if (!o) { setSelected(null); setReplyText(''); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {loadingMessage ? (
            <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading message...</span>
            </div>
          ) : selected && (
            <>
              <DialogHeader>
                <DialogTitle className="leading-snug">{selected.subject}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{selected.fromName || selected.fromAddress}</p>
                    <p className="text-xs text-muted-foreground truncate">{selected.fromAddress} · {formatDate(selected.date)}</p>
                  </div>
                </div>

                <div className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted/30 rounded-lg p-4 border border-border max-h-72 overflow-y-auto">
                  {selected.text || (selected.html ? selected.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '(empty message)')}
                </div>

                {/* Reply / Forward */}
                <div className="space-y-3 pt-3 border-t border-border">
                  {/* Mode toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode('reply')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${mode === 'reply' ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
                    >
                      <Reply className="h-3.5 w-3.5" /> Reply
                    </button>
                    <button
                      onClick={() => setMode('forward')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${mode === 'forward' ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
                    >
                      <Forward className="h-3.5 w-3.5" /> Forward
                    </button>
                  </div>

                  {mode === 'reply' ? (
                    <>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Reply className="h-4 w-4 text-primary" /> Reply to {selected.fromName || selected.fromAddress}
                      </p>
                      <Textarea
                        rows={5}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Type your reply... It will be sent from info@nidovietnam.com and threaded with this conversation."
                        className="resize-none"
                      />
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setSelected(null)} disabled={sending}>Close</Button>
                        <Button className="flex-1 gap-2 gradient-primary text-primary-foreground" onClick={sendReply} disabled={sending || !replyText.trim()}>
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          {sending ? 'Sending...' : 'Send Reply'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Forward className="h-4 w-4 text-primary" /> Forward this email
                      </p>
                      <Input
                        type="email"
                        value={forwardTo}
                        onChange={e => setForwardTo(e.target.value)}
                        placeholder="Forward to email address (e.g. someone@example.com)"
                      />
                      <Textarea
                        rows={3}
                        value={forwardNote}
                        onChange={e => setForwardNote(e.target.value)}
                        placeholder="Optional note to add above the forwarded message..."
                        className="resize-none"
                      />
                      <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground">
                        The full original message will be included below your note, sent from info@nidovietnam.com.
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setSelected(null)} disabled={sending}>Close</Button>
                        <Button className="flex-1 gap-2 gradient-primary text-primary-foreground" onClick={sendForward} disabled={sending || !forwardTo.trim()}>
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Forward className="h-4 w-4" />}
                          {sending ? 'Sending...' : 'Forward Email'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
