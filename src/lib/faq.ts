export type FaqCategory =
  | 'Passport & Documents'
  | 'NIDO Membership'
  | 'Embassy & Contacts'
  | 'Community & Activities'
  | 'Living in Vietnam';

export interface FaqItem {
  /** Stable slug — used as accordion value and analytics property. */
  id: string;
  category: FaqCategory;
  question: string;
  /** Plain text. Line breaks and **bold** are supported by the renderer. */
  answer: string;
  keywords: string[];
}

export const NIDO_CONTACTS = {
  hotline: '+84326189705',
  hotlineLabel: 'Dr. Michael Omar — NIDO Vietnam President',
  email: 'info@nidovietnam.com',
  website: 'nidovietnam.com',
};

export const EMBASSY_CONTACTS = {
  phone: '+84-24-37263610',
  phoneAlt: '+84-24-37263611',
  whatsapp: '+84775568278',
  email: 'Contact-us@nigeriaembassy.org.vn',
  address: 'Villa No 44/I Van Bao Street, Van Phuc Diplomatic Compound, Hanoi',
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  'Passport & Documents',
  'NIDO Membership',
  'Embassy & Contacts',
  'Community & Activities',
  'Living in Vietnam',
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'passport-renewal',
    category: 'Passport & Documents',
    question: 'How do I renew my Nigerian passport in Vietnam?',
    answer: `**Nigerian Passport Renewal in Vietnam**

Here is the process:

1. **Book appointment** — Contact the Nigerian Embassy in Hanoi
2. **Prepare documents:**
   - Expired/current passport
   - NIN (National Identity Number) — required!
   - Passport photos & application form
3. **Biometric capture** — Select Malaysia as enrollment location and travel to Nigerian High Commission Kuala Lumpur
4. **Collection** — Passport delivered after processing

Embassy Phone: +84-24-37263610 / +84-24-37263611
Embassy Email: Contact-us@nigeriaembassy.org.vn`,
    keywords: ['passport', 'renew', 'renewal', 'replace', 'expire', 'expired', 'lost', 'stolen', 'new passport', 'how to get passport'],
  },
  {
    id: 'biometric-enrollment',
    category: 'Passport & Documents',
    question: 'How do I do biometric (contactless) passport enrollment?',
    answer: `**Biometric Passport Enrollment**

Key information for Nigerians in Vietnam:

Select MALAYSIA as enrollment location — there is no NIS office in Vietnam.

Where to go:
Nigerian High Commission, Kuala Lumpur, Malaysia

Requirements:
- Valid NIN (National Identity Number)
- Current/expired Nigerian passport
- Completed application form
- Passport photographs

You must travel to Kuala Lumpur for biometric capture.

Contact Embassy for full details:
Phone: +84-24-37263610
Email: Contact-us@nigeriaembassy.org.vn`,
    keywords: ['biometric', 'contactless', 'enroll', 'enrollment', 'enrolment', 'capture', 'kuala lumpur', 'malaysia'],
  },
  {
    id: 'nin',
    category: 'Passport & Documents',
    question: 'What is a NIN and do I need one for my passport?',
    answer: `**NIN (National Identity Number)**

NIN is mandatory for all Nigerian passport renewals.

If you do not have a NIN, contact the Nigerian Embassy in Hanoi for guidance:

Phone: +84-24-37263610
WhatsApp (messages only): +84775568278
Email: Contact-us@nigeriaembassy.org.vn

Embassy staff can guide you through the NIN enrollment process remotely or during a visit.`,
    keywords: ['nin', 'national identity', 'identity number', 'id number'],
  },
  {
    id: 'pai',
    category: 'Passport & Documents',
    question: 'What is the PAI system and do I need to use it?',
    answer: `**PAI (Pre-Arrival Information) System**

Vietnam's Immigration Department has introduced the PAI system for foreign nationals.

What it is: An online declaration system to submit travel information before arriving in Vietnam.

Currently active at:
- Tan Son Nhat Airport (Ho Chi Minh City)
- Expanding to: Noi Bai (Hanoi), Da Nang, Phu Quoc

More info: xuatnhapcanh.gov.vn
Reference: ENG/HVN/CON/45/I (dated 2 June 2026)

All Nigerians travelling to Vietnam should use this system when available at their entry point.`,
    keywords: ['pai', 'pre-arrival', 'pre arrival', 'arrival declaration', 'immigration', 'airport'],
  },
  {
    id: 'visa-entry',
    category: 'Passport & Documents',
    question: 'What about visas and entering Vietnam?',
    answer: `**Visa and Entry Information**

For Nigerians residing in Vietnam, you likely have a work permit or residence visa.

For visa-related questions:
- Contact the Nigerian Embassy in Hanoi for travel documents
- For Vietnam immigration queries: xuatnhapcanh.gov.vn

Embassy: +84-24-37263610
Embassy Email: Contact-us@nigeriaembassy.org.vn
NIDO Vietnam: info@nidovietnam.com`,
    keywords: ['visa', 'travel', 'entry', 'enter vietnam', 'residence', 'work permit'],
  },
  {
    id: 'about-nido',
    category: 'NIDO Membership',
    question: 'What is NIDO Vietnam?',
    answer: `**About NIDO Vietnam**

NIDO (Nigerians in Diaspora Organization) Vietnam is the official organization for Nigerian nationals living in Vietnam.

Founded: Officially inaugurated at the Nigerian Embassy, Hanoi in March 2016

Mission:
- Unite Nigerians in Vietnam
- Facilitate community welfare and support
- Promote Nigerian culture and interests
- Liaise with the Nigerian Embassy
- Support members with documentation and legal matters

NIDO Vietnam covers all of Vietnam and is part of the global NIDO network under the Federal Government of Nigeria.`,
    keywords: ['about nido', 'what is nido', 'mission', 'organization', 'who is nido', 'history'],
  },
  {
    id: 'join-nido',
    category: 'NIDO Membership',
    question: 'How do I join NIDO Vietnam?',
    answer: `**Join NIDO Vietnam**

Membership is open to all Nigerians living in Vietnam!

How to join:
1. Click Register on this website
2. Fill in your personal details
3. Your application will be reviewed
4. Once approved, you are a member!

Membership types:
- Regular (Free) — Basic access and community membership
- Premium ($20/year) — Additional benefits and exclusive access

Benefits include:
- Community WhatsApp groups
- Access to the NIDO Constitution
- Business directory listing
- Community events & networking`,
    keywords: ['join', 'member', 'membership', 'register', 'sign up', 'how to join'],
  },
  {
    id: 'premium',
    category: 'NIDO Membership',
    question: 'What does Premium membership ($20/year) include?',
    answer: `**Premium Membership — $20/year**

Premium members enjoy:
- All regular membership benefits
- Priority access to NIDO events
- Enhanced business directory profile
- Direct support line access
- Exclusive member resources

To upgrade, contact NIDO Vietnam:
Email: info@nidovietnam.com
Phone: +84326189705`,
    keywords: ['premium', 'paid member', 'subscription', 'upgrade', 'fee', 'price'],
  },
  {
    id: 'constitution',
    category: 'NIDO Membership',
    question: 'How do I access the NIDO Vietnam Constitution?',
    answer: `**NIDO Vietnam Constitution**

The NIDO Vietnam Constitution is available to registered members on this platform.

To access it:
1. Register or login to your member account
2. Go to the Constitution section in the menu

Not a member yet? Join for free on this website!`,
    keywords: ['constitution', 'rules', 'guidelines', 'charter'],
  },
  {
    id: 'embassy-contacts',
    category: 'Embassy & Contacts',
    question: 'How do I contact the Nigerian Embassy in Hanoi?',
    answer: `**Nigerian Embassy in Hanoi**

Address:
Villa No 44/I Van Bao Street
Van Phuc Diplomatic Compound, Hanoi

Phone:
+84-24-37263610
+84-24-37263611

WhatsApp (messages only):
+84775568278

Email:
Contact-us@nigeriaembassy.org.vn

Office hours vary — call ahead to confirm appointment times.`,
    keywords: ['embassy', 'contact', 'phone', 'email', 'address', 'location', 'hanoi', 'nigerian embassy', 'whatsapp'],
  },
  {
    id: 'nido-contacts',
    category: 'Embassy & Contacts',
    question: 'How do I contact NIDO Vietnam?',
    answer: `**NIDO Vietnam Contacts**

Hotline: +84326189705
(Dr. Michael Omar — NIDO Vietnam President)

Email: info@nidovietnam.com
Website: nidovietnam.com

Feel free to reach out for membership, events, or assistance!`,
    keywords: ['nido contact', 'hotline', 'reach nido', 'president', 'michael omar', 'dr omar'],
  },
  {
    id: 'activities',
    category: 'Community & Activities',
    question: 'What activities and events does NIDO organize?',
    answer: `**NIDO Vietnam Activities**

NIDO Vietnam regularly organizes:

- Community gatherings and celebrations
- Educational seminars
- Networking events
- Health and welfare programs
- Legal aid and documentation assistance
- Cultural events and Nigerian celebrations

Check the Activities section of this website for upcoming events.

Contact us:
Email: info@nidovietnam.com
Phone: +84326189705`,
    keywords: ['activities', 'activity', 'events', 'event', 'program', 'seminar', 'meeting', 'gathering'],
  },
  {
    id: 'whatsapp-groups',
    category: 'Community & Activities',
    question: 'How do I join the community WhatsApp groups?',
    answer: `**Community WhatsApp Groups**

NIDO Vietnam has active WhatsApp groups for members!

To join:
1. Become a NIDO member (register on this website)
2. Contact NIDO Vietnam to be added to the group

Phone: +84326189705
Email: info@nidovietnam.com

Groups include general community chat, news, and city-specific groups.`,
    keywords: ['whatsapp group', 'community group', 'group chat', 'chat group'],
  },
  {
    id: 'business-directory',
    category: 'Community & Activities',
    question: 'How do I find or list a Nigerian-owned business?',
    answer: `**Nigerian Business Directory**

NIDO Vietnam maintains a directory of Nigerian-owned businesses across Vietnam.

Visit the Directory section on this website to:
- Find Nigerian-owned businesses
- List your own business
- Connect with Nigerian entrepreneurs

To list your business, register as a member and submit via your member profile.`,
    keywords: ['business', 'company', 'directory', 'shop', 'restaurant', 'entrepreneur'],
  },
  {
    id: 'healthcare',
    category: 'Living in Vietnam',
    question: 'Where can I get healthcare guidance in Vietnam?',
    answer: `**Healthcare in Vietnam**

For healthcare guidance as a Nigerian in Vietnam:

- Contact NIDO Vietnam — we can recommend trusted healthcare providers
- International hospitals in Hanoi and HCMC offer English-speaking services
- Ensure you have valid health insurance

NIDO Hotline: +84326189705
Email: info@nidovietnam.com

NIDO Vietnam also periodically organizes health programs for the community.`,
    keywords: ['health', 'healthcare', 'hospital', 'doctor', 'medical', 'insurance'],
  },
  {
    id: 'housing',
    category: 'Living in Vietnam',
    question: 'What should I know about housing and living in Vietnam?',
    answer: `**Housing and Living in Vietnam**

Tips for Nigerians living in Vietnam:

- Major cities: Hanoi, Ho Chi Minh City, Da Nang have significant Nigerian communities
- NIDO Community can connect you with Nigerians who share housing tips
- Join NIDO Vietnam WhatsApp groups for real-time advice from fellow Nigerians

For community support:
Phone: +84326189705
Email: info@nidovietnam.com`,
    keywords: ['housing', 'apartment', 'rent', 'accommodation', 'living in vietnam', 'where to live'],
  },
];

/**
 * Local, deterministic keyword search over the FAQ list.
 * Returns every item for an empty/whitespace-only query.
 */
export function filterFaq(query: string): FaqItem[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return FAQ_ITEMS;

  return FAQ_ITEMS.map((item, index) => {
    const question = item.question.toLowerCase();
    const answer = item.answer.toLowerCase();
    const category = item.category.toLowerCase();

    let score = 0;
    for (const token of tokens) {
      if (question.includes(token)) score += 3;
      if (item.keywords.some(keyword => keyword.includes(token) || token.includes(keyword))) score += 2;
      if (category.includes(token)) score += 1;
      if (answer.includes(token)) score += 1;
    }

    return { item, score, index };
  })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(entry => entry.item);
}
