# Fix Gallery: broken images, duplicate album, and add edit capability

## Context
Reported issues (screenshots of `/gallery`):
1. Several photos inside the "NIDO Vietnam Inauguration Ceremony" album show broken-image icons (alt text "Gallery photo" / "Inauguration party" / "Inauguration Party").
2. No way to edit gallery content (only add/delete exists today).
3. The "NIDO Vietnam Inauguration Ceremony" album appears **twice** in the album grid (once as a "Featured" hardcoded card, once as the real DB album) — same duplicate also shows on the Home Page "Gallery Preview" section.

## Root causes (confirmed against live DB)
- **Broken images**: `AdminGallery.tsx` `uploadPhoto()` (lines 54-83) tries `supabase.storage.from('gallery-photos').upload(...)`. There is **no `gallery-photos` bucket** in storage (`storage.buckets` only has `passport-images`, `documents`, `uploads`, `memorial-documents`). Every upload fails and falls back to `URL.createObjectURL(photoFile)` — a **browser-local blob URL** that is saved into `gallery_photos.image_url`. Blob URLs never resolve outside the tab/session that created them, so they show as broken images forever. Live query confirms 4 of 5 `gallery_photos` rows have `image_url` starting with `blob:https://...preview.enterapp.pro/...`.
- **Duplicate album**: `GalleryPage.tsx` hardcodes a permanent "Inauguration" album card (lines 128-150, with a "Featured" badge) and a hardcoded "always shown" photo tile inside the album detail view (lines 79-95) — **in addition to** the real `gallery_albums` row (`NIDO Vietnam Inauguration Ceremony`, id `3cd35ad0-...`) that an admin already created with a real photo (`gallery_photos` row `b340d1dc-...`, pointing to the correct working `cdn.enter.pro` image). Same hardcoded duplicate tile also exists in `HomePage.tsx`'s "Gallery Preview" section (lines 410-420), which additionally pulls `gallery_photos` un-scoped (all albums, `.limit(6)`), so the real inauguration photo appears there too — duplicating it.
- **No edit UI**: `AdminGallery.tsx` only supports Create Album / Delete Album / Upload Photo / Delete Photo — no edit/rename/replace actions exist anywhere.

## Fix plan

### 1. Database migration (`supabase_migration`)
- Create the missing `gallery-photos` public storage bucket + RLS policies, mirroring the existing `uploads` bucket pattern (`migration_20260705_155306000`):
  - `INSERT INTO storage.buckets (...) VALUES ('gallery-photos', 'gallery-photos', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/jpg'])`
  - Policies: admin-only INSERT/UPDATE/DELETE (using `is_admin OR is_super_admin`, same pattern as `migration_20260705_163939000`), public SELECT.
- Data fix: set `gallery_albums.cover_image_url` for the existing Inauguration album (id `3cd35ad0-...`) to the real working photo URL (`https://cdn.enter.pro/resources/uid_100149613/8c7a13b1-1326-42.JPG`) since it's currently blank — this is the same image the hardcoded card was using, so the real DB album will look identical once the hardcoded duplicate is removed.

### 2. `src/pages/GalleryPage.tsx` (public gallery)
- Remove the hardcoded "Inauguration Album always shown" `<Card>` block (lines 128-150).
- Remove the hardcoded "Inauguration photos always shown" tile inside the album detail grid (lines 79-95).
- Update the empty-state copy from "No additional photos in this album yet." to "No photos in this album yet." (since the baseline hardcoded tile is gone).
- Result: only real `gallery_albums`/`gallery_photos` rows render — one album, one set of photos, no duplication.

### 3. `src/pages/HomePage.tsx` ("Gallery Preview" section)
- Remove the hardcoded first tile (lines 410-420, the duplicate inauguration image).
- Use `galleryPhotos.slice(0, 6)` (was hardcoded tile + `.slice(0, 5)`) so the grid is fully DB-driven with no duplicate.

### 4. `src/pages/admin/AdminGallery.tsx` (admin CRUD + new edit capability)
- **Fix upload reliability**: remove the blob-URL fallback in `uploadPhoto()`; if the real upload to `gallery-photos` fails, show an error toast and do not insert a broken row (bucket now exists so this becomes the true error path, not the default).
- **Add Edit Album**: new pencil-icon button next to "Delete Album" opens a dialog (reusing the existing Album dialog pattern) pre-filled with the selected album's title/description/event_date; Save runs `supabase.from('gallery_albums').update(...)`.
- **Add per-photo actions** (shown on hover, next to existing delete button):
  - **Edit** — opens a small dialog to update the caption and optionally replace the image file (re-uploads to `gallery-photos`, updates `image_url` + `caption` on the `gallery_photos` row). This lets the admin fix the 4 already-broken blob-URL photos in place without losing their captions.
  - **Set as Cover** — one-click action that sets `gallery_albums.cover_image_url` to that photo's `image_url` (no manual URL typing needed).

## Files touched
- New migration (bucket + RLS + one-time data fix)
- `src/pages/GalleryPage.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/admin/AdminGallery.tsx`

## Verification
1. In Admin > Gallery, upload a new photo — confirm the saved `image_url` is a real `cdn.enter.pro`/storage URL, not `blob:`.
2. Use the new "Edit" action on each of the 4 currently-broken photos to re-upload a real image; confirm they render correctly on `/gallery` and stop showing broken icons.
3. Visit `/gallery` — confirm the Inauguration album appears exactly once in the album grid, and its detail view shows only the real photos (no duplicate baseline tile).
4. Visit the Home Page — confirm the "Gallery Preview" section shows unique photos with no duplicate inauguration image.
5. Edit the album's title/description/date via the new Edit Album dialog and confirm changes persist and reflect on the public `/gallery` page.
6. Use "Set as Cover" on a photo and confirm the album's cover thumbnail updates on the public gallery grid.
