import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { trackEvent } from '@enter-pro/analytics-sdk';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

type KnowledgeItem = {
  patterns: RegExp[];
  response: string;
  suggestions?: string[];
};

const KNOWLEDGE: KnowledgeItem[] = [
  {
    patterns: [/hello|hi\b|hey|good (morning|afternoon|evening)|howdy/i],
    response: "Hello! Welcome to NIDO Vietnam AI Assistant. I can help you with:\n\n• Nigerian passport renewal in Vietnam\n• Embassy contacts & services\n• NIDO membership & activities\n• Living in Vietnam as a Nigerian\n\nWhat would you like to know?",
    suggestions: ['Passport renewal', 'Embassy contacts', 'Join NIDO', 'Biometric enrollment'],
  },
  {
    patterns: [/passport.*(renew|renewal|replace|new|expire|lost|stolen)/i, /renew.*(passport)/i, /how.*get.*passport/i],
    response: "**Nigerian Passport Renewal in Vietnam**\n\nHere is the process:\n\n1. **Book appointment** — Contact the Nigerian Embassy in Hanoi\n2. **Prepare documents:**\n   - Expired/current passport\n   - NIN (National Identity Number) — required!\n   - Passport photos & application form\n3. **Biometric capture** — Select Malaysia as enrollment location and travel to Nigerian High Commission Kuala Lumpur\n4. **Collection** — Passport delivered after processing\n\nEmbassy Phone: +84-24-37263610 / +84-24-37263611\nEmbassy Email: Contact-us@nigeriaembassy.org.vn",
    suggestions: ['NIN requirements', 'Biometric enrollment', 'Embassy contacts', 'NIDO contacts'],
  },
  {
    patterns: [/biometric|contactless|enroll|enrollment/i],
    response: "**Biometric Passport Enrollment**\n\nKey information for Nigerians in Vietnam:\n\nSelect MALAYSIA as enrollment location — there is no NIS office in Vietnam.\n\nWhere to go:\nNigerian High Commission, Kuala Lumpur, Malaysia\n\nRequirements:\n- Valid NIN (National Identity Number)\n- Current/expired Nigerian passport\n- Completed application form\n- Passport photographs\n\nYou must travel to Kuala Lumpur for biometric capture.\n\nContact Embassy for full details:\nPhone: +84-24-37263610\nEmail: Contact-us@nigeriaembassy.org.vn",
    suggestions: ['Embassy contacts', 'NIN information', 'Passport renewal'],
  },
  {
    patterns: [/\bNIN\b|national identity|identity number/i],
    response: "**NIN (National Identity Number)**\n\nNIN is mandatory for all Nigerian passport renewals.\n\nIf you do not have a NIN, contact the Nigerian Embassy in Hanoi for guidance:\n\nPhone: +84-24-37263610\nWhatsApp (messages only): +84775568278\nEmail: Contact-us@nigeriaembassy.org.vn\n\nEmbassy staff can guide you through the NIN enrollment process remotely or during a visit.",
    suggestions: ['Embassy contacts', 'Passport renewal', 'Biometric enrollment'],
  },
  {
    patterns: [/embassy.*(contact|phone|number|email|address|location|hanoi)/i, /contact.*embassy/i, /nigerian embassy/i],
    response: "**Nigerian Embassy in Hanoi**\n\nAddress:\nVilla No 44/I Van Bao Street\nVan Phuc Diplomatic Compound, Hanoi\n\nPhone:\n+84-24-37263610\n+84-24-37263611\n\nWhatsApp (messages only):\n+84775568278\n\nEmail:\nContact-us@nigeriaembassy.org.vn\n\nOffice hours vary — call ahead to confirm appointment times.",
    suggestions: ['Passport renewal', 'NIDO contacts', 'Biometric enrollment'],
  },
  {
    patterns: [/nido.*(contact|phone|email|reach|hotline)/i, /contact.*nido/i, /michael omar|dr omar/i],
    response: "**NIDO Vietnam Contacts**\n\nHotline: +84326189705\n(Dr. Michael Omar — NIDO Vietnam President)\n\nEmail: info@nidovietnam.com\nWebsite: nidovietnam.com\n\nFeel free to reach out for membership, events, or assistance!",
    suggestions: ['Join NIDO', 'NIDO activities', 'Embassy contacts'],
  },
  {
    patterns: [/join|member|membership|register|sign up|how to join/i],
    response: "**Join NIDO Vietnam**\n\nMembership is open to all Nigerians living in Vietnam!\n\nHow to join:\n1. Click Register on this website\n2. Fill in your personal details\n3. Your application will be reviewed\n4. Once approved, you are a member!\n\nMembership types:\n- Regular (Free) — Basic access and community membership\n- Premium ($20/year) — Additional benefits and exclusive access\n\nBenefits include:\n- Community WhatsApp groups\n- Access to the NIDO Constitution\n- Business directory listing\n- Community events & networking",
    suggestions: ['NIDO activities', 'NIDO contacts', 'Premium benefits'],
  },
  {
    patterns: [/premium|paid.*member|subscription|upgrade/i],
    response: "**Premium Membership — $20/year**\n\nPremium members enjoy:\n- All regular membership benefits\n- Priority access to NIDO events\n- Enhanced business directory profile\n- Direct support line access\n- Exclusive member resources\n\nTo upgrade, contact NIDO Vietnam:\nEmail: info@nidovietnam.com\nPhone: +84326189705",
    suggestions: ['Join NIDO', 'NIDO contacts'],
  },
  {
    patterns: [/what is nido|about nido|nido.*mission|nido.*organization|who is nido/i],
    response: "**About NIDO Vietnam**\n\nNIDO (Nigerians in Diaspora Organization) Vietnam is the official organization for Nigerian nationals living in Vietnam.\n\nFounded: Officially inaugurated at the Nigerian Embassy, Hanoi in March 2016\n\nMission:\n- Unite Nigerians in Vietnam\n- Facilitate community welfare and support\n- Promote Nigerian culture and interests\n- Liaise with the Nigerian Embassy\n- Support members with documentation and legal matters\n\nNIDO Vietnam covers all of Vietnam and is part of the global NIDO network under the Federal Government of Nigeria.",
    suggestions: ['Join NIDO', 'NIDO activities', 'NIDO contacts', 'Embassy contacts'],
  },
  {
    patterns: [/activit|event|program|seminar|meeting|gathering/i],
    response: "**NIDO Vietnam Activities**\n\nNIDO Vietnam regularly organizes:\n\n- Community gatherings and celebrations\n- Educational seminars\n- Networking events\n- Health and welfare programs\n- Legal aid and documentation assistance\n- Cultural events and Nigerian celebrations\n\nCheck the Activities section of this website for upcoming events.\n\nContact us:\nEmail: info@nidovietnam.com\nPhone: +84326189705",
    suggestions: ['Join NIDO', 'NIDO contacts'],
  },
  {
    patterns: [/constitution|rules|guidelines|charter/i],
    response: "**NIDO Vietnam Constitution**\n\nThe NIDO Vietnam Constitution is available to registered members on this platform.\n\nTo access it:\n1. Register or login to your member account\n2. Go to the Constitution section in the menu\n\nNot a member yet? Join for free on this website!",
    suggestions: ['Join NIDO', 'NIDO activities'],
  },
  {
    patterns: [/PAI|pre.?arrival|pre arrival|arrival.*declaration/i],
    response: "**PAI (Pre-Arrival Information) System**\n\nVietnam's Immigration Department has introduced the PAI system for foreign nationals.\n\nWhat it is: An online declaration system to submit travel information before arriving in Vietnam.\n\nCurrently active at:\n- Tan Son Nhat Airport (Ho Chi Minh City)\n- Expanding to: Noi Bai (Hanoi), Da Nang, Phu Quoc\n\nMore info: xuatnhapcanh.gov.vn\nReference: ENG/HVN/CON/45/I (dated 2 June 2026)\n\nAll Nigerians travelling to Vietnam should use this system when available at their entry point.",
    suggestions: ['Embassy contacts', 'NIDO contacts'],
  },
  {
    patterns: [/business|company|directory|nigerian.*(business|shop|restaurant)/i],
    response: "**Nigerian Business Directory**\n\nNIDO Vietnam maintains a directory of Nigerian-owned businesses across Vietnam.\n\nVisit the Directory section on this website to:\n- Find Nigerian-owned businesses\n- List your own business\n- Connect with Nigerian entrepreneurs\n\nTo list your business, register as a member and submit via your member profile.",
    suggestions: ['Join NIDO', 'NIDO contacts'],
  },
  {
    patterns: [/visa|travel.*vietnam|entry.*vietnam|how.*enter.*vietnam/i],
    response: "**Visa and Entry Information**\n\nFor Nigerians residing in Vietnam, you likely have a work permit or residence visa.\n\nFor visa-related questions:\n- Contact the Nigerian Embassy in Hanoi for travel documents\n- For Vietnam immigration queries: xuatnhapcanh.gov.vn\n\nEmbassy: +84-24-37263610\nEmbassy Email: Contact-us@nigeriaembassy.org.vn\nNIDO Vietnam: info@nidovietnam.com",
    suggestions: ['Embassy contacts', 'PAI system', 'NIDO contacts'],
  },
  {
    patterns: [/health|hospital|doctor|medical|insurance/i],
    response: "**Healthcare in Vietnam**\n\nFor healthcare guidance as a Nigerian in Vietnam:\n\n- Contact NIDO Vietnam — we can recommend trusted healthcare providers\n- International hospitals in Hanoi and HCMC offer English-speaking services\n- Ensure you have valid health insurance\n\nNIDO Hotline: +84326189705\nEmail: info@nidovietnam.com\n\nNIDO Vietnam also periodically organizes health programs for the community.",
    suggestions: ['NIDO activities', 'NIDO contacts'],
  },
  {
    patterns: [/housing|apartment|rent|accommodation|living in/i],
    response: "**Housing and Living in Vietnam**\n\nTips for Nigerians living in Vietnam:\n\n- Major cities: Hanoi, Ho Chi Minh City, Da Nang have significant Nigerian communities\n- NIDO Community can connect you with Nigerians who share housing tips\n- Join NIDO Vietnam WhatsApp groups for real-time advice from fellow Nigerians\n\nFor community support:\nPhone: +84326189705\nEmail: info@nidovietnam.com",
    suggestions: ['Join NIDO', 'NIDO contacts', 'NIDO activities'],
  },
  {
    patterns: [/whatsapp.*group|community.*group|group.*chat/i],
    response: "**Community WhatsApp Groups**\n\nNIDO Vietnam has active WhatsApp groups for members!\n\nTo join:\n1. Become a NIDO member (register on this website)\n2. Contact NIDO Vietnam to be added to the group\n\nPhone: +84326189705\nEmail: info@nidovietnam.com\n\nGroups include general community chat, news, and city-specific groups.",
    suggestions: ['Join NIDO', 'NIDO contacts'],
  },
  {
    patterns: [/thank|thanks|thank you|appreciate|helpful/i],
    response: "You are welcome! If you have more questions about NIDO Vietnam, passports, or community resources, feel free to ask anytime.\n\nFor direct assistance:\nNIDO Hotline: +84326189705\nEmail: info@nidovietnam.com",
    suggestions: ['Passport renewal', 'Join NIDO', 'Embassy contacts'],
  },
  {
    patterns: [/bye|goodbye|see you|take care/i],
    response: "Goodbye! Stay connected with the NIDO Vietnam community. Do not hesitate to return if you have any questions. Wishing you all the best!",
  },
];

const DEFAULT_RESPONSE = {
  response: "I am not sure about that specific topic. Let me direct you to the right people:\n\nNIDO Vietnam: +84326189705 | info@nidovietnam.com\nNigerian Embassy Hanoi: +84-24-37263610\nEmbassy Email: Contact-us@nigeriaembassy.org.vn\n\nOr try one of the quick topics below:",
  suggestions: ['Passport renewal', 'Embassy contacts', 'Join NIDO', 'Biometric enrollment'],
};

function getResponse(input: string): { response: string; suggestions?: string[] } {
  const lower = input.toLowerCase();
  for (const item of KNOWLEDGE) {
    if (item.patterns.some(p => p.test(lower))) {
      return { response: item.response, suggestions: item.suggestions };
    }
  }
  return DEFAULT_RESPONSE;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "Hello! I am the NIDO Vietnam Assistant. I can help you with Nigerian passport renewals, embassy contacts, NIDO membership, and living in Vietnam as a Nigerian.\n\nWhat would you like to know?",
  suggestions: ['Passport renewal', 'Embassy contacts', 'Join NIDO', 'Biometric enrollment'],
};

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;
    const text = content.trim();
    const { response, suggestions } = getResponse(text);
    setMessages(prev => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: response, suggestions },
    ]);
    setInput('');
    trackEvent('ai_message_sent', { eventType: 'custom' });
  }, []);

  const formatContent = (text: string) =>
    text.split('\n').map((line, i) => {
      const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} className="mb-0.5 last:mb-0" dangerouslySetInnerHTML={{ __html: html || '\u00a0' }} />;
    });

  return (
    <>
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
            'relative w-14 h-14 rounded-full shadow-green flex items-center justify-center transition-smooth',
            'gradient-primary text-primary-foreground hover:scale-110'
          )}
        >
          {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full animate-pulse-ring" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full" />
        </button>
      </div>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-green overflow-hidden animate-fade-in-up flex flex-col">
          <div className="gradient-primary p-4 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-primary-foreground text-sm">NIDO AI Assistant</p>
              <p className="text-primary-foreground/70 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-300 rounded-full" />
                Always online · Completely free
              </p>
            </div>
          </div>

          <div ref={scrollRef} className="h-72 overflow-y-auto p-4 space-y-3 bg-muted/20">
            {messages.map((msg, i) => (
              <div key={i} className="space-y-2">
                <div className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    msg.role === 'user' ? 'gradient-primary' : 'bg-secondary'
                  )}>
                    {msg.role === 'user'
                      ? <User className="h-3.5 w-3.5 text-primary-foreground" />
                      : <Bot className="h-3.5 w-3.5 text-primary" />
                    }
                  </div>
                  <div className={cn(
                    'max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed',
                    msg.role === 'user'
                      ? 'gradient-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-card text-foreground border border-border rounded-tl-sm'
                  )}>
                    {formatContent(msg.content)}
                  </div>
                </div>
                {msg.role === 'assistant' && msg.suggestions && i === messages.length - 1 && (
                  <div className="flex flex-wrap gap-1.5 pl-9">
                    {msg.suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center gap-1"
                      >
                        {s} <ChevronRight className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-border flex gap-2 bg-card shrink-0">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ask about NIDO, passports..."
              className="flex-1 text-sm border-border"
            />
            <Button
              size="icon"
              className="gradient-primary text-primary-foreground shrink-0"
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
