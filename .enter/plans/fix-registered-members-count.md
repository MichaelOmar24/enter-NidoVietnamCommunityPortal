# Fix: Home page "Registered/Active Members" count is wrong

## Context
The home page (`src/pages/HomePage.tsx`) shows "Registered Members" and "Active Members"
stat cards that are way lower than the real numbers in the database (or show 0 for
logged-out visitors). Admin Dashboard and Embassy Overview show the correct numbers
for the same data.

## Root cause (confirmed)
The `profiles` table has Row Level Security enabled with only these SELECT policies
(`supabase/migrations/migration_20260704_073604000`, `..._102559000`, `..._110015000`):
- a user can see **their own** row (`auth.uid() = id`)
- an **admin** can see all rows (`is_current_user_admin()`)
- **embassy staff** can see all rows (`is_current_user_embassy_staff()`)

There is **no policy allowing the public/anon role (or a regular logged-in member) to
count/read all rows**. Verified directly against the DB:
- `select count(*) from profiles` as service/admin → **8** total, **6** active.
- Same query via the anon REST API (what `HomePage.tsx` uses) → **`content-range: */0`**
  (RLS silently reduces the result set to 0 rows for anon).

`HomePage.tsx` (lines 52-59) queries `profiles` directly with the public anon client:
```ts
supabase.from('profiles').select('*', { count: 'exact', head: true }),
supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('membership_status', 'active'),
```
Because the home page is public, this request runs as `anon` (or as a regular non-admin
member), so RLS filters it down to 0 (or 1, their own row) instead of the true total.

`AdminDashboard.tsx` and `EmbassyOverview.tsx` run the **exact same query/filter**
(`membership_status = 'active'` for active, no filter for total) but they only render
for admins/embassy staff, whose session satisfies the RLS policy — so they correctly
see the true counts (8 total / 6 active). The logic is already consistent; the bug is
purely an RLS visibility gap for the public page.

## Fix approach
Do **not** loosen the `profiles` RLS policy to expose all member PII (names, emails,
phone, DOB, address, etc.) to the public. Instead, add a narrow `SECURITY DEFINER`
RPC that returns only the two aggregate counts, bypassing RLS safely (same pattern
already used in this project for `is_current_user_admin()` / `is_current_user_embassy_staff()`
in `migration_20260706_001021000`).

1. **New migration** — add a `public.get_member_stats()` function:
   ```sql
   CREATE OR REPLACE FUNCTION public.get_member_stats()
   RETURNS TABLE(total_members bigint, active_members bigint)
   LANGUAGE sql
   STABLE
   SECURITY DEFINER
   SET search_path = public
   AS $$
     SELECT
       (SELECT count(*) FROM public.profiles) AS total_members,
       (SELECT count(*) FROM public.profiles WHERE membership_status = 'active') AS active_members;
   $$;

   GRANT EXECUTE ON FUNCTION public.get_member_stats() TO anon, authenticated;
   ```
   This uses the identical source of truth (`profiles` table, `membership_status = 'active'`
   filter) already used by Admin Dashboard and Embassy Overview — satisfying requirement 3.

2. **Update `src/pages/HomePage.tsx`** (`fetchStats`, lines 52-60): replace the two direct
   `profiles` count queries with a single call to the new RPC:
   ```ts
   const [{ data: memberStats }, { count: companies }, { count: acts }] = await Promise.all([
     supabase.rpc('get_member_stats'),
     supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_approved', true),
     supabase.from('activities').select('*', { count: 'exact', head: true }).eq('is_published', true),
   ]);
   const stats = Array.isArray(memberStats) ? memberStats[0] : memberStats;
   setStats({
     totalMembers: stats?.total_members || 0,
     activeMembers: stats?.active_members || 0,
     companies: companies || 0,
     activities: acts || 0,
   });
   ```
   Companies/activities queries are untouched — they already have public RLS policies
   (`is_approved = true`, `is_published = true`) and return correct values.

3. No changes needed to `AdminDashboard.tsx` or `EmbassyOverview.tsx` — they already
   compute the correct numbers from the same table/filter; they're the reference
   "source of truth" this fix aligns the home page with.

## Files touched
- New migration file (via `supabase_migration` tool)
- `src/pages/HomePage.tsx` (`fetchStats` function only)
- `src/integrations/supabase/types.ts` will auto-regenerate with the new RPC signature (not edited manually)

## Verification
1. Run the migration, confirm `select public.get_member_stats();` returns `(8, 6)` (or current live totals) via both anon and authenticated calls.
2. Load the public home page (logged out) and confirm "Registered Members" = total row count in `profiles`, "Active Members" = count where `membership_status = 'active'`.
3. Cross-check the same two numbers against Admin Dashboard ("Total Members" / "Active Members") and Embassy Overview ("Total Members" / "Active Members") — all three should match exactly.
4. Confirm no member PII is exposed to anon (only the two integer counts are returned).
