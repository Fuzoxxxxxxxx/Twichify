# Twichify/Spotify-Now-Playing - Project Analysis

_Dernière mise à jour : 05/10/2026 — alignée sur la version **3.11.0** du changelog (`src/lib/changelog.ts`)._

## Executive Summary

**Twichify** is a comprehensive Twitch streamer ecosystem platform that integrates Spotify music playback with multiple streaming overlays and chat management tools. Built with Next.js, React 19, TypeScript, and MongoDB, it provides real-time music widget display, chat overlays, chatbot integrations, a feature-request box with votes, a public changelog, and comprehensive admin/support infrastructure built on a six-level role and permission system.

**Primary Purpose**: Enable Twitch streamers to display currently playing Spotify tracks in OBS, manage chat with custom widgets, integrate with multiple chatbot platforms, and provide viewer support infrastructure.

---

## 1. Architecture Overview

### Technology Stack
- **Frontend**: React 19.2.3, Next.js 16.3.1, TypeScript 5, Tailwind CSS 4, Framer Motion (animations)
- **Backend**: Next.js API Routes, Node.js 20+
- **Database**: MongoDB with Mongoose 9.2.1
- **Authentication**: NextAuth 4.24.7 (Twitch OAuth), MongoDB Adapter
- **External APIs**: Spotify API, Twitch API (OAuth + badges), ChatBot APIs (Wizebot, Nightbot, StreamElements), third-party emotes (BTTV, 7TV, FFZ)
- **UI Libraries**: lucide-react (icons), tailwind-merge, tailwindcss-animate
- **Chat Integration**: tmi.js 1.8.5 (Twitch Chat client)
- **HTTP**: Axios 1.13.5
- **Validation / Email**: Zod 4.5.4, Resend 6.26 (declared dependencies)
- **Security**: AES-256-GCM encryption of Spotify credentials at rest (`src/lib/crypto.ts`, requires `ENCRYPTION_KEY`)
- **Deployment**: Vercel (with cron job support)

### Deployment
- Deployed on Vercel with cron jobs configured
- Database URL and API keys stored in environment variables
- NextAuth secret configured for session management

---

## 2. Main Features Currently Implemented

### A. **Spotify Music Widget** ✅
- Real-time now-playing track display
- Music widget for OBS browser source
- Customizable design (8+ themes/layouts)
- Widget settings:
  - **Visual**: Font family, accent color, border radius, background opacity, blur amount
  - **Display Options**: Show/hide cover art, artist name, progress bar, timestamp
  - **Effects**: Glow effect, rotation animation, blur background
  - **Positioning**: Configurable widget position on stream
  - **Features**: Animated equalizer, auto-hide (widget only shown a few seconds on each new track)
- Progress bar with current/total time display
- Album cover art display with optional rotation effect
- Smooth animations powered by Framer Motion

### B. **Dashboard (User Control Panel)** ✅
- Sidebar navigation grouped by category (v3.3.0):
  - **Accueil** (`/dashboard`): connection status, OBS source URLs (music + chat), "Régénérer les liens", quick links to ideas and changelog
  - **Intégrations → Spotify** (`/dashboard/spotify`): Client ID/Secret, Redirect URI, OAuth link/unlink
  - **Intégrations → Bot** (`/dashboard/bot`): Nightbot / Wizebot / StreamElements scripts, custom message, live preview
  - **Widgets → Musique** (`/dashboard/design`): music widget customization
  - **Widgets → Chat** (`/dashboard/chat`): chat widget themes, presets, moderation
  - **Analyse → Statistiques** (`/dashboard/stats`): listening history
  - **Analyse → Twitch** (`/dashboard/twitch`): channel statistics (followers, live, videos, clips)
  - **Compte & données** (`/dashboard/account`): export, deletion, sessions, diagnostics, resets
- Onboarding: welcome modal (4 steps) shown to new accounts, re-openable from the Help center
- "Quoi de neuf" modal driven by `lib/changelog.ts`; onboarding and last-seen changelog version are stored on the account

### C. **Chat Widget** ✅
- Real-time Twitch chat display for overlays
- Customizable themes (glass, etc.)
- Badge support (mod, sub, founder badges)
- Message filtering options:
  - Hide bot messages
  - Hide commands
- Animation options (slide, etc.)
- Configurable font size and message count
- Position and width customization
- 6 one-click presets (Streamer Pro, Minimaliste, Compact, Arcade Rétro, Cyber Néon, Cosmic) over themes such as glass, epure, compact, retro, neon, aurora
- Display options: timestamps, user colors, compact mode, character limit, message lifetime (0 = permanent)
- Replies display, highlight of a viewer's very first message, per-role highlight colors (moderator, subscriber, VIP, broadcaster, bot)
- Word filter with two modes: hide the whole message or censor only the matching words (v2.0.19)
- Ignored-users list; BTTV / 7TV / FFZ emotes and official Twitch badges
- Render code (themes, animations, emote splitting) shared between the real widget, the dashboard and the home preview (`lib/chat-widget-theme.ts`)

### D. **Chatbot Integrations** ✅
Supports multiple bot platforms for displaying currently playing track:

1. **Nightbot** - `$(urlfetch json)` format
2. **Wizebot** - `$urlcall()` format  
3. **StreamElements** - `${customapi}` format
4. **StreamLabs** - Text response format

Features:
- Custom message templates with `{artist}`, `{title}`, `{song}` placeholders
- Auto-announce via a bot **Timer** using the exact same script as the command (no dedicated setting)
- Real-time Spotify API integration for each request
- Bot message filtering in chat widget

### E. **Support Ticketing System** ✅
- User can create support tickets
- Categories: Spotify, OBS, API, Account, Other
- Message threading within tickets
- Ticket status tracking: En Attente → En Cours → Résolu → Fermé
- Admin dashboard for ticket management
- Staff-only endpoints with permission-based access control (`manageTickets`)
- Claim / release: a single staff member is active on a ticket at a time
- "Is typing" indicator for both user and staff (`/typing` route, v2.0.20)
- Clickable links in messages, keyboard shortcuts (Enter, Shift+Enter, Enter+Space to send and resolve)
- Paginated ticket list for users

### F. **FAQ Management** ✅
- Dynamic FAQ articles by category
- Admin can create/edit/delete articles
- Categories align with ticket system
- Public FAQ retrieval endpoint
- Article ordering system
- Help center (`/help`): search, category filter chips, paginated accordion, light formatting in answers (`**bold**`, lines starting with "Note" highlighted), re-open welcome guide button, links to tickets

### G. **Admin Dashboard** ✅
- Pages: overview (`/admin`), tickets, FAQ, ideas, users, owner space (`/admin/owner`)
- Ticket statistics overview and recent tickets
- FAQ article management and ideas moderation (status + official response)
- Users list (sort by name, role, sign-up date, Spotify status), role changes, account deletion
- Every admin page is guarded server-side (`requirePagePermission`) and redirects to `/403?from=...` without the right permission; sections are hidden in the nav when the permission is missing

### H. **Status Monitoring** ✅
- Service health tracking (Spotify API, Twitch API, Overlays Server)
- 24-hour uptime history with 90-point visualization
- 30-day availability per service, ongoing incidents separated from history, key figures (v2.0.10, v3.0.1)
- "Overlays Server" is now actually probed on each check (it previously always showed operational)
- Status states: Operational, Degraded, Down
- Latency measurement
- Auto-expiring logs (TTL index: 24 hours)

### I. **User Settings & Configuration** ✅
- Spotify client ID/secret configuration
- Chat widget settings persistence
- Widget design customization storage
- Bot message settings
- Canvas settings (1920x1080 default)

### J. **Listening Statistics** ✅
- Total milliseconds listened
- Total tracks played counter
- Last played track tracking
- Last poll timestamp
- Track change detection
- Accumulated listening time per session
- Detailed history (`TrackHistory`, v2.0.18): top tracks/artists, activity by hour, recent plays, filter 7 / 30 / 90 days / all time; TTL 180 days
- Stats written to the DB in batches (v3.2.1), no duplicate entries for the same track

### K. **Ideas Box** ✅ (v2.0.6)
- `/ideas`: submit a feature idea, upvote/downvote (one vote state per user), paginated list
- Categories: general, support, feature, ui_ux; statuses: en_étude, planifié, en_cours, terminé, rejeté
- Official team response shown under each idea; moderation panel in `/admin/ideas`

### L. **Owner Space** ✅ (v3.0.0)
- `/admin/owner`, restricted to `creator` and `co_creator` (`ownerZone` permission)
- Global site announcement: level (info / warning / critical), immediate or scheduled, auto-expiry, dismissible depending on severity (`SiteSettings.banner`)
- Users/services overview, permissions matrix per role, audit log (role changes, account deletions; TTL 180 days)

### M. **Account & Data** ✅ (v2.0.12)
- Full JSON export of personal data, permanent account deletion with double confirmation (Twitch token revoked, tickets deleted, ideas anonymized)
- Active sessions list with device and last activity; revoke one or all others
- Live diagnostics (Twitch, Spotify, widgets enabled)
- One-click reset of widget settings (music, chat, bot) or listening stats, independently

### N. **Regenerable Widget Links** ✅ (v3.2.0)
- Widget and bot URLs use a random 128-bit `widgetToken` instead of the account `_id`
- Legacy `_id` links keep working until the user regenerates; regenerating disables them for good (`widgetLegacyIdDisabled`)
- New accounts get a token at creation and no legacy link

### O. **Public Site Shell** ✅
- Shared `SiteHeader` (sticky navbar) on all public pages (v3.5.0), `Pagination` component, global `SiteBanner`
- Redesigned error pages 403 / 404 / 500 and a `global-error` fallback
- Home page with animated music + chat widget previews using demo data and the real render engine
- Public `/changelog` (versioned, deep link `#vX.Y.Z`), `/privacy` (CGU + GDPR rights), `/mentions-legales`

### R. **Terms Versioning** ✅ (v3.11.0)
- `lib/terms.ts` is the single source: `TERMS_REVISED_AT` (date of the last *material* revision), `TERMS_REVISED_LABEL` (display), `TERMS_CHANGES` (what changed in THIS revision, shown to returning users), `hasAcceptedCurrentTerms()`
- `GET /api/user/accept-terms` now answers `hasAcceptedTerms` against the current revision (`acceptedTermsAt >= TERMS_REVISED_AT`) plus `isUpdate`, `revisedLabel`, `changes`; both existing call sites (home page, `DashboardShell`) keep working unchanged on `!hasAcceptedTerms` and just pass the update info to `TermsModal` (title "Nos conditions ont évolué" + change list)
- `/privacy` shows `TERMS_REVISED_LABEL` as its "last updated" date, so page and prompt cannot drift apart
- **Process**: bump the date + replace `TERMS_CHANGES` only for material changes (new data, permission, processing, third party, retention), never for typo fixes
- Acceptance is still enforced client-side by the modal (as before), not by an API guard

### Q. **Chat Statistics** ✅ (v3.10.0, opt-in)
- New tab **Chat** on `/dashboard/twitch` (`components/dashboard/ChatStatsTab.tsx`, self-contained: own fetching, enable/pause/delete)
- **Collection happens in the chat widget** (OBS browser source): `lib/chat-stats-client.ts` keeps in-memory counters (never message text) and the widget POSTs them every 30 s (and on `pagehide` via `sendBeacon`; retried on 5xx/429). The widget reads `chatStatsEnabled` from its config endpoint (polled every 5 s) so toggling in the dashboard takes effect without reloading OBS
- Counted before display filters (hide bots / commands / words do not skew numbers); bots, commands and ignored users are excluded from conversation stats (bots and commands counted separately); emotes = Twitch tag positions + BTTV/7TV/FFZ words; chatters keyed by Twitch user id
- **Storage**: `ChatSession` (counters only, TTL 90 days after last activity). A session = chat activity separated by < 30 min of silence (server-side rule in `lib/chat-stats.ts`). Arrays capped (2 500 chatters, 300 emotes, 100 commands). Writes serialized per user in-process
- **Ingestion hardening**: the widget URL is only a link, so the endpoint caps body size, field sizes and counts, rejects out-of-window minutes, rate-limits per user and returns `{disabled: true}` (200) when the feature is off
- **UI**: session picker, KPIs vs the average of the other listed sessions, minute-by-minute activity chart (grouped by 2/5/10/30 min on long sessions, peak highlighted), top chatters (avatars, share), top emotes, top commands, regulars over the last 20 sessions, sessions table
- Included in account deletion and in the JSON export (counts only)

### P. **Twitch Channel Stats** ✅ (v3.6.0 → v3.9.0)
- Page `/dashboard/twitch` + `GET /api/user/twitch-stats` and `GET /api/user/twitch-followers`, logic in `src/lib/twitch-user.ts`
- Page `/dashboard/twitch` split into 6 tabs (hash `#overview|followers|team|community|chat|content`). Server code is split in `lib/twitch-user.ts` (token, Helix helpers, avatars, overview), `lib/twitch-community.ts` (team, subscribers, VIPs, bits) and `lib/twitch-unfollows.ts` (departure tracking)
- **Avatars** everywhere: batched `/users?id=` (100 per call), cached 6 h in memory (max 5 000 entries), 70x70 variant requested via the CDN size suffix
- **Channel card**: banner = the channel's *offline image* (the profile banner is not exposed by the Helix API), avatar with live ring, bio, tags, live preview, copy-link button, quick figures
- **Team tab = staff only** (moderators `moderation:read`, editors `channel:read:editors`); **VIPs are not staff** and moved to **Communauté** with subscribers (`channel:read:subscriptions`, affiliates/partners only; the broadcaster's own self-subscription is removed from the total) and the monthly bits leaderboard (`bits:read`). Team and community are loaded lazily, only when their tab is opened
- Each section has its own status (`ok | missing_scope | expired | unavailable | error`) so a missing permission only affects that card
- **Departures (unfollows)**: Twitch exposes no unfollow history, so this is an opt-in snapshot diff stored in `FollowerTracking` (compact `{i,l,n,f}` entries, 5 000 followers max, 200 departures kept). A scan reads the full followers list (cursor-paginated, rejected if incomplete), compares it to the previous snapshot, flags accounts that no longer exist (`accountGone`), 5 min cooldown, in-memory lock per user, automatic scan on tab open if last one is older than 30 min. `POST {action: enable|scan}`, `DELETE` removes everything. Included in account deletion and in the JSON export (counts only)
- Scrollbars restyled globally in `globals.css` (`-webkit-` rules for Chromium/Safari, `scrollbar-color` only for Firefox, `.twichify-scroll` for card lists)
- **Followers tab**: full list paginated by cursor (page size 10/25/50/100, previous/next/start, quick filter on the current page; Twitch only paginates forward so the client keeps the cursor stack), gains 24 h / 7 d / 30 d, daily chart (7/14/30 days, bucketed client-side in the browser timezone)
- Gains and chart use a sample of the 300 latest followers (3 pages of 100); values are marked `+` / greyed when the sample does not reach back far enough
- **Contenu tab**: last 20 VODs aggregates (avg views, avg duration, hours streamed over 30 days, best VOD), 6 latest VODs, top clips of 30 days (up to 100 analysed) + top clippers, upcoming schedule segments (ignored on 404)
- Followers need the `moderator:read:followers` scope on the **user** token; everything else uses the app token
- Team lists (v3.7.0): moderators (`moderation:read`), VIPs (`channel:read:vips`), editors (`channel:read:editors`, with date added); each list has its own status so a missing scope only affects that card, and the 100 first entries are returned (`+` when truncated)
- User token lives in the NextAuth `accounts` collection; it is refreshed with the `refresh_token` when expired (one refresh at a time per user, new refresh token persisted)
- `events.signIn` in the NextAuth config now writes the fresh token/scope on every sign-in (v4 does not update an existing linked account)
- Accounts created before v3.6.0 get a "reconnect" banner (`force_verify`) until they re-authorize; nothing is stored beyond the token, results are cached 30 s in memory

---

## 3. API Endpoints & Purposes

### Authentication
- `POST/GET /api/auth/[...nextauth]` - NextAuth handler (Twitch OAuth)

### Spotify Integration
- `GET /api/spotify/auth-url` - Generate Spotify authorization URL (requires user Spotify credentials)
- `GET /api/callback/spotify` - Spotify OAuth callback, exchanges code for refresh token
- `GET /api/spotify/now-playing/[userId]` - Get currently playing track with widget settings (`[userId]` is the widget token, or the legacy account id until regenerated)
- `POST /api/spotify/disconnect` - Unlink Spotify account

### Chatbot
- `GET /api/chatbot/[provider]` - Dynamic chatbot response endpoint
  - Supports: nightbot, wizebot, streamelements, streamlabs
  - Returns formatted message based on provider
  - Query params: `userId` (widget token or legacy id); same plain-text answer for a command or a Timer

### Chat Widget
- `GET /api/widget/chat/config/[userId]` - Retrieve chat widget settings for user

### Support & Admin
- `POST /api/support/tickets` - Create new support ticket
- `GET /api/support/tickets` - Get user's tickets
- `GET /api/support/tickets/[id]` - Get specific ticket
- `POST /api/support/tickets/[id]/messages` - Add message to ticket
- `PATCH /api/support/tickets/[id]/status` - Update ticket status (staff only)
- `POST /api/support/tickets/[id]/claim` and `/release` - Take over / release a ticket (staff only)
- `POST /api/support/tickets/[id]/typing` - "Is typing" ping
- `GET /api/admin/tickets` - Get all tickets (staff only)
- `POST /api/admin/faq` - Create FAQ article (staff only)
- `GET /api/admin/faq` - List FAQ articles (internal only)
- `PUT /api/admin/faq/[id]` - Update FAQ article (staff only)
- `DELETE /api/admin/faq/[id]` - Delete FAQ article (staff only)
- `/api/admin/users`, `/api/admin/users/[id]` - User list, role change, deletion (permission-based)
- `/api/admin/owner/overview`, `/settings`, `/audit` - Owner space: overview, global announcement, audit log (`ownerZone`)

### User Management
- `GET /api/user/profile` - Get current user profile
- `GET /api/user/accept-terms` - Check/verify terms acceptance
- `POST /api/user/accept-terms` - Mark terms as accepted
- `POST /api/user/spotify-setup` - Save Spotify client ID/secret
- `POST /api/user/design-setup` - Save widget design settings
- `POST /api/user/chat-widget-setup` - Save chat widget settings
- `POST /api/user/bot-settings` - Save bot message settings
- `GET /api/user/listening-stats` - Get listening statistics
- `DELETE /api/user/listening-stats` - Reset statistics
- `GET /api/user/listening-history` - Detailed listening history (top tracks/artists, hourly activity, recents)
- `GET/POST /api/user/widget-token` - Read / regenerate the widget token
- `GET /api/user/export`, `GET /api/user/data-summary` - Personal data export and summary
- `/api/user/account` - Permanent account deletion
- `/api/user/sessions`, `/sessions/[id]`, `/sessions/revoke-others` - List and revoke sessions
- `GET /api/user/diagnostics` - Live Twitch / Spotify / widget check
- `GET /api/user/twitch-stats` - Twitch channel stats (followers, team lists, live, VODs, clips, schedule)
- `GET /api/user/twitch-followers?after=&first=` - One page of the full followers list (cursor-based, `first` 1-100)
- `GET /api/user/twitch-team` - Moderators and editors (staff) with avatars
- `GET /api/user/twitch-community` - Subscribers, VIPs, bits leaderboard
- `GET/POST/DELETE /api/user/twitch-unfollows` - Departure tracking state, enable/scan, disable (`maxDuration` 60 s)
- `GET/POST/DELETE /api/user/chat-stats` - Chat statistics: state + sessions + selected session (`?session=`), enable/pause, delete history
- `POST /api/widget/chat/stats/[userId]` - Ingestion of aggregated chat counters sent by the chat widget (widget token auth, 64 KB max, 3 s min interval, strict payload validation)
- `POST /api/user/reset-widgets` - Reset music / chat / bot settings
- `/api/user/onboarding-state` - Welcome guide and last-seen changelog version

### System
- `GET /api/faq` - Public FAQ retrieval
- `GET/POST /api/ideas`, `POST /api/ideas/[id]/vote`, `PATCH /api/ideas/[id]/status` - Ideas box, votes, moderation
- `GET /api/site-banner` - Active global announcement
- `GET /api/status` - Service status and uptime history
- `GET /api/twitch/badges/[login]` - Retrieve Twitch user badges
- `GET /api/twitch/global-badges` - Retrieve Twitch global badges
- `GET /api/cron/check-status` - Cron job for service health checks (runs every 15 min)
- `GET /api/emotes/[channel]` - Third-party emotes for a channel (BTTV, 7TV, FFZ)

---

## 4. Database Models & Data Structure

### User Model
```
{
  name: String
  email: String (unique)
  image: String
  hasAcceptedTerms: Boolean
  acceptedTermsAt: Date
  hasSeenWelcome: Boolean          # onboarding stored on the account
  seenChangelogVersion: String
  
  # Spotify
  spotifyClientId: String
  spotifyClientSecret: String
  spotifyRefreshToken: String      # clientId / secret / refresh token encrypted at rest (AES-256-GCM)
  
  # Authorization
  role: enum["user", "helper", "moderator", "admin", "co_creator", "creator"]

  # Widget links
  widgetToken: String (unique when present, 128-bit hex)
  widgetLegacyIdDisabled: Boolean  # true once links were regenerated
  
  # Widget Settings
  widgetSettings: {
    layout: String (default: "default")
    fontFamily: String
    accentColor: Color
    borderRadius: Number
    bgOpacity: Number (0-100)
    blurAmount: Number
    showCover: Boolean
    showArtist: Boolean
    showProgress: Boolean
    showTimestamp: Boolean
    enableGlow: Boolean
    isRotating: Boolean
    enableBlurBg: Boolean
    enabled: Boolean
    position: String (bottom-left, etc.)
    showEqualizer: Boolean
    autoHide: Boolean
    autoHideSeconds: Number (default 10)
  }
  
  # Bot Settings
  botSettings: {
    customMessage: String (template: {artist}, {title}, {song})
  }
  
  # Chat Widget Settings
  chatWidgetSettings: {
    theme: String (glass, etc.)
    fontSize: Number
    showBadges: Boolean
    hideBots: Boolean
    hideCommands: Boolean
    animation: String (slide, etc.)
    maxMessages: Number
    position: String
    widgetWidth: Number
    showTimestamps: Boolean
    showColors: Boolean
    compactMode: Boolean
    charLimit: Number (0 = unlimited)
    messageLifetime: Number (seconds, 0 = permanent)
    ignoredUsers: [String]
    showReplies: Boolean
    highlightFirstMessage: Boolean
    roleHighlights: { moderator|subscriber|vip|broadcaster|bot: { enabled, color } }
    moderationWords: [String]
    moderationMode: enum["hide", "censor"]
  }
  
  # Canvas Settings
  canvasSettings: {
    width: Number (default: 1920)
    height: Number (default: 1080)
  }
  
  # Listening Statistics
  listeningStats: {
    totalMsListened: Number
    totalTracksPlayed: Number
    lastTrack: {
      title: String
      artist: String
      albumImageUrl: String
      playedAt: Date
    }
    lastPollAt: Date
    lastTrackKey: String
  }
}
```

### SupportTicket Model
```
{
  userId: String (required)
  userName: String
  subject: String (required)
  category: enum["spotify", "obs", "api", "compte", "autre"]
  status: enum["en_attente", "en_cours", "resolu", "ferme"]
  assignedTo: { userId, userName, role, assignedAt }   # claimed by one staff member
  typing: { userId, userName, role, at }               # "is typing" indicator
  messages: [
    {
      authorId: String
      authorName: String
      authorRole: enum["user", "helper", "moderator", "admin", "co_creator", "creator", "system"]
      content: String
      createdAt: Date
    }
  ]
  createdAt: Date
  updatedAt: Date
}
```

### StatusLog Model
```
{
  service: String (e.g., "Spotify API", "Twitch API", "Overlays Server")
  status: enum["operational", "degraded", "down"]
  latencyMs: Number (optional)
  timestamp: Date (TTL: 86400 seconds = 24 hours)
}
```

### FaqArticle Model
```
{
  question: String (required)
  answer: String (required)
  category: enum["spotify", "obs", "api", "compte", "autre"]
  order: Number
  createdAt: Date
  updatedAt: Date
}
```

### Idea Model
```
{
  title: String (required)
  description: String (required)
  category: enum["general", "support", "feature", "ui_ux"]
  status: enum["en_etude", "planifie", "en_cours", "termine", "rejete"]
  authorId, authorName: String
  upvotes: [String]      # user ids
  downvotes: [String]    # a user is in only one of the two
  officialResponse: { content, updatedAt }
  createdAt, updatedAt: Date
}
```

### TrackHistory Model
```
{
  user: ObjectId (ref User)
  title, artist: String
  albumImageUrl: String
  playedAt: Date (TTL: 180 days)
  msPlayed: Number
}
```

### SiteSettings Model (single document, key = "global")
```
{
  banner: { enabled, message (max 200), level: info|warning|critical, startsAt, expiresAt, updatedAt }
}
```

### AuditLog Model
```
{
  actorId, actorName, actorRole: String
  action: String (e.g. "role.change")
  targetId, targetName, details: String
  createdAt: Date (TTL: 180 days)
}
```

---

## 5. Authentication & Authorization

### Authentication Strategy
- **Provider**: Twitch OAuth via NextAuth (scopes: `openid user:read:email moderator:read:followers moderation:read channel:read:vips channel:read:editors channel:read:subscriptions bits:read`)
- **Adapter**: MongoDB Adapter (stores sessions in DB)
- **Session Strategy**: Database (not JWT)
- **User Creation**: Auto-creates user on first login with terms acceptance timestamp and a widget token (no legacy id link)

### Authorization Levels (`src/lib/roles.ts`)
Six roles with numeric levels; an actor can only act on / assign roles strictly below their own level.
1. **User** (0, default) - Own dashboard and widgets
2. **Helper** / Assistant (1) - Admin panel access, support tickets
3. **Moderator** (2) - Helper rights + FAQ, user list, ideas
4. **Admin** (3) - Moderator rights + role management
5. **Co-créateur** (4) - Admin rights + account deletion + owner space
6. **Créateur** (5) - Same permissions as Co-créateur, highest level

Permissions (matrix `ROLE_PERMISSIONS`): `viewAdminPanel`, `manageTickets`, `manageFaq`, `viewUsers`, `manageRoles`, `deleteUsers`, `manageIdeas`, `ownerZone`.

### Key Authentication Files
- `src/lib/auth-helpers.ts` - Session utilities
  - `getSessionUser()` - Get current user from session
  - `requireStaff()` - Check if user has a staff role (Helper and above)
  - `requirePermission(permission)` - Check a precise permission (preferred for admin APIs)
  - Records user-agent and last activity of the current session (at most once per hour) for the sessions list
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- `src/lib/roles.ts` - Roles, levels, permissions matrix
- `src/lib/admin-guard.ts` - `requirePagePermission()`: server-side guard redirecting to `/403`
- `src/lib/widget-token.ts` - Widget token generation, lookup, rotation
- `src/lib/crypto.ts` - AES-256-GCM encrypt / decrypt for Spotify credentials

### Protected Routes
- Dashboard (requires login)
- Admin panel (requires the matching permission, otherwise redirect to `/403`)
- API endpoints with `getSessionUser()` checks

---

## 6. Frontend Components & UI Patterns

### Key Components
- **AdminNav.tsx** - Admin panel navigation
- **TermsModal.tsx** - Terms of service modal dialog
- **TicketStatusBadge.tsx** - Visual badge for ticket status
- **CanvasScaler.tsx** - Responsive canvas scaling utility
- **Providers.tsx** - React providers wrapper (NextAuth session, etc.)
- **SiteHeader.tsx** - Sticky public navbar (Changelog, Idées, Aide, login / profile)
- **SiteBanner.tsx** - Global announcement banner (hidden on OBS overlays)
- **WelcomeModal.tsx** / **ChangelogModal.tsx** - Onboarding guide and "Quoi de neuf" modal
- **Pagination.tsx** - Shared pagination hook + component (changelog, ideas, FAQ, tickets)
- **DashboardShell.tsx** / **AdminShell.tsx** / **AdminNav.tsx** - Grouped navigation for dashboard and admin
- **dashboard/** - `DashboardUI`, `ConfirmDialog`, `useToast`, `useWidgetToken`
- **home/** - `MusicWidgetPreview`, `ChatWidgetPreview` (demo data, real render engine)
- **ErrorScreen**, **NotFoundContent**, **ForbiddenContent** - 403 / 404 / 500 screens
- **IdeaStatusBadge**, **LinkifiedText**, **LegalFooter**, **Logo**

### Main Pages
- **Home (/)** - Landing page with feature overview, animated widget previews, roadmap, setup steps, call to action
- **Dashboard (/dashboard)** - User control panel, sub-pages: `/spotify`, `/bot`, `/design` (Widgets → Musique), `/chat`, `/stats`, `/twitch`, `/account`
- **Admin (/admin)** - Admin home, ticket/FAQ management
- **Admin FAQ (/admin/faq)** - FAQ article editor
- **Admin Ideas (/admin/ideas)** - Ideas moderation (status, official response)
- **Admin Users (/admin/users)** - Users, roles, deletion
- **Admin Owner (/admin/owner)** - Owner space (announcement, permissions matrix, audit log)
- **Admin Tickets (/admin/tickets/[ticketId])** - Ticket thread viewer
- **Support New (/support/new)** - Create new support ticket
- **Support My Tickets (/support/my-tickets)** - View user tickets
- **Support Ticket (/support/[ticketId])** - View specific ticket
- **Help (/help)** - Help center: searchable, paginated FAQ + welcome guide + support links
- **Ideas (/ideas)** - Ideas box with votes
- **Changelog (/changelog)** - Versioned update history
- **Status (/status)** - Service status page
- **Privacy (/privacy)** - Privacy policy and terms (CGU)
- **Mentions légales (/mentions-legales)** - Legal notice
- **Widget Spotify (/widget/[userId])** - Embeddable music widget
- **Widget Chat (/widget/chat/[userId])** - Embeddable chat widget
- **Auth Cancelled (/auth/cancelled)** - Login error page
- **403 / 404 / 500 pages** - Redesigned error screens (+ `global-error` fallback)

### UI Framework
- Tailwind CSS 4 with animations plugin
- Framer Motion for smooth widget animations
- Lucide React icons
- Custom gradient backgrounds and glassmorphism effects
- Responsive design with mobile support

---

## 7. External Integrations

### Spotify API
- **OAuth 2.0** flow for user authorization
- Currently playing track endpoint: `/v1/me/player/currently-playing`
- Token refresh mechanism with refresh tokens
- Track info includes: title, artist, album art, progress, duration, play state
- User provides their own Spotify Client ID/Secret

### Twitch API
- **OAuth via NextAuth** - Primary authentication
- Badge retrieval for chat widget
- User profile info (login, name, image)

### Chatbot Platforms
- **Nightbot** - JSON response parsing
- **Wizebot** - Plain text response
- **StreamElements** - JSON response
- **StreamLabs** - Plain text response
- All receive: currently playing track, artist, formatted message

### Third-party Libraries
- **tmi.js** - Twitch Chat IRC client (for chat widget)
- **axios** - HTTP requests to external APIs

---

## 8. Widget Implementations

### A. Spotify Music Widget (`/widget/[userId]`)
- **Display**: Real-time currently playing track
- **Refresh Rate**: 1000ms (1 second polling)
- **Responsive Layouts**:
  - Default: 380px width with full info
  - Minimal: 220px width for compact display
- **Animations**:
  - Smooth entry/exit with Framer Motion
  - Optional cover art rotation
  - Progress bar animation
- **Customization Options**: ~15+ design settings
- **OBS Integration**: Browser source URL: `/widget/[token]` (legacy `/widget/[userId]` accepted until links are regenerated)

### B. Chat Widget (`/widget/chat/[userId]`)
- **Display**: Real-time Twitch chat messages
- **Features**:
  - User badges (mod, sub, founder)
  - Custom theme support
  - Message filtering (bots, commands)
  - Configurable animations
  - Font size control
- **OBS Integration**: Browser source URL: `/widget/chat/[token]`
- **Excluded Users**: Bots and special accounts automatically filtered

---

## 9. Missing Features or Incomplete Functionality

### Roadmap Items (From Home Page)
Roadmap shown on the home page (reset on 02/10/2026, all items still to build):
1. **More music platforms** - Deezer, YouTube Music, Apple Music, SoundCloud (Prioritaire)
2. **Chat song requests** - viewers propose tracks, queue shown as overlay (Planifié)
4. **Latest followers widget** - OBS overlay (Planifié)
5. **Chat statistics** - messages volume, top chatters (En réflexion)
6. **Discord notifications** - go-live and now playing (En réflexion)

### Potential Gaps
1. **Notification System** - No real-time notifications for admins on new tickets
2. **Webhook Support** - No Discord webhook integration for alerts
3. **Advanced Analytics** - Limited stats beyond basic listening metrics
4. **Multi-account Support** - Single Spotify account per user
5. **Scheduled Messages** - No message scheduling for bots
6. **Rate Limiting** - No apparent rate limiting on API endpoints
7. **Error Handling** - Some API responses could be more descriptive
8. **Widget Preview** - Live previews exist for chat and bot in the dashboard; music widget preview to be checked
9. **Emote Display** - Delivered (BTTV / 7TV / FFZ in chat widget)
10. **Mobile Dashboard** - Limited mobile optimization for desktop

---

## 10. Areas for Improvement & Enhancement

### A. Performance & Optimization
- **Caching**: Spotify tokens are now reused while valid and close polls are coalesced (v2.0.14); Redis caching still optional
- **Database Queries**: Lists are paginated in the UI (v3.4.0); server-side pagination still to consider for large volumes
- **Image Optimization**: Optimize album art images (currently full size)
- **API Response Compression**: Implement gzip compression
- **Connection Pooling**: Mongoose connection management could be optimized

### B. Code Quality & Architecture
- **Error Handling**: Standardize error responses with consistent status codes
- **Logging**: Implement structured logging (Sentry, LogRocket)
- **Testing**: Add unit/integration tests (currently appears to be none)
- **Type Safety**: Some `any` types in components should be properly typed
- **Code Splitting**: Large dashboard component could be split into smaller files
- **Constants**: Magic strings (colors, sizes) should be centralized

### C. Security & Validation
- **Input Validation**: Implement Zod/Yup validation schemas for all APIs
- **Rate Limiting**: Add rate limiting middleware (especially for chatbot endpoint)
- **CORS**: Verify CORS configuration for widget embeds
- **Token Storage**: Spotify client secret is stored in DB (consider encryption)
- **Admin Checks**: Some admin endpoints might need additional verification

### D. User Experience
- **Loading States**: Add skeleton loaders and better loading indicators
- **Error Messages**: More user-friendly error explanations in UI
- **Onboarding**: Welcome guide delivered (v3.0.0), re-openable from the Help center
- **Dark Mode**: Already dark, but could have theme toggle
- **Accessibility**: Add ARIA labels and keyboard navigation
- **Responsive Design**: Some pages need mobile optimization

### E. Feature Enhancements
- **Widget Analytics**: Track widget views and clicks
- **A/B Testing**: Test different widget designs
- **Custom Branding**: Allow users to add custom logos/watermarks
- **Multiple Widgets**: Support multiple widgets per user (e.g., next track preview)
- **Spotify Playlist Support**: Display/cycle through playlists
- **Auto-backup**: Automatic settings export/import
- **Notification Center**: In-app notifications for admins
- **Advanced Filtering**: More filtering options in chat widget

### F. Monitoring & Reliability
- **Error Tracking**: Implement Sentry for production errors
- **Performance Monitoring**: Add real user monitoring (RUM)
- **Database Backups**: Ensure MongoDB backups are configured
- **Graceful Degradation**: Handle API failures more elegantly
- **Uptime Monitoring**: Expand status page monitoring

### G. Documentation & Maintainability
- **API Documentation**: Add OpenAPI/Swagger docs
- **Component Stories**: Add Storybook for component documentation
- **Architecture Docs**: Create architecture decision records (ADRs)
- **Deployment Guide**: Document Vercel deployment process
- **Environment Setup**: `.env.example` is present
- **Code Comments**: Add JSDoc comments to complex functions

### H. DevOps & Deployment
- **CI/CD Pipeline**: Add GitHub Actions for automated testing/deployment
- **Environment Management**: Better separation of dev/staging/prod
- **Database Migrations**: Implement migration system for schema changes
- **Monitoring Dashboard**: Create admin dashboard for system health
- **Auto-scaling**: Configure Vercel auto-scaling rules

---

## 11. Technical Debt & Issues Observed

### Critical
1. **Error Boundaries** - `error.tsx` and `global-error.tsx` now exist (v2.0.17); per-component boundaries could still be added
2. **Mongoose Connection Management** - Manual connection checks everywhere should use connection pool
3. **No Input Validation** - Most endpoints accept data without validation

### High Priority
1. **Dashboard Structure** - Split into dedicated pages behind `DashboardShell` (v3.3.0); individual pages (chat, design) remain long and could be split into components
2. **Hardcoded Values** - Magic numbers and strings scattered throughout
3. **Session Leaks** - No session cleanup mechanism
4. **Missing Tests** - No test files visible in project

### Medium Priority
1. **Stale Dependencies** - Some packages could be updated
2. **TypeScript Any Types** - Several `any` types should be properly typed
3. **Console Logs** - Debug logs left in production code
4. **Comments in French** - Mix of English and French comments
5. **Duplicate Code** - API route patterns repeat across endpoints

### Low Priority
1. **CSS Organization** - Could use CSS modules or Tailwind layers
2. **Constants File** - Magic values should be centralized
3. **Type Definitions** - Could improve type organization with separate types file

---

## 12. Project Statistics

### Codebase Metrics
- **Models**: 8 (User, SupportTicket, StatusLog, FaqArticle, Idea, TrackHistory, SiteSettings, AuditLog)
- **API Routes**: ~50 route files
- **Pages**: ~28 pages (public, dashboard, admin, support, widgets)
- **Components**: ~25 (shared, dashboard, home previews)
- **External Integrations**: 4+ (Spotify, Twitch, Chatbots, BTTV / 7TV / FFZ)
- **Database**: MongoDB with 8 collections (+ NextAuth adapter collections)

### Key File Sizes
- Dashboard: split into 7 pages (`/dashboard/*`); `chat/page.tsx` is now the largest
- Spotify widget: ~350 lines
- Auth config: ~50 lines
- Models: ~500 lines total

---

## 13. Deployment Configuration

### Vercel Setup
- **File**: `vercel.json`
- **Cron Jobs**: 
  - `/api/cron/check-status` - Runs every 15 minutes
  - Purpose: Monitors Spotify, Twitch, and overlay server health

### Environment Variables Required
```
DATABASE_URL=mongodb://...
NEXTAUTH_SECRET=...
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Twitch OAuth
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...

# Encryption of Spotify credentials (AES-256-GCM, 64 hex chars)
ENCRYPTION_KEY=...

# Spotify (user-provided)
# Stored per-user in database
```

---

## 14. User Flow & Workflows

### New User Onboarding
1. Click "Connexion" on home page
2. Redirect to Twitch OAuth
3. Accept permissions and redirect back
4. Terms modal appears
5. Accept terms
6. Redirect to dashboard

### Spotify Setup Workflow
1. Go to Dashboard → Intégrations → Spotify
2. Enter Spotify Client ID and Client Secret
3. Click "Associer mon compte"
4. Redirect to Spotify auth page
5. Grant permissions
6. Redirect back to dashboard with success message
7. Store refresh token in database

### Widget Setup Workflow
1. Configure design in Dashboard → Widgets → Musique
2. Copy widget URL from the Accueil page (`/widget/[token]`)
3. Add as browser source in OBS
4. Chat widget URL: `/widget/chat/[token]`
5. Customize chat settings in Dashboard → Widgets → Chat

### Support Ticket Workflow
1. User creates ticket in Support → New
2. Ticket stored with status "en_attente"
3. Admin views ticket in Admin panel
4. Admin updates status and adds messages
5. User receives updates on ticket page
6. Ticket marked "resolu" or "ferme" when complete

---

## 15. Conclusion & Recommendations

### Strengths
✅ Well-integrated ecosystem with multiple features
✅ Clean UI with good visual design
✅ Multiple integration points (Spotify, Twitch, Chatbots)
✅ Proper authentication and authorization
✅ Good separation of concerns with API routes
✅ Responsive and smooth animations
✅ Support infrastructure in place

### Primary Recommendations
1. **Refactor Dashboard** - Split into multiple smaller components
2. **Add Validation** - Implement input validation across all APIs
3. **Improve Testing** - Add unit and integration tests
4. **Database Optimization** - Use connection pooling and caching
5. **Error Handling** - Standardize error responses
6. **Documentation** - Add API docs and architecture guides
7. **Performance** - Add monitoring and performance optimization
8. **Security** - Implement rate limiting and input sanitization

### Next Steps for Development
1. Multi-platform music (Deezer first): abstract the "now playing" provider behind a common interface before adding services
2. Add webhook support for Discord notifications
3. Notify staff of new tickets and ideas (feature-voting system already delivered in v2.0.6)
4. Add comprehensive test coverage
5. Optimize dashboard performance
6. Implement real-time notifications
7. Add advanced analytics
8. Create mobile-optimized interface
