# QR code invite on session page

## What we will build
Add a branded QR code of the session invite link directly on the session detail page, alongside the existing session stats, teams, and dues sections.

## Why
Organizers can show the QR code to people at the ground so they can scan and join the session without typing the invite link.

## Changes

### 1. Dependency
Install a lightweight QR-code library that works in the browser (e.g. `react-qr-code`).

### 2. Component
Create a small client component `src/components/qr-invite.tsx` that:
- Accepts the invite URL string
- Renders a QR code using the app’s primary color (`#3B82F6`) on a white/light background
- Shows a small label under it like “Scan to join”
- Falls back gracefully if no URL is available

### 3. Session page integration
In `src/routes/_authenticated/sessions.$sessionId.tsx`:
- Place the QR code component inside the top stats card (or directly below it) so it sits with the session details, not in a separate modal.
- Reuse the existing invite URL already used by the copy-invite button.
- Keep the existing “Invite” button for copying the link.

## Visual placement
The QR code will appear in a centered card near the top of the session page, between the session title/stats and the Teams section. On mobile it will stack cleanly; on desktop it will sit in the right column of a two-column stats area if the layout supports it, otherwise full-width above teams.

## Technical notes
- The session detail route is already client-only (`ssr: false`), so QR generation can run in the browser without SSR concerns.
- No database changes are needed; the invite link is already computed from `sessionId`.
- No existing data is affected.
