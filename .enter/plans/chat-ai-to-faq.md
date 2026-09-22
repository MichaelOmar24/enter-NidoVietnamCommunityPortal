# Replace NIDO Chat AI with a static FAQ

## Context

The site currently ships two chat-AI artifacts:

- `src/components/common/AIChatWidget.tsx` — a floating chat bubble rendered on every page from `src/App.tsx`. It already answers from a **local regex knowledge base** (no network call), but it presents itself as "NIDO AI Assistant" and its 18 knowledge entries are written as canned assistant replies with "typing" UI.
- `supabase/functions/nido-ai-chat/index.ts` — a backend function that calls `https://api.enter.pro/code/api/v1/ai/chat/completions` with `deepseek/deepseek-v4-pro` (streaming). **This is the only code in the project that consumes AI credits.** Nothing in `src/` invokes it anymore, so it is a live credit-consuming endpoint left behind.

Goal: remove the AI chat (UI branding + the credit-consuming function) and replace it with a static FAQ — a floating help panel with expandable questions, local keyword search, and direct contact fallbacks. Nothing in the app should call an AI service; the app stays a plain client-side runtime.

## Decisions (defaults chosen; say the word if you want them changed)

- FAQ stays in the same place as the chat: floating button in the bottom-right corner of every page. No new route, no navbar change.
- Answers are plain static content rendered from a data module — no AI, no network requests, no credits.
- The typing/message composer is dropped; replaced by a search field that filters questions locally.
- `nido-ai-chat` source is deleted.

## Files

**New**
- `src/lib/faq.ts` — FAQ data + search.

**Renamed / rewritten**
- `src/components/common/AIChatWidget.tsx` → `src/components/common/FAQWidget.tsx` (rename, then rewrite body; export `FAQWidget`).

**Edited**
- `src/App.tsx` — swap import/usage `AIChatWidget` → `FAQWidget` (lines 8 and 21).
- `package.json` / `pnpm-lock.yaml` — remove `@microsoft/fetch-event-source` (verified unused: zero references in `src/`, `index.html`, `vite.config.ts`; it was the SSE client for the AI chat).

**Deleted**
- `supabase/functions/nido-ai-chat/index.ts` (whole `nido-ai-chat/` directory).

**Reused, not modified**
- `src/components/ui/accordion.tsx` — `Accordion/AccordionItem/AccordionTrigger/AccordionContent` for the question list.
- `src/components/ui/input.tsx`, `src/components/ui/button.tsx`, `src/components/ui/badge.tsx` for search, contact actions and category chips.
- `src/lib/utils.ts` (`cn`).
- Design tokens from `src/index.css` / `tailwind.config.ts`: `gradient-primary`, `shadow-green`, `text-primary-foreground`, `bg-card`, `border-border`, `bg-gold`, `animate-fade-in-up`, `animate-pulse-ring`. No new colors, no hardcoded `bg-white`/`text-white`.
- Icons from `lucide-react` (`HelpCircle`, `X`, `Search`, `Phone`, `Mail`, `MapPin`, `ChevronRight`). No emoji.

## 1. `src/lib/faq.ts`

```ts
export type FaqCategory =
  | 'Passport & Documents'
  | 'NIDO Membership'
  | 'Embassy & Contacts'
  | 'Community & Activities'
  | 'Living in Vietnam';

export interface FaqItem {
  id: string;              // stable slug, used for analytics + accordion value
  category: FaqCategory;
  question: string;        // phrased as a user question
  answer: string;          // plain text; \n line breaks and **bold** supported
  keywords: string[];      // derived from the existing KNOWLEDGE regex patterns
}

export const FAQ_CATEGORIES: FaqCategory[] = [...];
export const FAQ_ITEMS: FaqItem[] = [...];
export function filterFaq(query: string): FaqItem[];
```

Content is migrated 1:1 from the existing `KNOWLEDGE` array in `AIChatWidget.tsx` (lines 20–115) so **no factual answer is lost**, re-written from "assistant reply" into "question + answer":

| Category | Questions (id) | Source entry |
|---|---|---|
| Passport & Documents | How do I renew my Nigerian passport in Vietnam? (`passport-renewal`) | lines 26–30 |
| | How do I do biometric/contactless passport enrollment? (`biometric-enrollment`) | lines 31–35 |
| | What is a NIN and do I need one? (`nin`) | lines 36–40 |
| | What is the PAI system and do I need to use it? (`pai`) | lines 76–80 |
| | What about visas and entering Vietnam? (`visa-entry`) | lines 86–90 |
| NIDO Membership | What is NIDO Vietnam? (`about-nido`) | lines 61–65 |
| | How do I join NIDO Vietnam? (`join-nido`) | lines 51–55 |
| | What does Premium membership ($20/year) include? (`premium`) | lines 56–60 |
| | How do I access the NIDO Vietnam Constitution? (`constitution`) | lines 71–75 |
| Embassy & Contacts | How do I contact the Nigerian Embassy in Hanoi? (`embassy-contacts`) | lines 41–45 |
| | How do I contact NIDO Vietnam? (`nido-contacts`) | lines 46–50 |
| Community & Activities | What activities and events does NIDO organize? (`activities`) | lines 66–70 |
| | How do I join the community WhatsApp groups? (`whatsapp-groups`) | lines 101–105 |
| | How do I find or list a Nigerian-owned business? (`business-directory`) | lines 81–85 |
| Living in Vietnam | Where can I get healthcare guidance? (`healthcare`) | lines 91–95 |
| | What should I know about housing and living in Vietnam? (`housing`) | lines 96–100 |

- The greeting / thanks / goodbye entries (lines 21–25, 106–114) become the panel's static intro + contact block instead of FAQ rows.
- `filterFaq`: empty/whitespace query returns all items; otherwise case-insensitive token match over `question`, `keywords`, `category` and `answer`, ranked by number of matched tokens (question/keyword matches first). Pure function, no state, no network.
- Contact constants (NIDO hotline `+84326189705`, `info@nidovietnam.com`; embassy `+84-24-37263610`, `Contact-us@nigeriaembassy.org.vn`) are exported once from this module and reused in the panel footer.

## 2. `src/components/common/FAQWidget.tsx`

Same floating entry point and design language as today, minus all AI framing:

- **Collapsed:** circular `gradient-primary` button with `HelpCircle`, gold `animate-pulse-ring` dot, label chip reading "Need help? Browse FAQ" (`animate-fade-in-up`).
- **Open panel:** `fixed bottom-24 right-6 z-50 w-80 sm:w-96 max-h-[75vh] flex flex-col bg-card border border-border rounded-2xl shadow-green animate-fade-in-up`.
  - Header: `gradient-primary` bar, `HelpCircle` in a `bg-primary-foreground/20` circle, title **"NIDO Vietnam Help Center"**, subtitle "Answers to common questions · Always available · No sign-in needed".
  - Body (scrollable, `bg-muted/20`): `Input` with `Search` icon placeholder "Search questions…", then FAQ items grouped under `Badge`-styled category headings and rendered with `Accordion type="single" collapsible`; `AccordionTrigger` question text `text-xs font-medium text-foreground`, `AccordionContent` answer via a local `FaqAnswer` renderer that reuses the existing `formatContent` approach from `AIChatWidget.tsx` (lines 163–167: split `\n`, `**bold**` → `<strong>`).
  - Empty search result: friendly line plus the contact block ("No match — contact NIDO directly").
  - Footer (`border-t border-border`): "Still need help?" with `Phone`/`Mail` links for NIDO Vietnam and the Nigerian Embassy, so every dead end still has a human path.
- Responsive: panel width capped and body scrolls; on mobile the button stays `bottom-6 right-6` and the panel `bottom-24 right-4 left-4` at `<sm` so it never overflows a 390px viewport.
- **No `fetch`, no `supabase.functions.invoke`, no AI endpoint, no message composer.** Only local state: `open`, `query`, `expandedId`.
- Analytics: keep the existing instrumentation pattern (`trackEvent` from `@enter-pro/analytics-sdk`, as used in `DirectoryPage.tsx`):
  - `faq_opened` (custom) when the panel opens — replaces `ai_chat_opened`.
  - `faq_question_opened` (custom, `properties: { question: item.id }`) when a question is expanded — replaces `ai_message_sent`.
  - Both new names registered via `register_analytics_event`; `ai_chat_opened` / `ai_message_sent` are already registered, so after this change the AI events simply stop receiving data.

## 3. Cleanup

- `src/App.tsx`: import `{ FAQWidget } from "./components/common/FAQWidget"` and render `<FAQWidget />` where `<AIChatWidget />` is today.
- Delete `supabase/functions/nido-ai-chat/`.
- `pnpm remove @microsoft/fetch-event-source`.

## Verification

**Static checks (whole project)**
- `pnpm lint` → clean.
- `pnpm exec tsc --noEmit` → clean.
- `pnpm run build` → succeeds.
- `grep -rn "AIChatWidget\|nido-ai-chat\|ai_message_sent\|ai_chat_opened\|api/v1/ai\|fetch-event-source" src supabase` → no matches.

**Runtime checks (preview, home page `/`)**
- Floating help button opens the panel; all 16 questions are listed under 5 categories.
- Expanding one question reveals its answer with correct bold/line breaks; expanding another collapses the first (single mode).
- Search "passport" narrows the list to the passport/document items; clearing the search restores all 16.
- Boundary: search "zzzz" → empty-state message + working contact links, no crash; search with only spaces → treated as empty.
- Every answer still contains the original phone numbers, emails and addresses from the old knowledge base.
- Panel closes via the X button; reopening preserves no stale search text (or resets it — pick reset).
- Responsive: same panel at `mobile_390` and `desktop_1280` — no horizontal overflow, body scrolls inside the panel, button reachable.
- `read_network_requests` while opening the panel, searching and expanding answers → **no requests to any AI/`api.enter.pro` chat endpoint** (only the existing analytics beacons).

## Implementation checklist

- [x] `src/lib/faq.ts` created with `FaqItem`/`FaqCategory` types, `FAQ_CATEGORIES`, the 16 migrated items, exported contact constants, and `filterFaq`.
- [x] `filterFaq('')` and `filterFaq('   ')` return all items; `filterFaq('passport')` returns only passport/document items.
- [x] `AIChatWidget.tsx` renamed to `FAQWidget.tsx` and rewritten to export `FAQWidget` with the search + accordion + contact-CTA panel.
- [x] No `Bot`/`User`/`Send` icons, no message composer, no "AI Assistant" wording anywhere in the widget; `HelpCircle`/`Search`/`Phone`/`Mail` used instead.
- [x] Widget contains no `fetch`, `supabase.functions.invoke`, or AI endpoint call — only local state.
- [x] Analytics calls are `faq_opened` and `faq_question_opened`; `ai_chat_opened` / `ai_message_sent` no longer referenced in `src/`.
- [x] `faq_opened` and `faq_question_opened` registered via `register_analytics_event`.
- [x] `src/App.tsx` imports and renders `FAQWidget`; no `AIChatWidget` reference remains.
- [x] `supabase/functions/nido-ai-chat/` deleted.
- [x] `@microsoft/fetch-event-source` removed from `package.json`.

## Verification checklist

- [x] `pnpm lint` passes (0 errors; 7 pre-existing `exhaustive-deps` warnings in unrelated pages).
- [x] `pnpm exec tsc --noEmit` passes.
- [x] `pnpm run build` succeeds.
- [x] Repo grep for `AIChatWidget|nido-ai-chat|ai_message_sent|ai_chat_opened|api/v1/ai|fetch-event-source` returns nothing in `src` and `supabase`.
- [x] `filterFaq` checked by running `src/lib/faq.ts` under Node: `''`/`'   '` → 16, `'passport'` → passport-renewal, biometric-enrollment, nin, pai, visa-entry, `'nin'` → nin first, `'zzzz'` → 0, `'housing'` → housing.
- [ ] Preview: panel opens, 16 questions across 5 categories render, one-at-a-time expansion works — **not verified visually**: the preview URL was unreachable during this turn (`live-preview` navigation timed out), so panel interaction, the empty state, mobile overflow and AI-endpoint traffic were not observed in a browser.
- [ ] `website_screenshot` at `mobile_390` and `desktop_1280` — **not verified**, same preview-unreachable cause.
- [ ] `read_network_requests` after opening/searching/expanding — **not verified** for the same reason; statically, the widget performs no network calls (no `fetch`/`invoke` in the file).


## Notes / limitations

- Deleting the local source removes the function from the project, but a previously deployed copy of `nido-ai-chat` may still exist on the backend and the stored AI token secret stays in place. Since no code path invokes it, it consumes no credits; if you want it neutralised at the backend level too, say so and I'll redeploy it as a non-AI stub (there is no delete-function tool available to me).
- No `/faq` route, navbar or footer link is added. If you'd rather have a full page (or a page plus this floating panel), tell me and I'll add it using the same `src/lib/faq.ts` data.
