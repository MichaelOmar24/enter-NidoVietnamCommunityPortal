# Membership Tiers + VND Payment System Plan

## Overview
Full membership system overhaul with 3 tiers, VND bank-transfer QR payment flow, admin payment management, and stats in admin + embassy dashboards.

## Membership Tiers
| Tier | Price | Description |
|------|-------|-------------|
| Free | 0 VND | Basic community membership |
| Premium | 1,000,000 VND/year | Full featured with exclusive benefits |
| Gold (Stakeholder) | 2,000,000 VND/year | Top-tier stakeholder privileges |

## Payment Approach (VND Bank Transfer)
- Admin uploads a bank QR code image + bank details (account name, number, bank name) in a Settings tab
- Member selects a paid tier → dialog opens with QR code, bank details, amount, and instructions
- Member makes transfer, enters their payment reference note, submits
- Admin reviews pending payments, approves/rejects with notes
- On approval: member's `membership_type` and `membership_status` are updated automatically

## Database Changes (1 migration)
1. **Update `memberships` table**:
   - `plan_type` check: `'free' | 'premium' | 'gold'` (was `'regular' | 'premium'`)
   - `currency` default → `'VND'`
   - Add `payment_reference TEXT` (transfer note the member used)
   - Add `payment_proof_url TEXT` (optional screenshot upload)
   - Add `approved_by UUID FK(profiles.id)`
   - Add `approved_at TIMESTAMPTZ`
   - Add `notes TEXT`
   - Drop `stripe_session_id` column (no longer relevant)
2. **Update `profiles` table**:
   - `membership_type` check: `'free' | 'premium' | 'gold'` (rename 'regular' → 'free')
3. **New `payment_settings` table** (singleton row):
   - `id UUID PK`, `qr_code_url TEXT`, `bank_name TEXT`, `account_name TEXT`, `account_number TEXT`, `bank_branch TEXT`, `transfer_instructions TEXT`, `updated_at TIMESTAMPTZ`, `updated_by UUID FK`
   - RLS: anyone authenticated can SELECT; only admins can INSERT/UPDATE

## Files Changed

### New Files
- `src/pages/admin/AdminMemberships.tsx` — payment management page with 3 tabs:
  - **Pending Payments** — table of pending requests, approve/reject with notes
  - **All Records** — complete payment history, filterable by plan/status
  - **Settings** — upload QR code + bank details form

### Modified Files
1. **`src/pages/MembershipPage.tsx`** — Redesign with 3 cards (Free / Premium / Gold); payment dialog with QR code + bank details + reference input; show current user's plan status
2. **`src/pages/UserDashboard.tsx`** — Update membership card to show Free/Premium/Gold; add payment history section showing past membership records
3. **`src/pages/admin/AdminDashboard.tsx`** — Add 3 new stat cards (Free/Premium/Gold counts) + payment revenue bar chart
4. **`src/pages/embassy/EmbassyOverview.tsx`** — Add membership tier KPI cards + tier breakdown pie chart
5. **`src/components/layout/AdminLayout.tsx`** — Add "Memberships" nav link with CreditCard icon
6. **`src/router.tsx`** — Add `/admin/memberships` route
