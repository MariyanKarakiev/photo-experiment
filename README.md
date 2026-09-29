# photo experiment

A small, invite-only photo-choice study. Nine black-and-white portraits, one
flow: look → choose (up to three) → say why → see the photographer's
arrangement. Submissions land in Vercel Blob and are browsable through the
built-in `/admin` dashboard; every submission also mirrors to email via
Web3Forms (optional).

## quick start (local)

```bash
cp .env.example .env         # set ADMIN_PASSWORD (and optional keys)
npm install
npm run dev                  # http://127.0.0.1:4321
```

Without a Vercel Blob token, submissions are written to
`.local-data/submissions/*.json` — the admin dashboard reads them from
there so you can test the whole flow offline.

Visit `/admin` (password from `.env`) to see submissions.

## deploy (vercel)

1. Push the repo to GitHub / GitLab / Bitbucket.
2. Import it in Vercel. Framework auto-detects as **Astro** with the
   Vercel serverless adapter.
3. In the project dashboard:
   - **Storage → Blob → Create**. Vercel will inject
     `BLOB_READ_WRITE_TOKEN` into the deployment automatically.
   - **Settings → Environment Variables**:
     - `ADMIN_PASSWORD` — any string; required to view `/admin`.
     - `ADMIN_COOKIE_SECRET` — long random string.
     - `WEB3FORMS_KEY` — optional, enables email mirror.
4. `git push` → live.

## configure

Edit `src/config/photos.js`:

- `PHOTOS` — the nine images, in the order they appear on the initial
  grid.
- `PHOTOGRAPHER_PICK` — array of photo ids in the order shown on the
  reveal screen.
- `TITLE_LINES` / `TITLE_SUB` — copy for the opening title.
- `BRIEF_LINES` / `BRIEF_SUB` — copy for the pre-selection instructions.
- `TELEMETRY_VERSION` — bump when the telemetry payload shape changes.

Photos live in `public/photos/`. Replace the JPGs there to swap the
series.

## flow

1. **title** — tap or press Enter to advance.
2. **name** — required to continue.
3. **look** — adaptive grid; every tile tap is logged. Tapping a tile
   opens the swipe view starting on that photo.
4. **swipe (stage 1)** — full-screen photos, ← / → or swipe. `close`
   returns to the grid; the viewer can bounce grid ⇄ swipe freely.
5. **i'm ready** — appears once every photo has been viewed at least
   once. Available both under the grid and in the swipe view.
6. **brief** — a screen with the selection instruction. Tap / Enter to
   continue.
7. **choose (stage 2)** — full-screen swipe with a `select` /
   `selected` toggle in the top-right. Up to 3 picks.
8. **why** — one text field.
9. **submit** — POSTs to `/api/submit`; server writes to Blob (or local
   file) and optionally mirrors to Web3Forms email.
10. **reveal** — the photographer's arrangement.

Return visits (same device, same browser) land straight on the reveal.
The `start over` link in the bottom-right clears local state and
returns to the title.

## /admin dashboard

- `/admin/login` — password prompt.
- `/admin` — table of every submission, sortable by column. Aggregates
  strip at the top: total submissions, average seconds to first pick,
  9-bar chart of most-picked photos.
- Click **view** on any row to expand the full JSON payload.

## data payload (per submission)

Every submission is a JSON file. Key fields:

- `sessionId`, `submittedAt`, `device.type` (`mobile` / `tablet` /
  `desktop`), `viewport`, `userAgent`.
- `openerPhoto`, `tileClickEvents` (every grid tap in order).
- `finalPicksInOrder`, `whyExplanation`.
- `secondsPerScreen` — accumulated time per screen, in seconds:
  `browseAllPhotosGrid`, `browseAllPhotosSwipe`,
  `readInstructionsScreen`, `pickPhotosSwipe`,
  `writeExplanationScreen`, `totalFromStartToSubmit`.
- `secondsPerPhoto.duringFreeBrowse` / `.duringSelection` — seconds each
  photo was on screen, per stage.
- `secondsUntilFirstSelection`.
- `selectionEvents` — chronological pick / unpick events.

## admin auth

Stateless: `ADMIN_PASSWORD` env var is hashed with `ADMIN_COOKIE_SECRET`
via HMAC-SHA256; the hash is the httpOnly session cookie (`pe_admin`).
No sessions store, no users table.

## bundle size

Client JS: ~12 KB (~4 KB gzipped). No external analytics, no runtime
framework.
