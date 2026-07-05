import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Mail, MailOpen, Reply, Search, Inbox, Clock, CheckCheck,
  User, Calendar, Tag, ExternalLink, RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  admin_reply?: string;
  replied_at?: string;
  created_at: string;
}

type Filter = 'all' | 'unread' | 'read' | 'replied';

export function AdminMessages() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    const { data } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    setMessages((data || []) as ContactMessage[]);
    if (showRefresh) setRefreshing(false);
    else setLoading(false);
  };

  const openMessage = async (msg: ContactMessage) => {
    setSelected(msg);
    setReply(msg.admin_reply || '');
    // Mark as read if unread
    if (msg.status === 'unread') {
      await supabase.from('contact_messages').update({ status: 'read' }).eq('id', msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'read' } : m));
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setReplying(true);
    const { error } = await supabase.from('contact_messages').update({
      admin_reply: reply.trim(),
      status: 'replied',
      replied_at: new Date().toISOString(),
      replied_by: profile!.id,
    }).eq('id', selected.id);

    if (!error) {
      const updated = { ...selected, admin_reply: reply.trim(), status: 'replied' as const, replied_at: new Date().toISOString() };
      setSelected(updated);
      setMessages(prev => prev.map(m => m.id === selected.id ? updated : m));
      toast({ title: 'Reply saved', description: 'Use the email link below to send it to the sender.' });
    }
    setReplying(false);
  };

  const filtered = messages.filter(m => {
    const matchesFilter = filter === 'all' || m.status === filter;
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.subject.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = {
    all: messages.length,
    unread: messages.filter(m => m.status === 'unread').length,
    read: messages.filter(m => m.status === 'read').length,
    replied: messages.filter(m => m.status === 'replied').length,
  };

  const StatusBadge = ({ status }: { status: ContactMessage['status'] }) => {
    if (status === 'unread') return <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30 border">Unread</Badge>;
    if (status === 'replied') return <Badge className="text-[10px] bg-green-500/10 text-green-700 border-green-300 dark:text-green-400 border">Replied</Badge>;
    return <Badge variant="outline" className="text-[10px]">Read</Badge>;
  };

  return (
    <AdminLayout title="Messages Inbox">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {(['all', 'unread', 'read', 'replied'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl border p-3 text-left transition-colors ${filter === f ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}
          >
            <p className={`text-xl font-bold ${filter === f ? 'text-primary' : 'text-foreground'}`}>{counts[f]}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{f === 'all' ? 'Total' : f}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Message List */}
        <div className="w-80 shrink-0 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
          {/* Search + refresh */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
                placeholder="Search name, email, subject..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{filtered.length} message{filtered.length !== 1 ? 's' : ''}</p>
              <button onClick={() => load(true)} className="p-1 hover:bg-muted rounded" title="Refresh">
                <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-0.5 p-2">
                {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
                <Inbox className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No messages</p>
              </div>
            ) : (
              filtered.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  className={`w-full text-left px-3 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors ${selected?.id === msg.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {msg.status === 'unread'
                        ? <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                        : msg.status === 'replied'
                        ? <CheckCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        : <MailOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      }
                      <p className={`text-sm truncate ${msg.status === 'unread' ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
                        {msg.name}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      {format(parseISO(msg.created_at), 'dd MMM')}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${msg.status === 'unread' ? 'text-foreground' : 'text-muted-foreground'}`}>{msg.subject}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{msg.message}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="flex-1 border border-border rounded-xl bg-card overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Inbox className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-medium">Select a message to read</p>
              <p className="text-sm mt-1 opacity-70">{counts.unread > 0 ? `${counts.unread} unread message${counts.unread > 1 ? 's' : ''}` : 'All messages read'}</p>
            </div>
          ) : (
            <>
              {/* Message header */}
              <div className="p-5 border-b border-border">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="font-bold text-foreground text-lg leading-tight">{selected.subject}</h2>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> {selected.name}
                  </span>
                  <a
                    href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" /> {selected.email}
                  </a>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {format(parseISO(selected.created_at), 'dd MMMM yyyy, HH:mm')}
                  </span>
                </div>
              </div>

              {/* Message body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Original message */}
                <div className="rounded-xl bg-muted/30 border border-border p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Message
                  </p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selected.message}</p>
                </div>

                {/* Previous reply (if any) */}
                {selected.admin_reply && (
                  <div className="rounded-xl bg-green-500/5 border border-green-300/40 p-4">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Reply className="h-3.5 w-3.5" /> Your Reply
                      {selected.replied_at && <span className="ml-auto font-normal normal-case text-muted-foreground">{format(parseISO(selected.replied_at), 'dd MMM yyyy, HH:mm')}</span>}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selected.admin_reply}</p>
                  </div>
                )}

                {/* Reply form */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Reply className="h-3.5 w-3.5" /> {selected.admin_reply ? 'Update Reply' : 'Write a Reply'}
                  </p>
                  <Textarea
                    className="min-h-[120px] text-sm"
                    placeholder={`Write your reply to ${selected.name}...`}
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                  />
                  <div className="flex items-center gap-3 mt-3">
                    <Button
                      onClick={sendReply}
                      disabled={replying || !reply.trim()}
                      className="gradient-primary text-primary-foreground gap-2"
                    >
                      <Reply className="h-4 w-4" />
                      {replying ? 'Saving...' : 'Save Reply'}
                    </Button>
                    {reply.trim() && (
                      <a
                        href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}&body=${encodeURIComponent(reply)}`}
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Send via Email Client
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Reply is saved here. Use "Send via Email Client" to actually email the sender at {selected.email}.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
