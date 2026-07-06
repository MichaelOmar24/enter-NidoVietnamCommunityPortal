# Company Annual Listing Fee System

## What we're building
- Companies pay 1,000,000 VND/year to be listed in the directory
- Fee is configurable by admins (updateable anytime)
- Payments auto-post to the treasury (fund_transactions)
- Income summary visible in AdminCompanies + AdminDashboard

## 1. Database
### New table: `company_fee_config` (single row)
- `annual_fee_vnd` numeric DEFAULT 1,000,000
- `updated_by`, `updated_at`

### Extend `company_private_info` (add payment columns)
- `listing_fee_status` text ('unpaid' | 'paid' | 'expired')
- `listing_fee_amount_paid` numeric
- `listing_fee_paid_date` date
- `listing_fee_valid_until` date
- `listing_fund_transaction_id` uuid (FK → fund_transactions)

### Update check constraints on `fund_transactions`
- Add `'company_listing'` to category allowed values
- Add `'company'` to reference_type allowed values

## 2. AdminCompanies.tsx
### Fee Config banner (top of page)
- Shows current annual fee (e.g. "1,000,000 ₫/year")
- Edit button → inline input to update the fee
- Saving updates `company_fee_config` + shows toast

### Stats bar (extended)
- Add: "Listing Income" (sum from fund_transactions WHERE category='company_listing')
- Add: "Paid / Total" ratio

### Company cards (extended)
- Payment badge: "Paid ✓" (green), "Unpaid" (amber), "Expired" (red)
- "Record Payment" button → confirmation dialog
  - Shows: company name, fee amount, valid until (today + 1 year)
  - On confirm: 
    1. Upserts `company_private_info` payment fields
    2. Inserts `fund_transactions` (income, category='company_listing', amount=current_fee)
    3. Updates company card instantly

## 3. AdminDashboard.tsx
- Add "Listing Income" KPI card (query fund_transactions WHERE category='company_listing', type='income')

## Files changed
- `supabase/migrations/*` – new table + extended constraints + new columns
- `src/pages/admin/AdminCompanies.tsx` – fee config, payment recording, badges
- `src/pages/admin/AdminDashboard.tsx` – listing income stat card
