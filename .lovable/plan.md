# Capora V1 — Launch-Ready Plan

This is a large scope. I'll deliver it in two phases so you can review progress and reprioritize. Each numbered item below is one shippable unit; I'll batch related items into single turns where it makes sense.

## Phase A — Must-have before launch

### A1. First-time onboarding wizards
- New route `/_authenticated/onboarding` (role-aware), shown automatically after first sign-in until completed.
- Investor steps: profile basics → sectors/countries interests → ticket range + risk → "see recommendations" handoff.
- Company steps: legal info → logo upload → first project draft → publish CTA.
- Progress bar, Skip on each step, persisted `onboarding_completed_at` on `profiles`.

### A2. Empty states everywhere
- Shared `<EmptyState icon title description ctaLabel ctaTo />` component.
- Apply on: projects list, favorites, messages tabs (pending/accepted/chats), recommendations, notifications, company project list, investor requests.

### A3. Search + filters on project discovery
- New `/proyectos` public-ish discovery page (or extend investor home): full-text search on title/description/company name + filters for sector, country, stage, investment range (min/max), investment type.
- Filters synced to URL search params (TanStack validateSearch + zod), restored on return.

### A4. In-app notifications
- New table `notifications (user_id, type, payload jsonb, read_at, created_at)` with RLS (owner only).
- DB triggers on `contact_requests` (insert/status change) and `messages` (insert) insert notifications for the recipient.
- Header bell icon with unread count badge, dropdown list, "mark all as read", click navigates to the relevant entity.

### A5. Account settings page
- `/_authenticated/ajustes`: change language, change password (Supabase `updateUser`), change display name, change email (with confirmation), delete account (links to A7).

### A6. Password recovery
- Public `/auth/recuperar` (request) + `/auth/restablecer` (set new password, handles `type=recovery` hash).
- "Forgot password?" link on `/auth`.

### A7. Legal pages + footer
- Public routes: `/privacidad`, `/terminos`, `/cookies`, `/contacto`. Static localized content using existing `legal.tsx` pattern.
- Footer with links visible on public + authenticated layouts.

### A8. Delete account
- Server fn `deleteMyAccount` (requireSupabaseAuth): archives owned projects (`status='archived'`), deletes favorites/conversations/messages/contact_requests/profiles rows the user owns, then calls Auth Admin `deleteUser` via `supabaseAdmin`.
- Confirmation modal requiring typing "ELIMINAR" / "DELETE".

## Phase B — High-value polish

- **B9 Autosave**: debounced autosave on project + profile forms, "Guardado" indicator.
- **B10 Share project**: copy-link button on project detail (public `/proyectos/$id` already exists), Web Share API on mobile.
- **B11 Profile completeness**: already partially present — extend to investor home and add to settings.
- **B12 Public profile pages**: `/empresa/$slug`, `/inversor/$slug` with safe-column projection only (name, logo/avatar, description, sectors/countries). Add `slug` column to profiles.
- **B13 Help center**: `/ayuda` with accordion FAQ (matching, contact, privacy, account).
- **B14 Mobile QA pass**: Playwright sweep at 390×844 and 412×915, fix safe-area, bottom-nav overlap, form scroll, image upload on mobile.

## Technical notes
- All new tables follow the GRANT → RLS → POLICY pattern. RLS scoped to `auth.uid()`.
- Notifications use a SECURITY DEFINER trigger function to insert across users.
- Onboarding state lives on `profiles.onboarding_completed_at` (nullable timestamptz) — no new table.
- Public profile slugs: unique citext column, generated from display/legal name on first save.
- All new UI strings added to `es.json` + `en.json`; Spanish remains default.
- No changes to auth provider config, matching logic, or storage buckets.

## Suggested execution order (one turn per group)
1. A6 + A7 (password recovery + legal + footer) — small, unblocks launch checklist.
2. A2 + shared EmptyState — small, improves every screen immediately.
3. A5 + A8 (settings + delete account) — one migration, one route.
4. A1 onboarding wizards — one route, two flows.
5. A4 notifications — migration + triggers + header bell.
6. A3 search/filters.
7. Phase B in a single polish pass, then mobile QA.

## Question before I start
Should I proceed straight through Phase A in the order above (≈6 turns), or do you want a different order — e.g. notifications + onboarding first because they're the most visible?
