# Community Treasury & Fund Reconciliation Plan

## Concept: Community Fund Ledger
A double-entry-style financial ledger for the NIDO Vietnam community fund.
- **Income** flows in automatically when membership payments are approved
- **Expenses** are recorded manually by admins (welfare, events, admin costs)
- **Balance** = Total Income − Total Expenses, updated in real time

## Database: `fund_transactions` table
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `transaction_type` | TEXT | `'income'` or `'expense'` |
| `category` | TEXT | `'membership_payment'`, `'welfare_support'`, `'national_day_event'`, `'community_event'`, `'administrative'`, `'other'` |
| `amount` | NUMERIC(12,2) | Always positive |
| `currency` | TEXT | Default `'VND'` |
| `description` | TEXT | Human-readable description |
| `reference_id` | UUID | Links to `memberships.id` or `welfare_requests.id` |
| `reference_type` | TEXT | `'membership'`, `'welfare_request'`, `'manual'` |
| `created_by` | UUID FK | Admin who created it |
| `created_at` | TIMESTAMPTZ | |
| `notes` | TEXT | Optional admin notes |

RLS: Admins can manage all; Embassy staff can view.

## Auto-linking Income
When an admin **approves** a membership payment in `AdminMemberships.tsx`, the system automatically creates a `fund_transactions` income record linked to that membership.

## New Page: `AdminTreasury.tsx` (`/admin/treasury`)
Three tabs:
1. **Overview** — Balance summary card (Total Income / Total Expenses / Net Balance) + monthly bar chart + category breakdown pie
2. **Ledger** — Full transaction history table (income + expenses) with search, date filter, category filter
3. **Record Expense** — Form to add a new expense with: category, amount, description, optional welfare/event link, notes

## Modified Files
1. **`AdminMemberships.tsx`** — On `handleAction('approved')`, auto-insert income transaction to `fund_transactions`
2. **`AdminDashboard.tsx`** — Add treasury balance card (net balance in VND)
3. **`EmbassyOverview.tsx`** — Add fund balance KPI card
4. **`AdminLayout.tsx`** — Add "Treasury" nav link
5. **`router.tsx`** — Add `/admin/treasury` route
