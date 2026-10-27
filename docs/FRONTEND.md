# Frontend

React 19 SPA in `front/`, built with Vite 7, styled with Tailwind CSS v4. JavaScript (`.jsx`) with TypeScript where
types pay off (`utils/*.ts`, `types/api.ts`); `tsconfig.json` has `allowJs`.

## Boot sequence

`index.html` → `public/theme-init.js` (sets `data-theme` before first paint, no flash) → `src/main.jsx`:

```
installErrorReporting()                         lib/monitoring.js
<ErrorBoundary>                                 outermost; plain-link fallback
  <ThemeProvider>                               theme/ — light | dark | system, localStorage "peerprep-theme"
    <QueryClientProvider client={queryClient}>  lib/queryClient.js — staleTime 60 s, no retry on 4xx
      <BrowserRouter>
        <AuthProvider>                          features/auth/AuthContext.jsx — token, user, login, logout
          <ToastProvider>                       components/ui/ToastProvider.jsx — useToast()
            <App/>                              shell + routes
```

`App.jsx` renders: skip link, `Navbar`, `<main key={pathname}>` (fade-in per page) containing
`<ErrorBoundary key={pathname}><Suspense><Routes/></Suspense></ErrorBoundary>`, then `Footer` (hidden on phones when
signed in) and `MobileTabBar` (signed in, below `md`). Whiteboard routes are full-screen (no footer or tab bar).

## Routes (all lazy-loaded)

| Path | Page | Access |
|---|---|---|
| `/` | `Home` → `Dashboard` (signed in) or `Landing` | public |
| `/events` | `Events` (filters in the URL: `q`, `exam`, `location`, `status`, `when`, `scope=mine`) | public; "mine" when signed in |
| `/events/create` | `CreateEvent` | redirects to `/login` if signed out |
| `/events/:id` | `EventDetail` (summary, members, chat, materials) | signed in |
| `/events/:id/edit` | `EditEvent` | owner, before start |
| `/events/:id/whiteboard` | `Whiteboard` | members |
| `/focus` | `Focus` (focus timer, today's plan, focus week) | public; data is per browser (per account or "guest") |
| `/profile`, `/profile/:userId` | `Profile` (own: edit, appearance, recent sessions, delete account) | own needs sign-in |
| `/login`, `/register` | `features/auth/LoginForm`, `RegisterForm` (in `AuthLayout`) | public |
| `/about` | `About` (founder + contribute) | public |
| `/privacy`, `/terms`, `/contact` | legal pages (`features/legal/LegalPage`) | public |
| `*` | `NotFound` | public |

Pages that need sign-in redirect to `/login` in an effect once `isLoading` is false (there is no route-guard
component). Every page calls `usePageTitle("…")` (`hooks/usePageTitle.js`) → `"<title> · PeerPrep"`.

## Data layer

- **`utils/api.ts`**: the only place that does HTTP. An axios instance with `baseURL = VITE_API_BASE_URL + "/api"`.
  A request interceptor attaches `localStorage.access_token`. A response interceptor fires `auth:session-expired` on
  401 for signed-in, non-auth calls. It exports one function per endpoint (`listEvents`, `createEvent`, `joinEvent`,
  `getEventMessages`, ...). `getErrorMessage(err, fallback)` (`utils/errors.ts`) turns any error into a user-facing
  string.
- **`types/api.ts`**: payload shapes (`User` = self with email; `PublicUser`/`PublicProfile`/`Member` = others,
  without email; `PeerEvent`, `ChatMessage`, ...).
- **Hooks (React Query)**:
  - `hooks/useEvents.js`: `eventKeys`, `useEvents`, `useEvent`, `useMyEvents`, `useMyEventsCount`,
    `usePrefetchEvents`, `useCreate/Update/DeleteEvent`, `useJoin/LeaveEvent` (optimistic, patch every cached copy).
  - `hooks/useEventData.js`: `eventDataKeys`, attendees, messages, presence, post/delete message.
  - `hooks/useProfile.js`: `profileKeys`, `useUserProfile`, `useUserBadge`, `usePrefetchProfile`, `useUpdateProfile`,
    `useAwardPastEventsXP`.
  - `hooks/useEventChat.js`: the chat socket; see [REALTIME.md](REALTIME.md).
- **Auth**: `useAuth()` from `features/auth/authContextValue.js` → `{token, user, isAuthenticated, isLoading, login,
  logout, setUser}`. The context provider is in `AuthContext.jsx`. They're split for react-refresh.
- **Sockets**: `utils/socket.ts` → `openSocket(path, token)`; never put the token in the URL.
- **Dates**: `utils/dates.ts` → `parseUTCDate`, `getEventTiming` (`isOngoing/isPast/hasStarted`), `formatEventWhen`,
  `formatEventDay`, `formatLongDate`, `formatClockTime`, `formatRelativeTime`, `sortByStart`, `formatDuration`,
  `describeEventTiming` ("Starts in 3h 20m" / "Ends in 40m"). `hooks/useNow.js` re-renders on an interval and when the
  tab becomes visible again.
- **Calendar**: `utils/calendar.ts` → `eventToIcs` builds an `.ics` (UTC, 30-min reminder) in the browser for "Add to
  calendar"; nothing is sent anywhere.
- **Files**: `utils/files.js` → `readAsDataUrl`, `formatFileSize`, `fileIcon`. Limits are enforced in the pickers
  (cover/photo 5 MB, material 10 MB) and again on the server.
- **Browser storage** (documented in the Privacy Policy, so update it when this changes): `access_token`,
  `peerprep-theme`, `peerprep-onboarding:<userId>:<name>`, `peerprep-focus:<userId|guest>`, session `auth_notice`,
  session `peerprep-chunk-reload`.
- **Study materials** arrive only on `GET /events/{id}` for members (lists and non-members get `null` plus
  `materials_count`). Don't build UI that expects them on list items.

## Feature folders

| Folder | Contents |
|---|---|
| `features/auth` | `AuthContext`, `authContextValue`, `AuthLayout` (notebook-page side panel), `LoginForm` (resend verification on 403), `RegisterForm` (strength meter, terms notice), `PasswordInput`, `AuthNotice` |
| `features/events` | `EventCard` (index card, join/leave, owner menu), `EventCover` (image or typographic "notebook" cover), `SeatTicks`, `EventList` (grid + skeleton), `SessionRow` |
| `features/events/detail` | `EventSummary` (header, lifecycle status line, add to calendar, share, timetable facts, actions), `MembersList`, `ChatPanel`, `StudyMaterials` (only `data:` links rendered; non-members see a count) |
| `features/events/form` | `EventForm` (create/edit), `CoverPicker` (upload or AI), `MaterialsPicker`, `eventFormModel.js` (+ tests) |
| `features/home` | `Landing` (centered hero with real upcoming count, photo cards, chapters, `DoodlePad`, upcoming sessions), `Dashboard`, `HeroPhotos` (floating cards on `xl`, a cropped strip below; photos in `src/images/landing/`, re-encoded WebP without metadata), `Reveal` (fade-up when scrolled into view), `motion.js` (`useParallax`: one shared passive scroll listener, transforms only; `useRevealed`). Both effects are off under `prefers-reduced-motion` |
| `features/onboarding` | `OnboardingChecklist`, `onboardingStorage` (steps: profile, first session, first focus block, whiteboard) |
| `features/focus` | `focusTimerModel.js` (pure timer/log logic, + tests), `focusStore.js` (external store in `localStorage`, cross-tab), `useFocus`/`useFocusClock`, `FocusTimer` (+ `FocusTimerCompact`), `TaskList`, `FocusWeek`, `FocusSettingsDialog`, `FocusWatcher` (in `App`, completes phases anywhere), `FocusPill` (navbar), `chime.js` (Web Audio) |
| `features/profile` | `LevelCard`, `BadgeLadder`, `badgeLevels.js` (+ tests, mirrors the backend), `EditProfileDialog`, `AppearanceCard` |
| `features/whiteboard` | `elements.js` (geometry, hit-testing, canvas drawing, + tests), `tools.jsx`, `WhiteboardToolbar`, `useWhiteboardSocket` |
| `features/legal` | `LegalPage` (layout, `Pending`, `MailLink`, `ExternalLink`), `legalInfo.js` (operator facts, processors), `legalFormat.js` |

## Design system: "the study notebook"

Identity: warm paper, ink, a highlighter yellow, ruled lines, a red margin line, italic serif accents and
monospace labels. Calm motion, no gradients, no emoji.

**Fonts** (self-hosted via `@fontsource`, imported in `main.jsx`): Geist Variable (sans, display), Geist Mono
Variable (`.label`, numbers), Instrument Serif italic (`.serif` accents).

**Tokens** (`src/index.css`). Values are defined on `:root` (light) and `[data-theme="dark"]`, then mapped to
Tailwind colors in `@theme inline`. Always use these names:

`canvas` (page) · `surface`, `surface-2`, `surface-3` (panels, raised to sunken) · `line`, `line-strong` (borders) ·
`fg`, `fg-muted`, `fg-subtle` (text) · `accent`, `accent-hover`, `accent-fg`, `accent-soft` (ink buttons) ·
`accent-text` (links, blue) · `highlight` (marker yellow) · `aqua`, `volt`, `success`, `warning`, `danger`
(+ `-soft`, `danger-solid`).

Light: canvas `#F7F6F2`, ink `#141413`, link `#2B45E0`, highlight `#E8F95A`. Dark: canvas `#0F0F0E`, fg `#EEEDE8`.
Every text/background pairing passes WCAG AA (4.5:1) in both themes; re-check if you change a value.

**Utilities** (`@layer components`): `.page-container` (max 72 rem, safe-area padding), `.serif`, `.mark`
(highlighter behind text; the text stays ink in both themes), `.label` (mono 11 px uppercase), `.ruled` (notebook
lines), `.card-hover` (calm hover: border firms up and a soft shadow fades in, no movement; press-scale on touch),
`.legal-prose` (long-form text, scrollable tables).

**UI kit** (`components/ui/`):

| Component | Key props |
|---|---|
| `Button` | `variant` primary/secondary/soft/ghost/highlight/danger/danger-soft, `size` sm/md/lg, `loading`, `as` (e.g. `Link`) |
| `IconButton` | `icon`, `label` (required, aria), `size`, `variant` |
| `Card` | `tone` default/success/danger, `padded`, `interactive` (adds `.card-hover`), `as` |
| `Badge` | `tone` neutral/accent/highlight/success/volt/aqua/warning/danger, `dot` |
| `Field` + `Input`/`Textarea`/`Select` | `label`, `hint`, `error`, `required`/`optional`, `counter` |
| `Dialog` | focus trap, Esc, scroll lock; bottom sheet on phones |
| `ConfirmDialog` | destructive confirmation with `busy` |
| `Menu`, `MenuItem`, `MenuRadioItem`, `MenuLabel`, `MenuSeparator` | keyboard-accessible dropdown |
| `SegmentedControl`, `Avatar` (initials fallback), `PageHeader` | |
| `Feedback`: `Spinner`, `Skeleton`, `PageLoader`, `EmptyState` | |
| `useToast()` | `.success(msg)`, `.error(msg)` |

Shared class builders (non-component files for react-refresh): `buttonStyles.js` (`buttonClasses`), `fieldStyles.js`
(`controlClasses`).

**Responsive / mobile**:
- Designed for widths from 320 px to 1440 px+.
- Below `md`, signed-in users get a bottom tab bar (Home, Events, Create, Focus, Profile).
- Inputs are 16 px on phones so iOS doesn't zoom; touch targets grow via `pointer-coarse:`.
- Safe-area insets are respected, `body` clips horizontal overflow, and dialogs become bottom sheets.
- A PWA manifest is included (`public/manifest.webmanifest`).
- Single-column grids must say `grid-cols-1` explicitly, or the widest child can force overflow.

**Accessibility**: skip link, landmarks, `aria-current` in navigation, labelled icon buttons, a visible
`:focus-visible` ring, `prefers-reduced-motion` respected, `sr-only` "(opens in a new tab)" on external links.

## Focus timer

- Time comes from timestamps, never from counting ticks: a running timer stores `endsAt` (epoch ms) and the remaining
  time is `endsAt - now`, so background tabs, throttled timers and sleep don't make it drift. A paused timer stores
  `remainingMs`.
- `FocusWatcher` (mounted once in `App`) checks every 500 ms while running and when the tab regains focus, completes the
  phase, logs finished focus blocks by local day (14 days kept), plays the chime and shows a toast. With auto-start, the
  next phase starts when the end is noticed, not when it happened.
- Completing re-reads `localStorage` first, so two open tabs don't log the same block twice; other tabs pick up changes
  through the `storage` event.
- Personal only: not shared with the group, not sent to the API, not counted toward XP. Deleting the account clears it
  in that browser.

## Cold starts (free hosting)

The Render API sleeps after ~15 idle minutes and takes up to a minute to wake.
- `main.jsx` calls `warmUpServer()` (`GET /health/ready`, marked `background`) so the API and database start waking
  while the page renders.
- `lib/serverStatus.js`, fed by the axios interceptors: a request counts as a cold start if the server hasn't answered
  for 10 minutes; if it then takes over 2.5 s, `waking` turns on. Any response turns it off; network errors and
  warm-server slowness (e.g. uploads) never trigger it. Tests in `lib/serverStatus.test.js`.
- `PageLoader` shows `WakeUpPanel` (explanation, elapsed seconds, rotating study tips from `ui/studyTips.js`, a reload
  hint after 75 s); `ServerWakeNotice` shows a compact, dismissible card on pages that use skeletons instead.

## Error handling

- `components/ErrorBoundary.jsx`: friendly fallback ("This page hit a snag"). After a deploy it detects stale lazy
  chunks and reloads once, at most once every 10 s.
- `lib/monitoring.js`: `reportError(error, context)` + global `error`/`unhandledrejection` listeners. This is the place
  to plug in Sentry or similar. Never include tokens or message text in `context`.
- API failures surface through `getErrorMessage` → toast or inline error. Loading and empty states use `Skeleton`,
  `PageLoader` and `EmptyState`.

## Tests

Vitest: `utils/dates.test.ts`, `utils/errors.test.ts`, `utils/calendar.test.ts`, `features/events/form/eventFormModel.test.js`,
`features/profile/badgeLevels.test.js`, `features/whiteboard/elements.test.js`, `features/focus/focusTimerModel.test.js`.
Run `npm test`.
