# Missing / Detained Person information requests (case-report module)

## Context

NIDO Vietnam's case module (`case_reports`, `/report-case`) covers disputes against a person or organisation. It has no way to handle a different and urgent class of case: a **family member or friend asking NIDO to help locate or verify information about a Nigerian who has disappeared, lost contact, or may be detained, arrested or in custody in Vietnam**.

Today such a request has nowhere to go — the closest option is a generic "Other" dispute, which loses all the information NIDO needs to actually verify anything (last known address, dates, detaining authority, who is asking and from where).

Crucially, the people filing these requests are usually **family in Nigeria, not members in Vietnam**. The form must therefore make sense for someone sitting in Lagos describing a relative abroad, and must collect enough detail for NIDO/community representatives to verify information and, when the requester asks for it, follow up with the Nigerian Embassy/Consular authority in Vietnam.

## Decisions (confirmed)

- **Members-only submission** — the page sits behind `ProtectedRoute` (login required).
- **NIDO reviews first; manual embassy forward** — nothing is auto-sent. Admins get a one-click "Forward to Embassy" action, exactly like the existing case reports.
- **Dedicated page + a "Missing Persons" tab** inside the existing admin and consular-desk case consoles (no new console, no new sidebar route).

## Data model — new table `missing_person_requests`

A separate, stably named table (not new columns on `case_reports`): different purpose, different field set, no risk to existing case data. RLS enabled in the same migration that creates it.

Key columns:

| Group | Columns |
|---|---|
| Requester | `requester_user_id` (FK `profiles.id`, ON DELETE SET NULL), `requester_name`, `requester_email`, `requester_phone`, `requester_relationship` (parent / sibling / spouse / child / relative / friend / colleague / other), `requester_country` (default `Nigeria`), `requester_location` (e.g. "Lagos, Nigeria") |
| Missing person | `missing_full_name`, `missing_aliases`, `missing_gender`, `missing_date_of_birth`, `missing_age`, `missing_nigerian_state_of_origin`, `missing_passport_number`, `missing_phone`, `missing_email` |
| Last known in Vietnam | `missing_last_known_address`, `missing_vietnam_city`, `missing_employer`, `last_contact_date`, `last_contact_details` |
| What happened | `request_type` CHECK in (`disappeared`, `lost_contact`, `detained_or_arrested`, `taken_to_prison`, `believed_in_custody`, `whereabouts_verification`), `incident_date`, `custody_details`, `circumstances` (NOT NULL), `prior_actions` |
| Requested help | `assistance_requested` CHECK in (`verify_only`, `follow_up_embassy`, `both`), `consent_to_share` boolean default false, `evidence_urls text[]` |
| Workflow | `status` CHECK in (`pending`, `under_review`, `verifying`, `forwarded_to_embassy`, `information_provided`, `closed`) default `pending`, `admin_notes`, `embassy_forwarded_at`, `reviewed_by`, `created_at`, `updated_at` |

Indexes: `requester_user_id`, `status`, `created_at desc`.

RLS policies (helpers already exist in the DB: `public.is_current_user_admin()` covers admin **and** super-admin; `public.is_current_user_embassy_staff()`):

- INSERT — `auth.uid() = requester_user_id` (members only)
- SELECT own — `requester_user_id = auth.uid()`
- ALL (admin) — `public.is_current_user_admin()`
- SELECT + UPDATE (consular desk) — `public.is_current_user_embassy_staff()`

Files: new `supabase/migrations/migration_20260924_<ts>_missing_person_requests`, applied with the migration tool and committed to the repo. Generated `src/integrations/supabase/types.ts` is **not** hand-edited; confirm the new table appears in the regenerated types before finishing, otherwise TS queries will not compile.

## Backend function

Extend the existing `supabase/functions/notify-embassy-case/index.ts` (reuses its SMTP transport, `esc()` escaping and letterhead — no new function, no new secret):

- Accept `missing_person_request_id` alongside `case_report_id` / `welfare_request_id`.
- Load the row, then email `contact-us@nigeriaembassy.org.vn` a consular letter: requester identity + relationship + location, missing person's identity and documents, last known address/city/employer in Vietnam, last contact date, incident type, custody details, circumstances, prior actions, assistance requested, consent, evidence links, reference id and date filed.
- Only send when `consent_to_share = true`, unless `force === true` (explicit admin action) — matching the existing immigration-case guard.
- On success the console sets `status = 'forwarded_to_embassy'` and `embassy_forwarded_at = now()`.

## Frontend

**New `src/lib/missingPerson.ts`** — single source of truth shared by the form and both consoles: `MissingPersonRequest` interface, `REQUEST_TYPES`, `RELATIONSHIPS`, `ASSISTANCE_OPTIONS`, `STATUS_CONFIG` (label + token classes + lucide icon), `requestTypeLabel()`, `formatReference()` (`NIDO-MP-<short id>`).

**New `src/pages/RequestMissingPersonPage.tsx`** — route `/report-missing-person`, `<ProtectedRoute>`, `Navbar`/`Footer`, gradient hero + amber notice bar, mirroring `ReportCasePage`'s card language (`Card`, `Label`, `Input`, `Textarea`, `Select`, `Badge`, `gradient-primary` button). Sections:

1. **About you (the requester)** — prefilled name/email/phone from `profile`; relationship to the missing person; *your current country* (default Nigeria) and city/state, with the helper line "Many requests come from family in Nigeria — tell us where you are so we can reach you at the right times."
2. **About the missing person** — name, other names used, gender, DOB, age, state of origin, passport number, phone, email.
3. **Last known information in Vietnam** — last known address, city, employer/institution, last contact date, how the last contact happened.
4. **What happened** — request type (the six situations), incident/last-seen date, custody details field that appears only for the detention/arrest/prison/custody types, detailed circumstances, prior actions already taken (police, embassy, NIDO).
5. **How we can help** — assistance requested (`verify_only` / `follow_up_embassy` / `both`), consent-to-share checkbox (required when embassy follow-up is requested), supporting documents (reuse the `uploads` bucket + `AttachmentPicker`/file-list pattern from `ReportCasePage`, under a `missing-person/` prefix).
6. **Submit** → success screen with reference code, "What happens next" steps and direct contacts.
7. **Your requests** — compact list of the member's own submissions with status badges (status only; internal `admin_notes` are never shown to the requester).

**New `src/components/common/MissingPersonRequestsPanel.tsx`** — one component used by both consoles, props `{ canForward: boolean; canDelete: boolean }`: status-filter tabs (active / forwarded / closed), request cards (missing person name, request-type badge, requester + location, date, status, consent flag, evidence count), a review dialog with all fields, admin-notes box, status buttons, "Forward to Embassy" (confirm → invoke function) and "Delete" (admin only).

**Edits**

- `src/router.tsx` — add `/report-missing-person` above the catch-all, wrapped in `<ProtectedRoute>`.
- `src/pages/admin/AdminCaseReports.tsx` — top tab switcher "Case Reports | Missing Persons"; renders the panel with `canForward canDelete`.
- `src/pages/embassy/EmbassyCaseReports.tsx` — same switcher; panel with status updates only.
- `src/components/layout/Navbar.tsx` — "Missing Person Request" in the desktop account dropdown and the mobile "My Account" list, next to "Report a Case / Dispute".
- `src/components/layout/Footer.tsx` — link beside "Report a Case / Dispute".
- `src/pages/ReportCasePage.tsx` — banner above the form (mirroring the existing anonymous-report banner) pointing missing/detained cases to the new page, so nobody files them as a dispute.
- Analytics: register `missing_person_request_submitted` and track it on successful submit, following the existing `trackEvent` pattern.

**Reused, not modified:** `ProtectedRoute`, `useAuth`, `supabase` client, `useToast`, `AdminLayout`/`EmbassyLayout`, existing `Card`/`Dialog`/`Badge`/`Select`/`Textarea`/`Input` components, `uploads` storage bucket, design tokens (`gradient-primary`, `shadow-green`, `gradient-hero`, `bg-card`, `border-border`, `text-muted-foreground`, gold/destructive tokens), lucide icons only.

## Verification

- `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm run build` all clean.
- Migration check via read query: table exists, `relrowsecurity = true`, and the four policy groups are present in `pg_policies`.
- Signed-out visit to `/report-missing-person` redirects to `/login`; signed-in member sees the form.
- Submit with missing required fields → blocked with a clear message; with `follow_up_embassy` and consent unticked → blocked; happy path → row inserted with `status = 'pending'`, reference code shown, and the row appears in the member's own list.
- Admin console: "Missing Persons" tab lists the new request; status change persists; "Forward to Embassy" sends the email (verify via function logs) and flips status to `forwarded_to_embassy`.
- Consular desk: sees the request, can update status and notes, has no delete/forward controls.
- `/report-case` still works exactly as before (existing case list, submission, embassy auto-forward for immigration cases).
- Screenshots of `/report-missing-person` at `mobile_390` and `desktop_1280`.

## Implementation checklist

- [x] Migration applies: `missing_person_requests` created with all columns, CHECK constraints, indexes, RLS enabled (`relrowsecurity = true`), and the five policies (own insert/select, admin all, embassy select/update).
- [x] Migration file committed to `supabase/migrations/migration_20260924_090000000` with the same SQL.
- [x] Regenerated `src/integrations/supabase/types.ts` includes `missing_person_requests` (verified, not hand-edited).
- [x] `src/lib/missingPerson.ts` exports the interface, option lists, `STATUS_CONFIG`, `requestTypeLabel`, `formatReference`.
- [x] `/report-missing-person` route added behind `ProtectedRoute` and renders `RequestMissingPersonPage`.
- [x] Form validates required fields, requires consent for `follow_up_embassy`/`both`, and shows custody fields only for the three detention/custody request types.
- [x] Submit inserts with `requester_user_id = profile.id`, `status = 'pending'`, uploads land under `missing-person/` in the `uploads` bucket, and the success screen shows the reference code.
- [x] Member's own list selects only id/name/type/status/dates — `admin_notes` is never fetched, so it cannot be shown to the requester.
- [x] `MissingPersonRequestsPanel` renders in both consoles: admin gets `canForward canDelete`, consular desk gets neither.
- [x] `notify-embassy-case` accepts `missing_person_request_id`, requires `consent_to_share` (or `force`), and its existing `case_report_id` / `welfare_request_id` paths are unchanged.
- [x] Forward action sets `status = 'forwarded_to_embassy'` and `embassy_forwarded_at` in code.
- [x] Navbar (desktop dropdown + mobile list), Footer and the `/report-case` banner all link to the new page.
- [x] `missing_person_request_submitted` registered and tracked on submit.

## Verification checklist

- [x] `pnpm lint` passes with 0 errors (7 pre-existing `exhaustive-deps` warnings, unrelated files).
- [x] `pnpm exec tsc --noEmit` passes.
- [x] `pnpm run build` succeeds.
- [x] Read query confirms RLS is enabled on `missing_person_requests` and all five policies exist with scoped `qual`/`with_check`.
- [x] Anonymous `POST /rest/v1/missing_person_requests` is rejected: `42501 new row violates row-level security policy` (members-only enforced in the database, not just the UI).
- [x] Backend branch: `{"missing_person_request_id": "<unknown uuid>"}` → `404 Missing person request not found` (new code path live, no email sent).
- [x] Backend regression: `{}` → `400 case_report_id, welfare_request_id or missing_person_request_id is required`; bogus `case_report_id` → `404 Case report not found`.
- [x] Latest preview console log shows `[vite] connected` with no user-code runtime errors.
- [ ] Not verified live (no member/console session available in this environment): signed-out redirect, the filled form, the consent and custody boundary behaviour in the browser, a real member insert end-to-end, and the admin/embassy review + forward actions. Static evidence only: typecheck/build plus the RLS and function checks above.
- [ ] `website_screenshot` of `/report-missing-person` was not taken — the route is auth-gated, so an unauthenticated capture would only render `/login`. Responsive layout is therefore unverified rather than confirmed.


## Notes / limitations

- Members-only was chosen, but registration currently **requires a city in Vietnam** (`RegisterPage` validates `vietnam_city`), so a relative sitting in Lagos cannot register to file this. If that matters, the follow-up is either to relax registration for non-residents or to expose this form publicly (like `/report-anonymous`) with the requester details captured in the row — say which and I'll adjust.
- The form is a request for NIDO's assistance, not an emergency channel: the page will state that NIDO cannot act as police or a tracing agency, and that serious cases must also be reported to local police and the Nigerian Embassy/Consular authority.
- The new table is separate from `case_reports`; existing case data, policies and console behaviour are left untouched.
