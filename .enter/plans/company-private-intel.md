# Company Private Intelligence & Trade Volume

## Scope
Add private financial/trade data and verifiable legal documents to companies —
visible only to admins and embassy staff, never to the public.

## 1. Database Migration
New table `company_private_info` (1-to-1 with `companies`):
- `company_id` (FK → companies, UNIQUE)
- `registration_number` – business registration number (text)
- `tax_code` – tax identification number (text)
- `annual_revenue_vnd` – annual trade volume (numeric)
- `monthly_revenue_vnd` – monthly average revenue (numeric)
- `trade_volume_notes` – free-text notes on trade activity
- `registration_doc_url` – uploaded registration certificate
- `tax_code_doc_url` – uploaded tax document
- `is_verified` – admin manually marks after reviewing docs (boolean)
- `verified_by`, `verified_at` – audit trail

RLS policies:
- Admins: full CRUD
- Embassy staff: SELECT only
- Public: no access

## 2. Edge Function: `upload-company-doc`
Accepts FormData (file + companyId + docType: 'registration'|'tax_code').
Uploads to CDN / Supabase Storage, returns public URL.

## 3. AdminCompanies.tsx — two-tab edit dialog
Tab 1 "Public Info" – existing fields (no change)
Tab 2 "Private Intel" – new fields:
  - Registration number + tax code (text inputs)
  - Annual revenue (VND) + monthly revenue (VND)
  - Trade volume notes (textarea)
  - Upload registration certificate (PDF/image)
  - Upload tax code document (PDF/image)
  - "Mark as Verified" toggle

Company cards get:
  - "Verified" / "Docs Pending" badge (admin only)
  - Annual revenue line (admin only)

Stats bar at top of AdminCompanies:
  - Total trade volume (sum annual revenues)
  - Verified companies count
  - Docs pending count

## 4. EmbassyOverview.tsx — Company Intelligence section
New collapsible section at bottom: "Company Trade Intelligence"
Table showing: Company name | Industry | Annual Revenue | Monthly Revenue | Registration# | Tax Code | Verified status
Data fetched via JOIN of companies + company_private_info (embassy-read allowed by RLS).

## Files Changed
- `supabase/migrations/*` – new table + policies
- `supabase/functions/upload-company-doc/index.ts` – new edge function
- `src/pages/admin/AdminCompanies.tsx` – two-tab dialog + stats + private data
- `src/pages/embassy/EmbassyOverview.tsx` – company intel section
- `src/lib/types.ts` – CompanyPrivateInfo type
