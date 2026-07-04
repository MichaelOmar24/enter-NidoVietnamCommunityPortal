# NIDO Vietnam — Full-Stack Website Plan

## Context
Building a complete community website for **Nigerians in Diaspora Organization Vietnam (NIDO Vietnam)** using React + TypeScript + Tailwind (frontend) and Enter Cloud / Supabase (backend). The user requested a Laravel/MySQL build — this plan delivers equivalent full-stack functionality with React + Supabase instead, which is what the Enter platform supports.

---

## 1. First Steps (Before Coding Begins)
1. **Enable Enter Cloud** — required for Auth, Database, Storage, Edge Functions, Email
2. **Enable AI Capability** — required for the AI Chat assistant feature

---

## 2. Design System

**Brand Colors** (Nigerian + Vietnamese theme):
- `--primary`: `152 100% 26%` → Nigerian Green `#008751`
- `--primary-glow`: `152 80% 38%` → lighter green
- `--accent`: `4 75% 47%` → Vietnamese Red `#DA251D`
- `--gold`: `45 100% 50%` → NIDO Gold `#FFD700`
- Clean white background, dark sidebar

**Visual Style:** Modern SaaS — hero with green gradient, card-based layouts, data tables, Recharts pie/bar, smooth animations via framer-motion.

---

## 3. Pages & Routes

| Route | Page | Access |
|---|---|---|
| `/` | HomePage | Public |
| `/login` | LoginPage | Public |
| `/register` | RegisterPage (multi-step) | Public |
| `/dashboard` | UserDashboard | Member |
| `/profile` | ProfilePage | Member |
| `/membership` | MembershipPage | Member |
| `/admin` | AdminDashboard | Admin |
| `/admin/members` | AdminMembers | Admin |
| `/admin/companies` | AdminCompanies | Admin |
| `/admin/gallery` | AdminGallery | Admin |
| `/admin/documents` | AdminDocuments | Admin |
| `/directory` | BusinessDirectory | Public |
| `/constitution` | ConstitutionViewer | Member |
| `/gallery` | GalleryPage | Public |
| `/activities` | ActivitiesPage | Public |
| `/passport-info` | PassportInfoPage | Public |
| `/contact` | ContactPage | Public |

---

## 4. Component Architecture

```
src/
├── context/
│   └── AuthContext.tsx          — Supabase auth + user profile state
├── lib/
│   ├── supabase.ts              — Supabase client
│   └── types.ts                 — All TypeScript types
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx           — Top nav w/ auth state, social links
│   │   ├── Footer.tsx           — Links, embassy contacts, social
│   │   └── AdminLayout.tsx      — Admin sidebar layout
│   ├── common/
│   │   ├── AIChatWidget.tsx     — Floating AI chat bubble
│   │   ├── MemberStatsCounter.tsx — Animated member count
│   │   ├── EmbassyContact.tsx   — Embassy info card
│   │   └── ProtectedRoute.tsx   — Auth guard + role guard
│   └── admin/
│       ├── StatsCharts.tsx      — Recharts pie/bar for member categories
│       ├── MembersTable.tsx     — Full member table w/ edit/delete
│       ├── PassportReview.tsx   — Passport image viewer + edit panel
│       ├── CompanyManager.tsx   — CRUD for business directory
│       └── GalleryManager.tsx   — Upload/delete gallery photos
├── pages/
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx         — 3-step form
│   ├── UserDashboard.tsx        — Profile, alerts, stats
│   ├── ProfilePage.tsx
│   ├── MembershipPage.tsx       — Stripe placeholder
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminMembers.tsx
│   │   ├── AdminCompanies.tsx
│   │   ├── AdminGallery.tsx
│   │   └── AdminDocuments.tsx
│   ├── DirectoryPage.tsx
│   ├── ConstitutionPage.tsx     — iframe PDF (no download)
│   ├── GalleryPage.tsx
│   ├── ActivitiesPage.tsx
│   ├── PassportInfoPage.tsx
│   └── ContactPage.tsx
└── router.tsx                   — All routes + ProtectedRoute wrappers
```

---

## 5. Database Schema (Supabase)

### `profiles`
`id` · `first_name` · `last_name` · `email` · `phone` · `date_of_birth` · `gender` · `occupation_type` (student | teacher | self_employed | business | employee | other) · `marital_status` (single | married | divorced | widowed) · `vietnam_city` · `nigerian_state_of_origin` · `profile_picture_url` · `membership_type` (regular | premium) · `membership_status` (active | pending | expired) · `is_admin` · `created_at`

### `passports`
`id` · `user_id` · `passport_number` · `issue_date` · `expiry_date` · `place_of_issue` · `passport_image_url` · `is_biometric` · `admin_notes` · `verified` · `created_at`

### `companies`
`id` · `owner_id` · `company_name` · `description` · `business_type` · `address_in_vietnam` · `website` · `phone` · `logo_url` · `cover_image_url` · `is_approved` · `created_at`

### `gallery_albums`
`id` · `title` · `description` · `cover_image_url` · `event_date` · `created_at`

### `gallery_photos`
`id` · `album_id` · `image_url` · `caption` · `created_at`

### `activities`
`id` · `title` · `description` · `event_date` · `location` · `cover_image_url` · `is_published` · `created_at`

### `documents`
`id` · `title` · `document_url` · `document_type` (constitution | circular | announcement) · `is_active` · `created_at`

### `memberships`
`id` · `user_id` · `plan_type` · `amount` · `payment_status` (pending | paid | expired) · `valid_from` · `valid_until` · `stripe_session_id` · `created_at`

---

## 6. Edge Functions

| Function | Purpose |
|---|---|
| `send-welcome-email` | Send welcome email to new member + profile PDF summary to contact-us@nigeriaembassy.org.vn |
| `ai-chat` | LLM-powered NIDO community assistant (Enter AI All) |
| `embassy-news` | Proxy-fetch notices from nigeriaembassy.org.vn (avoids CORS) |
| `check-passport-expiry` | Scan passports expiring within 365 days, return alerts |

---

## 7. Key Feature Details

### Registration (3-Step Form)
- Step 1: Personal info (name, email, phone, DOB, gender, state of origin)
- Step 2: Occupation type + marital status selection
- Step 3: Passport details (number, issue/expiry dates, image upload to Supabase Storage)
- On completion: welcome email sent + profile emailed to Nigerian Embassy

### Admin Dashboard
- Summary cards: total members, pending verification, expiring passports, active businesses
- Pie charts (by occupation), bar charts (by marital status), by Vietnam city
- Recent registrations table
- Passport expiry alerts list

### Passport Viewer (Admin)
- Side-by-side: uploaded passport image + editable data fields
- Admin can correct passport number, dates, add notes, mark as verified

### PDF Constitution Viewer
- Embed the NIDO Constitution PDF via Google Docs Viewer iframe
- `contextmenu` and `onContextMenu` disabled (cannot right-click save)
- No PDF controls shown in embed
- Member-only access (requires login)

### AI Chat Widget
- Floating bottom-right bubble on all public pages
- Edge Function calls Enter LLM with NIDO system context (community rules, passport info, embassy contacts, biometric passport instructions)
- Chat history stored in component state

### Biometric Passport Info (Public Page)
- Step-by-step instructions: "Vietnamese residents select Malaysia" for enrollment
- Payment info to Nigerian Immigration
- Embassy contact for enquiries

### Embassy News Section
- Edge function fetches nigeriaembassy.org.vn notices
- Displayed as scrollable news cards on homepage and dedicated section
- Falls back to cached/static notices if fetch fails

### Social Links
- Facebook: https://www.facebook.com/groups/357099351095953
- WhatsApp 1: https://chat.whatsapp.com/JY6blJObydS8b7CMvcrYMJ
- WhatsApp 2: https://chat.whatsapp.com/HFaStQ14rmkAuaswLKhaUl

### Contact Info
- Email: INFO@NIDOVIETNAM.COM
- NIDO Hotline: +84326189705 (Dr. Michael Omar)
- Embassy Office: +84-24-37263610 / +84-24-37263611
- Embassy Fax: +84-24-37263615
- Embassy WhatsApp: +84775568278

---

## 8. Assets Used
- Logo: `https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png`
- Coat of Arms: `https://cdn.enter.pro/resources/uid_100149613/db051db4-b309-4c.jpeg`
- Inauguration photos (DSC_6894.JPG — 3 photos in one file): `https://cdn.enter.pro/resources/uid_100149613/8c7a13b1-1326-42.JPG`
- Constitution PDF: hosted in Supabase Storage after upload

---

## 9. Files to Create/Modify

### New files (all source files):
- `src/lib/supabase.ts` — Supabase client
- `src/lib/types.ts` — TypeScript types
- `src/context/AuthContext.tsx`
- `src/components/layout/Navbar.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/AdminLayout.tsx`
- `src/components/common/AIChatWidget.tsx`
- `src/components/common/MemberStatsCounter.tsx`
- `src/components/common/EmbassyContact.tsx`
- `src/components/common/ProtectedRoute.tsx`
- `src/components/admin/StatsCharts.tsx`
- `src/components/admin/MembersTable.tsx`
- `src/components/admin/PassportReview.tsx`
- `src/components/admin/CompanyManager.tsx`
- `src/components/admin/GalleryManager.tsx`
- All page files (15 pages)
- `supabase/functions/send-welcome-email/index.ts`
- `supabase/functions/ai-chat/index.ts`
- `supabase/functions/embassy-news/index.ts`
- `supabase/functions/check-passport-expiry/index.ts`
- `supabase/migrations/001_initial_schema.sql`

### Modified files:
- `src/index.css` — Nigerian/Vietnamese design tokens
- `src/tailwind.config.ts` — Extended color palette
- `src/App.tsx` — Wrap with AuthProvider
- `src/router.tsx` — All routes

---

## 10. What Still Needs Manual Configuration After Build
1. **Enter Cloud**: Enable via the platform UI (database, auth, storage)
2. **AI Capability**: Enable via platform to use LLM in edge functions
3. **Email SMTP**: Configure Supabase email settings for outbound mail
4. **Stripe**: Add publishable key and configure webhook for membership payments
5. **Storage Buckets**: Create `passport-images`, `gallery-photos`, `documents`, `profile-pictures` buckets in Supabase
6. **Custom Domain**: Connect nidovietnam.com via Enter platform settings

---

## 11. Security Checklist Before Launch
- Row-Level Security (RLS) on all tables
- Passport images: private bucket (only owner + admin can read)
- Admin role checked server-side via `is_admin` field + RLS policy
- Input validation with Zod on all forms
- No sensitive data exposed in frontend
- PDF constitution: served via signed URL (no public download)

---

## 12. Verification Steps
1. Register a new member → check welcome email received
2. Upload passport image → verify admin can view it
3. Log in as admin → verify stats charts render with correct category breakdowns
4. Check passport expiry alert appears on dashboard for near-expiry passports
5. Add company to directory → verify it appears on public directory page
6. AI chat responds to: "What is NIDO Vietnam?" and "How do I renew my passport?"
7. Constitution PDF displays in iframe but right-click save is blocked
8. Embassy news section loads notices
9. Gallery images load from Supabase Storage
