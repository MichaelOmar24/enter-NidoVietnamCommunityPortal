import { useMemo, useState } from 'react';
import { HelpCircle, X, Search, Phone, Mail, MapPin, Globe, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { trackEvent } from '@enter-pro/analytics-sdk';
import { FAQ_CATEGORIES, filterFaq, NIDO_CONTACTS, EMBASSY_CONTACTS, type FaqItem } from '@/lib/faq';

function FaqAnswer({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => (
        <p
          key={i}
          className="mb-0.5 last:mb-0"
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') || '&nbsp;' }}
        />
      ))}
    </div>
  );
}

function ContactRow({ icon: Icon, label, value, href }: { icon: typeof Phone; label: string; value: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground/80">{label}</span>
        <span className="block break-words font-medium">{value}</span>
      </span>
    </a>
  );
}

export function FAQWidget() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState('');

  const results = useMemo(() => filterFaq(query), [query]);
  const grouped = useMemo(
    () =>
      FAQ_CATEGORIES.map(category => ({
        category,
        items: results.filter(item => item.category === category),
      })).filter(group => group.items.length > 0),
    [results]
  );

  const toggleOpen = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      setQuery('');
      setExpandedId('');
      trackEvent('faq_opened', { eventType: 'custom' });
    }
  };

  const handleExpand = (value: string) => {
    setExpandedId(value);
    if (value) {
      trackEvent('faq_question_opened', { eventType: 'custom', properties: { question: value } });
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {!open && (
          <div className="gradient-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow-green animate-fade-in-up">
            Need help? Browse FAQ
          </div>
        )}
        <button
          onClick={toggleOpen}
          aria-label={open ? 'Close FAQ' : 'Open FAQ'}
          className={cn(
            'relative w-14 h-14 rounded-full shadow-green flex items-center justify-center transition-smooth',
            'gradient-primary text-primary-foreground hover:scale-110'
          )}
        >
          {open ? <X className="h-6 w-6" /> : <HelpCircle className="h-6 w-6" />}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full animate-pulse-ring" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full" />
        </button>
      </div>

      {open && (
        <div className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-card border border-border rounded-2xl shadow-green overflow-hidden animate-fade-in-up flex flex-col">
          <div className="gradient-primary p-4 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-primary-foreground text-sm">NIDO Vietnam Help Center</p>
              <p className="text-primary-foreground/70 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                Answers to common questions
              </p>
            </div>
          </div>

          <div className="p-3 border-b border-border bg-card shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search questions..."
                className="pl-8 h-9 text-sm border-border"
              />
            </div>
          </div>

          <div className="max-h-[55vh] overflow-y-auto p-3 space-y-4 bg-muted/20">
            {grouped.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <MessageSquare className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-2 text-xs font-medium text-foreground">No matching question found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try another keyword, or contact NIDO Vietnam and the Embassy directly using the details below.
                </p>
              </div>
            ) : (
              grouped.map(group => (
                <div key={group.category} className="space-y-2">
                  <Badge
                    variant="outline"
                    className="border-border bg-card text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {group.category}
                  </Badge>
                  <Accordion
                    type="single"
                    collapsible
                    value={expandedId}
                    onValueChange={handleExpand}
                    className="rounded-xl border border-border bg-card px-3"
                  >
                    {group.items.map((item: FaqItem) => (
                      <AccordionItem key={item.id} value={item.id} className="border-border last:border-b-0">
                        <AccordionTrigger className="py-2.5 text-left text-xs font-medium text-foreground hover:text-primary hover:no-underline">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="pb-3 text-xs leading-relaxed text-muted-foreground">
                          <FaqAnswer text={item.answer} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border bg-card p-3 shrink-0">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Still need help?
            </p>
            <div className="grid gap-0.5 sm:grid-cols-2">
              <ContactRow icon={Phone} label="NIDO Vietnam hotline" value={NIDO_CONTACTS.hotline} href={`tel:${NIDO_CONTACTS.hotline}`} />
              <ContactRow icon={Mail} label="NIDO Vietnam email" value={NIDO_CONTACTS.email} href={`mailto:${NIDO_CONTACTS.email}`} />
              <ContactRow icon={Phone} label="Embassy, Hanoi" value={EMBASSY_CONTACTS.phone} href={`tel:${EMBASSY_CONTACTS.phone}`} />
              <ContactRow icon={Mail} label="Embassy email" value={EMBASSY_CONTACTS.email} href={`mailto:${EMBASSY_CONTACTS.email}`} />
              <ContactRow
                icon={MapPin}
                label="Embassy address"
                value={EMBASSY_CONTACTS.address}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(EMBASSY_CONTACTS.address)}`}
              />
              <ContactRow icon={Globe} label="Website" value={NIDO_CONTACTS.website} href={`https://${NIDO_CONTACTS.website}`} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
