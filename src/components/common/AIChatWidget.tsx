import { useState, useRef, useCallback, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { cn } from '@/lib/utils';
import { trackEvent } from '@enter-pro/analytics-sdk';

const SUPABASE_URL = "https://spb-t4nj0o17iwx78npt.supabase.opentrust.net";
const SUPABASE_ANON_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsInJlZiI6InNwYi10NG5qMG8xN2l3eDc4bnB0IiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODIwOTk1MTYsImV4cCI6MjA5NzY3NTUxNn0.eefYISjeEzM_KbKB0si7Muv_4hf92gfPLH3jKP-HTbM";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const FALLBACK_MESSAGES: Record<string, string> = {
  authentication_error: 'Authentication failed. Please refresh the page.',
  rate_limit_error: 'Too many requests. Please try again later.',
  insufficient_credits: 'AI credits exhausted. Please contact the administrator.',
  permission_error: 'AI service is currently unavailable.',
  api_error: 'Service temporarily unavailable.',
};

function getUserErrorMessage(code: string, backendMessage: string): string {
  if (backendMessage) return backendMessage;
  return FALLBACK_MESSAGES[code] || 'Service temporarily unavailable.';
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am NIDO AI Assistant. I can help you with information about NIDO Vietnam, Nigerian passport renewals, biometric passport enrollment, embassy contacts, and community activities. How can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef(crypto.randomUUID());
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const updateLastAssistant = (updates: Partial<Message>) => {
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === 'assistant') Object.assign(last, updates);
      return updated;
    });
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    abortControllerRef.current = new AbortController();
    const userMsg: Message = { role: 'user', content };
    const assistantMsg: Message = { role: 'assistant', content: '', isStreaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    trackEvent('ai_message_sent', { eventType: 'custom', properties: { message_length: content.trim().length } });

    const chatHistory = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      await fetchEventSource(`${SUPABASE_URL}/functions/v1/nido-ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'X-Session-ID': sessionIdRef.current,
        },
        body: JSON.stringify({ messages: chatHistory }),
        signal: abortControllerRef.current.signal,

        async onopen(response) {
          const ct = response.headers.get('content-type');
          if (!response.ok) {
            if (ct?.includes('text/event-stream')) {
              const text = await response.text();
              const m = text.match(/data: (.+)/);
              if (m) {
                try {
                  const d = JSON.parse(m[1]);
                  throw new Error(d.error?.message || `Request failed: ${response.status}`);
                } catch (e) {
                  if (e instanceof Error && e.message !== 'Unexpected token') throw e;
                }
              }
            }
            if (ct?.includes('application/json')) {
              const d = await response.json();
              throw new Error(d.error?.message || `Request failed: ${response.status}`);
            }
            throw new Error(`Request failed: ${response.status}`);
          }
        },

        onmessage(event) {
          if (!event.data || event.data === '[DONE]') {
            if (event.data === '[DONE]') {
              updateLastAssistant({ isStreaming: false });
              setIsLoading(false);
            }
            return;
          }
          try {
            const data = JSON.parse(event.data);
            if (data.error) {
              const msg = getUserErrorMessage(data.error?.type || 'api_error', data.error?.message || '');
              setError(msg);
              setMessages(prev => prev.slice(0, -1));
              setIsLoading(false);
              return;
            }
            const choice = data.choices?.[0];
            if (!choice) return;
            if (choice.delta?.content) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  last.content = (last.content || '') + choice.delta.content;
                }
                return updated;
              });
            }
            if (choice.finish_reason) {
              updateLastAssistant({ isStreaming: false });
              setIsLoading(false);
            }
          } catch (_) { /* parse error, skip */ }
        },

        onerror(err) { throw err; },
      });
    } catch (err: unknown) {
      const e = err as Error;
      if (e.name !== 'AbortError') {
        setError(e.message || 'Failed to send message');
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last.isStreaming) return prev.slice(0, -1);
          return prev;
        });
      }
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  return (
    <>
      {/* Chat toggle button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {!open && (
          <div className="gradient-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow-green animate-fade-in-up">
            Chat with NIDO AI
          </div>
        )}
        <button
          onClick={() => {
            const opening = !open;
            setOpen(opening);
            if (opening) trackEvent('ai_chat_opened', { eventType: 'custom' });
          }}
          className={cn(
            "relative w-14 h-14 rounded-full shadow-green flex items-center justify-center transition-smooth",
            "gradient-primary text-primary-foreground hover:scale-110"
          )}
        >
          {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full animate-pulse-ring" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full" />
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-green overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="gradient-primary p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-primary-foreground text-sm">NIDO AI Assistant</p>
              <p className="text-primary-foreground/70 text-xs">Always here to help</p>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="h-72 overflow-y-auto p-4 space-y-3 bg-muted/20"
          >
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                  msg.role === 'user' ? "gradient-primary" : "bg-secondary"
                )}>
                  {msg.role === 'user'
                    ? <User className="h-3.5 w-3.5 text-primary-foreground" />
                    : <Bot className="h-3.5 w-3.5 text-primary" />
                  }
                </div>
                <div className={cn(
                  "max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user'
                    ? "gradient-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card text-foreground border border-border rounded-tl-sm"
                )}>
                  {msg.content || (msg.isStreaming && <Loader2 className="h-4 w-4 animate-spin" />)}
                </div>
              </div>
            ))}
            {error && (
              <p className="text-xs text-destructive text-center px-2">{error}</p>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2 bg-card">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Ask about NIDO, passports..."
              className="flex-1 text-sm border-border"
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="gradient-primary text-primary-foreground shrink-0"
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
