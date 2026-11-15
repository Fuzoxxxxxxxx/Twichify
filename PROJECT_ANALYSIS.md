# Twichify/Spotify-Now-Playing - Project Analysis

_Dernière mise à jour : 15/11/2026 — alignée sur la version **3.19.0** du changelog (`src/lib/changelog.ts`)._

## Executive Summary

**Twichify** is a comprehensive Twitch streamer ecosystem platform that integrates Spotify music playback with multiple streaming overlays and chat management tools. Built with Next.js, React 19, TypeScript, and MongoDB, it provides real-time music widget display, chat overlays, a rotating information-banner overlay, chatbot integrations, an in-app notification center, a feature-request box with votes, a public changelog, and comprehensive admin/support infrastructure (ticket statistics, satisfaction survey, targeted announcements) built on a six-level role and permission system.

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
- **Fonts**: widget font library in `src/lib/widget-fonts.ts` (3 system fonts + 21 Google Fonts families), loaded in the visitor's browser from `fonts.googleapis.com`
- **Chat Integration**: tmi.js 1.8.5 (Twitch Chat client)
- **HTTP**: Axios 1.13.5
- **Validation / Email**: Zod 4.5.4, Resend 6.26 (declared dependencies)
- **Security**: AES-256-GCM encryption of Spotify credentials at rest (`src/lib/crypto.ts`, requires `ENCRYPTION_KEY`)
- **Deployment**: Vercel Hobby, functions pinned to the Paris region (`cdg1`, next to the Atlas cluster in AWS eu-west-3). Hobby crons are limited to once a day, so service health checks are triggered every minute by an external pinger (cron-job.org)

### Deployment
- Deployed on Vercel (Hobby plan, region `cdg1`); no Vercel cron: `vercel.json` only pins the region
- Health checks come from an external pinger calling `/api/cron/check-status` every minute with `Authorization: Bearer $CRON_SECRET`
- Support alerts (tickets unanswered for 48 h+) piggy-back on that same pinger (`runSupportAlertsThrottled`, at most once per 15 min per server instance) and are also exposed on `/api/cron/support-alerts` (same `CRON_SECRET` protection)
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
  - **Animation**: entry/exit style (expand, reveal, slide, fade, pop) and speed (slow / normal / fast), soft title + cover transition on each track change, pulsing glow (`lib/widget-animation.ts`)
  - **Fonts**: 3 system fonts or the Google Fonts library (`widgetSettings.fontFamily` = `font-sans`, `font-mono`, `font-serif` or `google:<Family>`)
- Progress bar with current/total time display
- Album cover art display with optional rotation effect
- Smooth animations powered by Framer Motion

### B. **Dashboard (User Control Panel)** ✅
- Sidebar navigation grouped by category (v3.3.0):
  - **Accueil** (`/dashboard`): redesigned in v3.17.0 — header with the avatar and the state of Spotify, Twitch and widgets, then one card per widget (music, chat) with its OBS link, **Personnaliser** and **Tester** buttons, and a live status (online / offline / never loaded in OBS, see section U). Links are masked by default (eye button reveals them for 20 s, Copy always copies the full link), "Régénérer les liens" kept
  - **Intégrations → Spotify** (`/dashboard/spotify`): 4-step walkthrough until the account is linked, then the live now-playing track shown large to check that everything works, with the settings (Client ID/Secret, Redirect URI, re-link, disconnect) below. Reminds that Spotify Premium is required (v3.17.0)
  - **Intégrations → Bot** (`/dashboard/bot`): 3 steps since v3.17.0 — pick the platform, paste a single script (as a command or as a Timer), write the message. `{artist}`, `{title}` and `{song}` insert on click; the preview uses the real current track with a 500-character counter
  - **Widgets → Musique** (`/dashboard/design`): music widget customization
  - **Widgets → Chat** (`/dashboard/chat`): chat widget themes, presets, moderation
  - **Widgets → Bandeau** (`/dashboard/banner`): information-banner widget (section S)
  - **Analyse → Statistiques** (`/dashboard/stats`): listening history
  - **Analyse → Twitch** (`/dashboard/twitch`): channel statistics (followers, live, videos, clips)
  - **Compte & données** (`/dashboard/account`): export, deletion, sessions, diagnostics, resets (reached from the profile menu at the bottom of the sidebar, together with ideas, changelog, help and service status; on mobile through the "Plus" drawer of the bottom bar)
  - **Notifications** (`/dashboard/notifications`): full notification history, reached from the bell in the sidebar header (section T)
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
- **Bot hiding** (v3.17.0): "Masquer Bots" hides the known bots of `lib/known-bots.ts` (Nightbot, StreamElements, Streamlabs, Moobot, WizeBot, Fossabot…) plus the streamer's own `hiddenBots` list (exact logins, `sanitizeBotList`, 200 max). The former "nickname contains bot" rule was removed because it hid real viewers and skewed chat statistics
- **Détecter** button (`GET /api/user/chat-bots/detect`): reads the viewers currently connected to the chat on demand (scope `moderator:read:chatters`, `lib/twitch-chatters.ts`, up to 5 pages of 1 000, 15 s memory cache, never stored), returns the known bots present and suggestions (logins ending in "bot") that the streamer confirms before adding
- Font: system fonts or Google Fonts (`chatWidgetSettings.fontFamily`)
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
- Categories: the same 14 keys as the FAQ (`lib/faq-categories.ts`, v3.17.0), so a request lands directly in the right place; the legacy keys (spotify, obs, api, compte, autre) still exist
- Message threading within tickets
- Ticket status tracking: En Attente → En Cours → Résolu → Fermé
- Admin dashboard for ticket management
- Staff-only endpoints with permission-based access control (`manageTickets`)
- Claim / release: a single staff member is active on a ticket at a time
- "Is typing" indicator for both user and staff (`/typing` route, v2.0.20)
- Clickable links in messages, keyboard shortcuts (Enter, Shift+Enter, Enter+Space to send and resolve)
- Paginated ticket list for users
- **Satisfaction survey** (v3.16.0): once a ticket is resolved or closed, the requester answers "Ça a réglé ton problème ?" (yes / no + optional comment up to 500 chars) via `POST /api/support/tickets/[id]/satisfaction` (requester only, 409 while the ticket is open, can change their mind while it stays closed). A first "no" notifies the last staff member who replied (`ticket_feedback`)
- **Stale-ticket alerts** (v3.16.0, `lib/support-alerts.ts`): a ticket waiting for a staff reply for more than 48 h notifies the assignee, or every user holding `manageTickets` when nobody claimed it; reminder at most every 24 h (`staffAlertedAt`), 20 alerts max per run

### F. **FAQ Management** ✅
- Dynamic FAQ articles by category
- Admin can create/edit/delete articles
- 14 categories shared by the model, the API validation, the admin, the help page and, since v3.17.0, support tickets (`src/lib/faq-categories.ts`, single source: key, label, description, display order): `demarrage` (Premiers pas), `spotify`, `bot`, `obs` (OBS & overlays), `chat`, `bandeau` (Widget bandeau), `twitch`, `stats`, `statut`, `compte`, `securite`, `api`, `communaute` (Idées & support), `autre`. Support tickets use the same keys (a category added there becomes a ticket category too; the legacy keys `spotify`, `obs`, `api`, `compte`, `autre` are unchanged).
- **Reader feedback** (15/11/2026): each open article ends with "Cet article vous a-t-il aidé ?" (`components/FaqFeedback.tsx`, Oui / Non, thanks message, link to a new ticket after a "Non"). Anonymous counters `helpfulYes` / `helpfulNo` on `FaqArticle`, incremented by `POST /api/faq/[id]/feedback` (public; one count per visitor, article and day through an in-memory IP map, never stored). The choice is remembered in the browser (`localStorage`), so the reader cannot vote twice by mistake. `GET /api/faq` hides the counters; `GET /api/faq?stats=1` returns them for `manageFaq` only. The admin FAQ page shows the counters on each article and an "À revoir" filter (3 votes or more and more "non" than "oui"); editing an article's answer resets its counters (audit log mentions it)
- The help page only lists categories that contain articles (with counts and a description of the selected one); articles are grouped by category in display order
- Public FAQ retrieval endpoint
- Article ordering system
- Help center (`/help`): search, category filter chips, paginated accordion, light formatting in answers (`**bold**`, lines starting with "Note" highlighted), re-open welcome guide button, links to tickets

### G. **Admin Dashboard** ✅
- Pages: overview (`/admin`), tickets, FAQ, ideas, users, support statistics (`/admin/support`), announcements (`/admin/announcements`), status incidents (`/admin/status`), owner space (`/admin/owner`)
- Sidebar groups (`AdminShell`, same `ShellNav` building blocks as the user dashboard): Support (Tickets, Statistiques, FAQ), Communauté (Idées, Annonces), Administration (Utilisateurs, Statut, Propriétaire); items and empty groups are hidden without the matching permission, pending tickets and ideas to study show as badges
- Ticket statistics overview and recent tickets
- FAQ article management and ideas moderation (status + official response)
- Users list (sort by name, role, sign-up date, Spotify status), role changes, account deletion
- **Reply templates** (`src/lib/reply-templates.ts`, picker `components/ReplyTemplatePicker.tsx`): 26 ready-made support replies (general, Spotify, OBS, chat, Twitch/stats, account, API; variables `{pseudo}` and `{signature}`) inserted into the ticket reply box, and 8 official replies for ideas that also propose the matching status. A template is only inserted, never sent: the agent reviews, edits, then sends. Suggested tab = general + the ticket's own category
- **Ideas moderation** (`/admin/ideas`, `manageIdeas`): processing queue (to handle = under study without a reply, no reply, replied), sort by recent / oldest / popular, official reply limited to 1 000 characters with a live public preview, unsaved-changes guard and Ctrl+Enter, "remove the reply" action, **private staff notes** (50 max, 500 chars each) and a **history** of the last 30 decisions (status changes, reply published / edited / removed, with who and when). Staff data (`internalNotes`, `history`, `officialResponse.by`) lives on the `Idea` document, is excluded from the public `GET /api/ideas` by projection and served only by `GET /api/admin/ideas`; every real change is written to the audit log (`idea.update`) and an unchanged save writes nothing. Deleting a staff account anonymizes their signature on notes, history and replies (content kept)
- **Public comments on ideas** (`IdeaComment` collection, `lib/idea-comments.ts`): readable by anyone, posting requires login; plain text only (never linkified), 500 chars, 15 s cooldown and 40/day per user, latest 100 shown; staff badge from the author's role at write time; author ids never exposed (`mine` / `canDelete` computed server-side); deletion by the author or by staff with `manageIdeas` (staff deletions go to the audit log, `idea.comment.delete`); `GET /api/ideas` adds `commentCount`. Account deletion anonymizes comments (no staff badge); the data export includes them
- **Ticket internal notes & transfer**: `SupportTicket.internalNotes` is declared `select: false` so no public or owner-facing route ever returns it; only staff routes ask for `+internalNotes` (`GET /api/support/tickets/[id]` for staff readers, `/notes`, `/transfer`). Any staff member can add a note on any ticket (deletion: author or higher level; 50 notes, 1 000 chars). **Transfer / escalation** (`POST /api/support/tickets/[id]/transfer`, staff list in `GET /api/support/staff`): allowed to the assignee, a higher level, or on a free ticket; target must hold `manageTickets`; refused on resolved/closed tickets; concurrency-safe (409 if the ticket changed hands meanwhile); the requester only sees the system message "La conversation a été transférée à …", the reason becomes an internal note
- Every admin page is guarded server-side (`requirePagePermission`) and redirects to `/403?from=...` without the right permission; sections are hidden in the nav when the permission is missing
- **Support statistics** (`/admin/support`, `manageTickets`, `GET /api/admin/support/stats?days=7|30|90`, pure functions in `lib/support-stats.ts`): tickets created per day, first-response delay (average / median, share answered within 24 h), resolution rate and delay, split by category and status, oldest waiting tickets (backlog), activity of each staff member, satisfaction rate and the latest "not solved" feedback with their comments; indicators are compared with the previous period of equal length
- **Announcements** (`/admin/announcements`, `ownerZone` so creator / co-creator only; `GET/POST /api/admin/announcements`, `lib/announcements.ts`, `lib/announcement-types.ts`, v3.16.0): sends a notification to a group — all users, new this week (derived from the ObjectId timestamp, the User model has no `createdAt`), Spotify connected / not connected, widget never detected (`widgetSeen`), staff. The recipient count is previewed before sending (`?audience=`), title 80 and message 300 chars, internal links only (`isInternalPath`), an identical send is refused for 10 min (409), the last 20 sends are kept in the `Announcement` collection (one row per send, not per recipient) and every send is audit-logged (`announcement.send`). Delivery inserts one `Notification` per recipient, in batches of 1 000

### H. **Status Monitoring & Incidents** ✅ (rebuilt in v3.13.0)
- Public page `/status` (same visual language as the changelog/help pages): global state card tinted by situation, key figures, one card per service (Spotify API, Twitch API, Overlays Server), a separate "Émotes du chat" section for the third-party emote services (BetterTTV, 7TV, FrankerFaceZ), incidents in progress, incident history as a timeline
- Bars: **90 minutes** (one bar per calendar minute) or **24 hours** (one bar per UTC hour), aligned on the clock so a measurement always lands in the same bar; a minute without data inherits the last known state for 2 minutes, then turns grey ("Aucune donnée"), never a false green
- **Checks** (`src/lib/status-checker.ts`): every minute, all probes run in parallel: GET on the Spotify and Twitch APIs (anonymous, so any response < 500 counts as up), GET on the **public global emote lists** of BetterTTV (`/3/cached/emotes/global`), 7TV (`/v3/emote-sets/global`) and FrankerFaceZ (`/v1/set/global`) where only a 2xx counts as up (a 404 or 429 means a changed address or a block that would silently break the chat widget), and a MongoDB ping (warm-up ping first, then the measured one). 4 s timeout and 1 retry per probe, response bodies are cancelled (status only). Service names/groups live in `SERVICE_NAMES` / `SERVICE_GROUPS` (`lib/status-checker.ts`); incidents can target any of them (`lib/incidents.ts`). Triggered by the external pinger (`/api/cron/check-status`, secret header, fail-closed without `CRON_SECRET`) and by a **lazy probe** run via `after()` from `/api/status` when the last check is older than 90 s
- **One check per calendar minute**: an atomic lock in `statusmeta` (`slot` = floor(epoch / 60 s)) so the pinger and the lazy probe never double-run; check timestamps are aligned on the minute
- **Current state** from the last 3 checks (Down = 2 failures out of 3, Degraded = last check failing or 2 anomalies, Unknown after 5 min without data). An hour is red from 2 failed checks
- **Real traffic** (`src/lib/passive-health.ts`): the widgets' real calls to Spotify (now-playing route), Twitch (`lib/twitch.ts`, badges routes) and the emote providers (`/api/emotes/[channel]`) are counted in memory and flushed in batches to `statuspassive` (per service and minute). Only network errors and 5xx count as failures (4xx depend on the user's account). ≥ 50 % failures over 10 min with ≥ 20 calls downgrades an operational service to Degraded (never to Down); the card shows the number of calls and the error rate
- **Storage tiers**: raw logs `statuslogs` (TTL **3 h**, 90-min bars and current state), hourly aggregates `statushourly` (TTL 48 h, 24-h bars, rebuilt automatically from raw logs when they lag), daily aggregates `statusdaily` (TTL 95 d, 30-day availability), real traffic `statuspassive` (TTL 12 h). The TTL change on `statuslogs` is applied automatically (`collMod`, fallback drop/recreate) after freezing the old logs into the hourly aggregates
- Displayed "Latence BDD" = median of the last 10 MongoDB pings measured by the checks (not the API response time); `apiLatency` is returned separately. `/api/status` is CDN-cached 15 s (`s-maxage`)
- **Incidents** (`/admin/status`, permission `manageStatus`): create an incident (service, impact, status, public message with templates), publish updates, mark resolved, reopen, delete; a banner shown for a down service without an incident proposes to create one. Public side: incidents of the last 7 days (`incidents` collection, creator never exposed)
- **Global banner link**: an incident can also be published in the site-wide banner (`lib/incident-banner.ts`, `SiteSettings.banner.incidentId`): level from the impact, removed automatically when the incident is resolved or deleted, never overwrites a manual owner announcement, detached if the owner saves a manual announcement
- Audit log entries for incident creation, update and deletion
- The dashboard sidebar status link ("Système en ligne" / "Service dégradé" / "Panne en cours") reads `/api/status` every 60 s and only counts the `core` services (Spotify, Twitch, server); emote services are left out (v3.17.0)

### I. **User Settings & Configuration** ✅
- Spotify client ID/secret configuration
- Chat widget settings persistence
- Widget design customization storage
- Bot message settings
- Canvas settings (1920x1080 default)
- Information-banner widget settings (`bannerWidgetSettings`, section S)

### J. **Listening Statistics** ✅
- Total milliseconds listened
- Total tracks played counter
- Last played track tracking
- Last poll timestamp
- Track change detection
- Accumulated listening time per session
- Detailed history (`TrackHistory`, v2.0.18): top tracks/artists, activity by hour, recent plays, filter 7 / 30 / 90 days / all time; TTL 180 days
- Stats written to the DB in batches (v3.2.1), no duplicate entries for the same track
- **Stats page v3.12.0** (`/dashboard/stats`, shared UI in `components/dashboard/StatsUI.tsx`): 4 tabs (overview, rankings, habits, history) + a global period selector (7 / 30 / 90 days / all). Overview: 8 KPIs (listening time with sparkline and delta vs the previous period of equal length, plays, distinct tracks/artists, daily average, current/longest streak, sessions, longest session, skip rate), per-day chart (minutes or tracks), artist discoveries. Rankings with covers (artist "avatar" = latest album cover, no artist image is stored). Habits: day × hour heatmap, day parts, peak hour, favourite weekday. History: skipped plays marked (< 15 s) and hideable, up to 100 rows
- `GET /api/user/listening-history?period=&limit=&tz=`: hours, days and streaks are computed in the browser's IANA timezone (validated, default Europe/Paris). Sessions = plays separated by < 30 min of silence (computed on the last 30 000 plays); discoveries compare the period's artists with the history before it (hidden for "all" or when there is no earlier history); skips (< 15 s) are excluded from rankings and totals

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
- One-click reset of widget settings (music, chat, bot) or listening stats, independently (resetting listening stats asks for a confirmation since v3.17.0, because it also erases the detailed history)
- Identity header of `/dashboard/account` shows three status badges (music, chat, banner). "Actif" means configured, not loaded in OBS: music = Spotify linked, chat = Twitch name known, banner = at least one message (`bannerMessages` in `getDataSummary`, read with `+bannerWidgetSettings` and `sanitizeInfoBanner`)

### N. **Regenerable Widget Links** ✅ (v3.2.0)
- Widget and bot URLs use a random 128-bit `widgetToken` instead of the account `_id`
- Legacy `_id` links keep working until the user regenerates; regenerating disables them for good (`widgetLegacyIdDisabled`)
- New accounts get a token at creation and no legacy link

### O. **Public Site Shell** ✅
- Shared `SiteHeader` (sticky navbar) on all public pages (v3.5.0), `Pagination` component, global `SiteBanner`
- Redesigned error pages 403 / 404 / 500 and a `global-error` fallback
- Home page with animated music, chat and banner widget previews using demo data and the real render engine
- Site redesign (v3.14.0): shared public frame (`components/site/PublicShell.tsx`, `PageIntro.tsx`, `SiteFooter.tsx`), redesigned error and auth pages, sober dashboard style, accessibility pass (visible keyboard focus, aria states, reduced motion); on phones the public header links open in a dropdown menu; the shared public frame uses tighter margins on small screens (`px-4`), page titles drop to `text-3xl`, and the privacy page stacks its cards and full-width call to action, with long tokens allowed to wrap
- Pre-login consent page `/auth/connexion` (v3.17.0): explains each Twitch permission in plain language and what Twichify cannot do; the list is derived from `lib/twitch-scopes.ts`, so a new scope appears there automatically (with a generic text if nobody wrote an explanation)
- Public `/changelog` (versioned, deep link `#vX.Y.Z`), `/privacy` (CGU + GDPR rights), `/mentions-legales`, `/a-propos` (project presentation, features, principles, contact; v3.18.0)

### R. **Terms Versioning** ✅ (v3.11.0)
- `lib/terms.ts` is the single source: `TERMS_REVISED_AT` (date of the last *material* revision), `TERMS_REVISED_LABEL` (display), `TERMS_CHANGES` (what changed in THIS revision, shown to returning users), `hasAcceptedCurrentTerms()`
- `GET /api/user/accept-terms` now answers `hasAcceptedTerms` against the current revision (`acceptedTermsAt >= TERMS_REVISED_AT`) plus `isUpdate`, `revisedLabel`, `changes`; both existing call sites (home page, `DashboardShell`) keep working unchanged on `!hasAcceptedTerms` and just pass the update info to `TermsModal` (title "Nos conditions ont évolué" + change list)
- `/privacy` shows `TERMS_REVISED_LABEL` as its "last updated" date, so page and prompt cannot drift apart
- **Process**: bump the date + replace `TERMS_CHANGES` only for material changes (new data, permission, processing, third party, retention), never for typo fixes
- Acceptance is still enforced client-side by the modal (as before), not by an API guard
- Current revision: **29/10/2026** (`TERMS_REVISED_AT`), triggered by the new read-only Twitch permission `moderator:read:chatters` used for on-demand bot detection (the viewer list is not stored; only the bot logins the streamer adds are)

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
- **Departures (unfollows)**: Twitch exposes no unfollow history, so this is an opt-in snapshot diff stored in `FollowerTracking` (**Twitch ids only**, as numbers: ~11 bytes per follower instead of ~100; 5 000 followers max, 200 departures kept as id + detection date + `accountGone`). Usernames and avatars of departures are re-read from Twitch by id at display time (`fetchUserInfos`); only a deleted/banned account keeps its last known username. Legacy documents (`{i,l,n,f}` entries) are rewritten to ids only on first read (`compactDocument`). A returning follower is removed from the departures list. A scan reads the full followers list (cursor-paginated, rejected if incomplete), compares it to the previous snapshot, flags accounts that no longer exist (`accountGone`), 5 min cooldown, in-memory lock per user, automatic scan on tab open if last one is older than 30 min. `POST {action: enable|scan}`, `DELETE` removes everything. Included in account deletion and in the JSON export (counts only)
- Scrollbars restyled globally in `globals.css` (`-webkit-` rules for Chromium/Safari, `scrollbar-color` only for Firefox, `.twichify-scroll` for card lists)
- **Followers tab**: full list paginated by cursor (page size 10/25/50/100, previous/next/start, quick filter on the current page; Twitch only paginates forward so the client keeps the cursor stack), gains 24 h / 7 d / 30 d, daily chart (7/14/30 days, bucketed client-side in the browser timezone)
- Gains and chart use a sample of the 300 latest followers (3 pages of 100); values are marked `+` / greyed when the sample does not reach back far enough
- **Contenu tab**: last 20 VODs aggregates (avg views, avg duration, hours streamed over 30 days, best VOD), 6 latest VODs, top clips of 30 days (up to 100 analysed) + top clippers, upcoming schedule segments (ignored on 404)
- Followers need the `moderator:read:followers` scope on the **user** token; everything else uses the app token
- Team lists (v3.7.0): moderators (`moderation:read`), VIPs (`channel:read:vips`), editors (`channel:read:editors`, with date added); each list has its own status so a missing scope only affects that card, and the 100 first entries are returned (`+` when truncated)
- User token lives in the NextAuth `accounts` collection; it is refreshed with the `refresh_token` when expired (one refresh at a time per user, new refresh token persisted)
- `events.signIn` in the NextAuth config now writes the fresh token/scope on every sign-in (v4 does not update an existing linked account)
- Accounts created before v3.6.0 get a "reconnect" banner (`force_verify`) until they re-authorize; nothing is stored beyond the token, results are cached 30 s in memory

### S. **Information Banner Widget** ✅ (v3.17.0 → v3.18.0)
- Rotating OBS overlay: up to 10 messages (140 characters, plain text, one line) such as social links, chat commands or partners. Edited in Dashboard → Widgets → Bandeau (`/dashboard/banner`, `GET/POST /api/user/banner-widget-setup`), rendered by `/widget/banner/[token]` through `components/widget/InfoBannerView.tsx` (`?test=1` shows sample messages and a "Mode test" tag)
- **Single source of truth** `lib/info-banner.ts`: defaults, bounds (`INFO_BANNER_LIMITS`) and `sanitizeInfoBanner`, applied on every read and every write. The schema field `bannerWidgetSettings` is free-form (`Mixed`) and `select: false` because it can hold custom logos; only the banner routes, the export and the reset ask for it explicitly. A former boolean `showAccent` is migrated to `accentStyle`, and a message stored as a plain string is still accepted
- **Per-message design**: platform logo (`lib/info-banner-icons.ts`: Discord, YouTube, TikTok, Twitch, Instagram, X, Kick…) or custom logo (5 max, PNG / JPEG / WebP data URI of at most 40 000 characters, shrunk in the browser, never SVG), own text / background / accent colors and background opacity. `messageFromBrand` applies the brand colors in one click with a readable text color
- **Global look**: font picker (`components/dashboard/FontPicker.tsx`, dark list, each font in its own typeface, keyboard navigation), size 12–160 px, weight, uppercase, colors and opacity, accent (none / left bar / bottom bar / outline), shadow (none / soft / glow), radius, paddings, alignment, width 240–1920 px or full width, logo scale / position / style (plain or round chip), frosted-glass blur 0–40 px, optional progress bar showing the time left before the next message, animation (fade / slide / pop / expand) and speed, interval 3–60 s, shuffle without repeating the same message twice in a row
- 6 quick styles (`INFO_BANNER_PRESETS`: Sobre, Gros titre, Pastille, Néon, Verre, Épuré) only change the look, never messages, logos, interval or animation; `recommendedSourceSize()` suggests the OBS browser-source size
- **Config endpoint** `GET /api/widget/banner/config/[userId]` (widget token auth) is polled every 5 s by the widget with an `ETag` and `Cache-Control: no-cache`, so the answer is an empty 304 while nothing changed; the widget only re-renders when the serialized settings differ, so a running rotation is not interrupted
- Install tracking: the banner widget reports its loads like the other two (`widgetSeen.bannerAt`, section U) and shows an online / offline state on the dashboard home and counts in the "X of 3 online" tile. Also present: animated preview on the home page (`components/home/BannerWidgetPreview.tsx`), FAQ / support category `bandeau`, inclusion in the JSON export

### T. **Notification Center** ✅ (v3.15.0 → v3.16.0)
- `Notification` model (`userId` as string, `type`, `title`, `body`, `href`, `readAt`, `dedupeKey`), TTL of 90 days on `createdAt`. `notify()` in `lib/notifications.ts` never throws, so a missed notification can never fail the main action (message sent, status changed…)
- Types (`lib/notification-types.ts`, shared server / client): `ticket_reply`, `ticket_status`, `ticket_user_reply` (staff: the requester answered a ticket you hold), `idea_status`, `idea_response`, `idea_comment`, `announcement`, `ticket_stale` (staff), `ticket_feedback` (staff)
- **Grouping**: when an unread notification with the same `dedupeKey` already exists it is updated and moved to the top instead of duplicated, so several replies in a row show as one
- **UI**: `NotificationBell` in the sidebar header of the dashboard and of the admin (floating button on mobile); `useNotifications` polls every 60 s (paused while the tab is hidden, refresh when it becomes visible), applies actions optimistically then reconciles with the server; page `/dashboard/notifications` (unread filter, delete, mark all read, clear read)
- **API** `GET /api/user/notifications?limit=&unread=1` (default 30, max 100, `no-store`, returns `unreadCount`) and `POST` with actions `read`, `readAll`, `delete`, `clearRead`, always scoped to the caller's own `userId`
- Staff alerts and announcements are described in sections E and G

### U. **Install Tracking (widget presence)** ✅ (v3.17.0)
- `User.widgetSeen.{musicAt, chatAt, bannerAt}` stores the last real load of each widget in OBS. Widgets send `?w=1` on their data requests; test mode (`?test=1`) and dashboard previews never count (`lib/widget-seen.ts`). Writes are limited to one per minute per widget and per server instance
- `GET /api/user/setup-status` returns only booleans and dates, never credentials: `spotifyCredentials`, `spotifyConnected`, `twitchLogin`, `musicSeenAt` (falls back to `listeningStats.lastPollAt` so accounts installed before the tracking are not sent back to "finish the installation"), `chatSeenAt`, `bannerSeenAt`. It feeds the setup assistant (`SetupWizard`, `StepRail`) and the online / offline / never-loaded state of the widget cards
- The same field powers the "Widget jamais détecté" announcement audience (none of the three widgets ever loaded)

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
- `GET /api/widget/banner/config/[userId]` - Information-banner settings for the OBS widget (widget token auth, `ETag` + `no-cache` so the 5 s polling gets an empty 304 while nothing changed)

### Support & Admin
- `POST /api/support/tickets` - Create new support ticket
- `GET /api/support/tickets` - Get user's tickets
- `GET /api/support/tickets/[id]` - Get specific ticket
- `POST /api/support/tickets/[id]/messages` - Add message to ticket
- `PATCH /api/support/tickets/[id]/status` - Update ticket status (staff only)
- `POST /api/support/tickets/[id]/claim` and `/release` - Take over / release a ticket (staff only)
- `POST /api/support/tickets/[id]/typing` - "Is typing" ping
- `POST /api/support/tickets/[id]/satisfaction` - Requester answers the "problem solved?" survey (yes / no + comment); ticket must be resolved or closed
- `POST /api/support/tickets/[id]/notes`, `POST /api/support/tickets/[id]/transfer`, `GET /api/support/staff` - Internal notes, transfer / escalation and staff list (staff only)
- `GET /api/admin/tickets` - Get all tickets (staff only)
- `POST /api/admin/faq` - Create FAQ article (staff only)
- `GET /api/admin/faq` - List FAQ articles (internal only)
- `PUT /api/admin/faq/[id]` - Update FAQ article (staff only)
- `DELETE /api/admin/faq/[id]` - Delete FAQ article (staff only)
- `GET /api/admin/support/stats?days=7|30|90` - Support statistics: volumes, response / resolution delays, backlog, staff activity, satisfaction (`manageTickets`)
- `GET/POST /api/admin/announcements` - Targeted announcements: history of the last 20 sends, `?audience=` recipient count preview, send (`ownerZone`)
- `/api/admin/users`, `/api/admin/users/[id]` - User list, role change, deletion (permission-based)
- `/api/admin/owner/overview`, `/settings`, `/audit` - Owner space: overview, global announcement, audit log (`ownerZone`)
- `GET/POST /api/admin/incidents`, `PATCH/DELETE /api/admin/incidents/[id]` - Status incidents: list, create (optional banner), publish update / change status / toggle banner, delete (`manageStatus`)

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
- `GET/POST /api/user/notifications` - Notification list with unread count (`?limit=`, `?unread=1`); actions `read`, `readAll`, `delete`, `clearRead`
- `GET/POST /api/user/banner-widget-setup` - Read / save the information-banner settings (everything goes through `sanitizeInfoBanner`)
- `GET /api/user/chat-bots/detect` - Detect bots among the viewers currently connected to the chat (scope `moderator:read:chatters`, nothing stored)
- `GET /api/user/setup-status` - Install state for the dashboard (credentials present, Spotify linked, last real load of each widget in OBS)
- `/api/user/onboarding-state` - Welcome guide and last-seen changelog version

### System
- `GET /api/faq` - Public FAQ retrieval
- `GET/POST /api/ideas`, `POST /api/ideas/[id]/vote`, `PATCH /api/ideas/[id]/status` - Ideas box, votes, moderation
- `GET /api/site-banner` - Active global announcement
- `GET /api/status` - Public status: per-service state, 90-min and 24-h bars, 24-h / 30-day availability, real-traffic figures, median DB latency, last 7 days of incidents (CDN-cached 15 s; also triggers the lazy probe)
- `GET /api/twitch/badges/[login]` - Retrieve Twitch user badges
- `GET /api/twitch/global-badges` - Retrieve Twitch global badges
- `GET /api/cron/check-status` - Health checks (called every minute by the external pinger; `Authorization: Bearer $CRON_SECRET`, 503 without the secret, 401 if wrong; answers `skipped: true` when the minute is already covered)
- `GET /api/cron/support-alerts` - Stale-ticket alerts for staff (same `CRON_SECRET` protection as `check-status`, 503 without the secret; also triggered, throttled to once per 15 min per instance, by `check-status`)
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
  widgetSeen: { musicAt: Date, chatAt: Date, bannerAt: Date }   # last real load of each widget in OBS (lib/widget-seen)
  
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
    animationStyle: enum["expand", "reveal", "slide", "fade", "pop"]   # default "expand"
    animationSpeed: enum["slow", "normal", "fast"]
    trackChangeAnimation: Boolean (default true)
    glowPulse: Boolean
    fontFamily: "font-sans" | "font-mono" | "font-serif" | "google:<Family>"
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
    hiddenBots: [String]   # streamer's own bots (exact logins), on top of lib/known-bots
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
  
  # Information-banner widget (free-form, validated by sanitizeInfoBanner, select: false)
  bannerWidgetSettings: Mixed

  # Chat statistics (opt-in, disabled by default)
  chatStats: { enabled: Boolean, enabledAt: Date }

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
  category: enum from FAQ_CATEGORY_KEYS (14 keys, lib/faq-categories.ts; default "autre")
  internalNotes: [{ text, by: { userId, name, role }, createdAt }]   # select: false, staff routes only
  satisfaction: { rating: enum["yes", "no"], comment: String, ratedAt: Date }   # survey once resolved / closed
  staffAlertedAt: Date                                 # last stale-ticket alert sent to staff
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

### Status collections (native driver, no Mongoose model)
```
statuslogs   { service, status: operational|degraded|down, latencyMs, timestamp }   # TTL 3 h, one doc per service per minute
statushourly { _id: "Service|YYYY-MM-DDTHH", service, hour, total, operational, degraded, down }   # TTL 48 h
statusdaily  { _id: "Service|YYYY-MM-DD", service, day, total, operational, degraded, down }        # TTL 95 d
statuspassive{ _id: "Service|<minute slot>", service, minute, total, errors }                       # TTL 12 h, real widget calls
statusmeta   { _id: "checker", slot, lastStartedAt }                                                # per-minute lock
incidents    { title, service, impact, status, description, updates[{message,status,createdAt}],
               createdAt, updatedAt, resolvedAt, bannerActive, createdBy }                          # createdBy never exposed publicly
```
(The former `StatusLog` Mongoose model is no longer used by the checks.)

### Notification Model
```
{
  userId: String (required)          # account _id as a string
  type: enum["ticket_reply", "ticket_status", "ticket_user_reply", "idea_status", "idea_response",
             "idea_comment", "announcement", "ticket_stale", "ticket_feedback"]
  title: String (required, 160 max)
  body: String (300 max)
  href: String | null                # internal link
  readAt: Date | null
  dedupeKey: String | null           # an unread notification with the same key is updated instead of duplicated
  createdAt: Date (TTL: 90 days)
}
# indexes: { userId, createdAt: -1 }, { userId, readAt }
```

### Announcement Model (history of staff sends, one row per send)
```
{
  title: String (required)
  body: String
  href: String | null
  audience: String                   # all | new_week | spotify | no_spotify | no_widget | staff
  recipientCount: Number
  sentBy: { userId, name, role }
  createdAt: Date
}
```

### FollowerTracking Model
```
{
  user: ObjectId (unique)
  followers: [Number]            # Twitch ids only (legacy documents may still hold { i, l, n, f } until first read)
  departures: [{ id, detectedAt, accountGone, login?, name? }]   # login/name only kept for a deleted/banned account; max 200
  baselineAt, scannedAt: Date
}
```

### FaqArticle Model
```
{
  question: String (required)
  answer: String (required)
  category: enum from `FAQ_CATEGORY_KEYS` (lib/faq-categories.ts, 14 keys; default "autre")
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
  banner: { enabled, message (max 200), level: info|warning|critical, startsAt, expiresAt, updatedAt, incidentId }   # incidentId set when published from a status incident
}
```

### AuditLog Model
```
{
  actorId, actorName, actorRole: String
  action: String (e.g. "role.change", "idea.update", "announcement.send")
  targetId, targetName, details: String
  createdAt: Date (TTL: 180 days)
}
```

---

## 5. Authentication & Authorization

### Authentication Strategy
- **Provider**: Twitch OAuth via NextAuth (scopes: `openid user:read:email moderator:read:followers moderation:read channel:read:vips channel:read:editors channel:read:subscriptions bits:read moderator:read:chatters`; the list lives in `src/lib/twitch-scopes.ts`, which also feeds the `/auth/connexion` consent explainer)
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

Permissions (matrix `ROLE_PERMISSIONS`): `viewAdminPanel`, `manageTickets`, `manageFaq`, `viewUsers`, `manageRoles`, `deleteUsers`, `manageIdeas`, `manageStatus` (admin and above), `ownerZone`.

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
- `src/lib/twitch-scopes.ts` - Single source of the requested Twitch scopes and their plain-language explanations
- `src/lib/known-bots.ts`, `src/lib/twitch-chatters.ts` - Known chat bots, `sanitizeBotList`, on-demand list of connected viewers
- `src/lib/twitch-user.ts` also holds the identity sync: `saveTwitchIdentity` (name and avatar, written only when changed) and `syncTwitchIdentity` (re-reads the Twitch profile by the stable `providerAccountId`, at most every 6 h per instance). It runs on sign-in (`events.signIn`, from the fresh OAuth profile), when the chat widget config is read (so the widget joins the right channel after a rename) and when the Twitch stats are loaded. Before 15/11/2026 NextAuth v4 only set `users.name` at account creation, so a renamed streamer kept the old name

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
- **Providers.tsx** - React providers wrapper (NextAuth session, `DialogProvider`)
- **DialogProvider.tsx** - `useDialog()`: `confirm()` (promise-based, reuses `ConfirmDialog`) and `notify()` (always-on toast); replaces every browser `alert` / `confirm`
- **SiteHeader.tsx** - Sticky public navbar (Changelog, Idées, Aide, login / profile)
- **SiteBanner.tsx** - Global announcement banner (hidden on OBS overlays)
- **WelcomeModal.tsx** / **ChangelogModal.tsx** - Onboarding guide and "Quoi de neuf" modal
- **Pagination.tsx** - Shared pagination hook + component (changelog, ideas, FAQ, tickets)
- **DashboardShell.tsx** / **AdminShell.tsx** / **AdminNav.tsx** - Grouped navigation for dashboard and admin
- **dashboard/** - `DashboardUI`, `ConfirmDialog`, `useToast`, `useWidgetToken`
- **home/** - `MusicWidgetPreview`, `ChatWidgetPreview` (demo data, real render engine)
- **ErrorScreen**, **NotFoundContent**, **ForbiddenContent** - 403 / 404 / 500 screens
- **IdeaStatusBadge**, **LinkifiedText**, **LegalFooter**, **Logo**
- **notifications/** - `NotificationBell`, `NotificationIcon`, `useNotifications` (60 s polling), `format.ts`
- **shell/** - `ShellNav` (shared sidebar / mobile bar building blocks for dashboard and admin; `MobileNav` shows 4 `primary` items + a "Plus" drawer fed by the `more` prop, with `SheetLink` / `SheetLabel` helpers), `ProfileMenu` (desktop popover)
- **site/** - `PublicShell`, `PageIntro` / `LegalSection`, `SiteFooter`, `LegalToc`, `AuthNotice`, `TwitchConnectButton`
- **widget/** - `InfoBannerView` (banner rendering shared by the OBS widget, the dashboard preview and the home), `PresenceShell` (CSS enter / exit animations), `useWidgetFont`
- **dashboard/** - also `SetupWizard`, `StepRail`, `FontPicker`, `WidgetUI`, `UnsavedChangesBar`, `ChatStatsTab`, `StatsUI`
- **AdminNav.tsx** - former top-tab navigation; `AdminShell` no longer uses it (check for remaining imports before deleting)

### Main Pages
- **Home (/)** - Landing page with feature overview, animated widget previews, roadmap, setup steps, call to action
- **Dashboard (/dashboard)** - User control panel, sub-pages: `/spotify`, `/bot`, `/design` (Widgets → Musique), `/chat`, `/banner`, `/stats`, `/twitch`, `/account`, `/notifications`
- **Admin (/admin)** - Admin home, ticket/FAQ management
- **Admin FAQ (/admin/faq)** - FAQ article editor
- **Admin Ideas (/admin/ideas)** - Ideas moderation (status, official response)
- **Admin Users (/admin/users)** - Users, roles, deletion
- **Admin Owner (/admin/owner)** - Owner space (announcement, permissions matrix, audit log)
- **Admin Status (/admin/status)** - Status incidents: create, publish updates, resolve, banner toggle
- **Admin Support (/admin/support)** - Support statistics (period 7 / 30 / 90 days)
- **Admin Announcements (/admin/announcements)** - Targeted announcements (owner space permission)
- **Admin Tickets (/admin/tickets/[ticketId])** - Ticket thread viewer
- **Support New (/support/new)** - Create new support ticket
- **Support My Tickets (/support/my-tickets)** - View user tickets
- **Support Ticket (/support/[ticketId])** - View specific ticket
- **Help (/help)** - Help center: searchable, paginated FAQ + welcome guide + support links
- **Ideas (/ideas)** - Ideas box with votes
- **Changelog (/changelog)** - Versioned update history
- **Status (/status)** - Public service status: state card, 90-min / 24-h bars, availability, real-traffic figures, incidents
- **Privacy (/privacy)** - Privacy policy and terms (CGU)
- **Mentions légales (/mentions-legales)** - Legal notice
- **À propos (/a-propos)** - Project presentation: features, principles, tech and hosting summary, contact
- **Widget Spotify (/widget/[userId])** - Embeddable music widget
- **Widget Chat (/widget/chat/[userId])** - Embeddable chat widget
- **Widget Banner (/widget/banner/[userId])** - Embeddable information-banner widget (`?test=1` for sample messages)
- **Auth Cancelled (/auth/cancelled)** - Login error page
- **Auth Connexion (/auth/connexion)** - Pre-login consent page listing every Twitch permission and why it is asked
- **Auth Not linked (/auth/not-linked)** - Error page when the Twitch account is already associated elsewhere
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
- On-demand list of viewers connected to the streamer's chat (`/chat/chatters`, scope `moderator:read:chatters`) for bot detection

### Chatbot Platforms
- **Nightbot** - JSON response parsing
- **Wizebot** - Plain text response
- **StreamElements** - JSON response
- **StreamLabs** - Plain text response
- All receive: currently playing track, artist, formatted message

### Third-party Libraries
- **tmi.js** - Twitch Chat IRC client (for chat widget)
- **axios** - HTTP requests to external APIs
- **Google Fonts** - font families of the widgets, fetched by the browser (`fonts.googleapis.com`), with a font picker in the dashboard

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
- **Excluded Users**: Known bots (`lib/known-bots.ts`) and the streamer's `hiddenBots` list when "Masquer Bots" is on

### C. Information Banner Widget (`/widget/banner/[userId]`)
- **Display**: messages (up to 10) shown one after the other, each for 3–60 s, optional shuffle and progress bar
- **Refresh Rate**: settings re-read every 5 s with an `ETag` (empty 304 while unchanged), so edits in the dashboard appear without reloading the OBS source
- **Customization**: per-message logo and colors plus ~25 global settings (details in section S)
- **OBS Integration**: Browser source URL `/widget/banner/[token]`; recommended source size from `recommendedSourceSize()` (1920 px wide in full-width mode); transparent background

---

## 9. Missing Features or Incomplete Functionality

### Roadmap Items (From Home Page)
Roadmap shown on the home page (3 items as of v3.18.0, all still to build; the "latest followers widget" and "chat statistics" items were removed, chat statistics shipped in v3.10.0):
1. **More music platforms** - Deezer, YouTube Music, Apple Music, SoundCloud (Prioritaire)
2. **Chat song requests** - viewers propose tracks, queue shown as overlay (Planifié)
3. **Discord notifications** - go-live with game, title and now playing (En réflexion)

### Potential Gaps
1. **Notification System** - Delivered in v3.15.0 (bell + history page, staff alerts); it is polling every 60 s, with no push, e-mail or Discord channel
2. **Webhook Support** - No Discord webhook integration for alerts
3. **Advanced Analytics** - Limited stats beyond basic listening metrics
4. **Multi-account Support** - Single Spotify account per user
5. **Scheduled Messages** - No message scheduling for bots
6. **Rate Limiting** - No global rate limiting; only targeted limits exist (idea comments cooldown and daily cap, chat-stats ingestion per user, Twitch scan cooldown, announcement duplicate guard)
7. **Error Handling** - Some API responses could be more descriptive
8. **Widget Preview** - Live previews exist for chat and bot in the dashboard; music widget preview to be checked
9. **Emote Display** - Delivered (BTTV / 7TV / FFZ in chat widget)
10. **Mobile Dashboard** - Bottom bar limited to 4 shortcuts plus a "Plus" drawer (remaining pages, account, help, ideas, changelog, service status, moderation link, logout; admin: back to dashboard) since 15/11/2026; public header links open in a dropdown on phones; a page-by-page review of the content pages is still to do

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
- **Token Storage**: Spotify credentials are encrypted at rest (AES-256-GCM, `ENCRYPTION_KEY`); the Twitch user token stays in the NextAuth `accounts` collection
- **Admin Checks**: Some admin endpoints might need additional verification

### D. User Experience
- **Loading States**: Add skeleton loaders and better loading indicators
- **Error Messages**: More user-friendly error explanations in UI
- **Onboarding**: Welcome guide delivered (v3.0.0), re-openable from the Help center
- **Dark Mode**: Already dark, but could have theme toggle
- **Accessibility**: Improved in v3.14.0 (visible keyboard focus, aria states, reduced motion); a full audit is still worthwhile
- **Responsive Design**: Some pages need mobile optimization

### E. Feature Enhancements
- **Widget Analytics**: Track widget views and clicks
- **A/B Testing**: Test different widget designs
- **Custom Branding**: Allow users to add custom logos/watermarks
- **Multiple Widgets**: Support multiple widgets per user (e.g., next track preview)
- **Spotify Playlist Support**: Display/cycle through playlists
- **Auto-backup**: Automatic settings export/import
- **Notification Center**: Delivered in v3.15.0 for users and staff; push / e-mail delivery still absent
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
6. **Privacy** - `lib/account-data.ts` now deletes the user's `Notification` documents with the account and the JSON export includes notifications (500 latest) and the satisfaction answer of each ticket (fixed 14/11/2026)
7. **Leftovers** - `components/AdminNav.tsx` is no longer used by `AdminShell`; the directories `api/user/follow-widget-setup` and `api/widget/follow/[userId]` are empty (probably from a dropped "latest followers" widget, whose roadmap item was removed)
8. **Per-instance state** - the stale-alert throttle, `widgetSeen` write limit, passive health counters and several caches live in server memory, so on serverless they are approximate (acceptable at the current scale)
9. **`StatusLog` is not dead code** - it is the read model of the `statuslogs` collection, which `lib/status-checker.ts` writes with the native driver and `api/admin/owner/overview` reads through Mongoose (services block of the owner page). Watch out: the model declares a 24 h TTL index on `timestamp` while the checker enforces 3 h (`LOG_TTL_SECONDS`, via `collMod`), so the two definitions disagree; align the model with the checker or drop the index declaration from the model

### Low Priority
1. **CSS Organization** - Could use CSS modules or Tailwind layers
2. **Constants File** - Magic values should be centralized
3. **Type Definitions** - Could improve type organization with separate types file

---

## 12. Project Statistics

### Codebase Metrics
- **Models**: 13 files in `src/models` (User, SupportTicket, FaqArticle, Idea, IdeaComment, TrackHistory, SiteSettings, AuditLog, FollowerTracking, ChatSession, Notification, Announcement; StatusLog is the read model of the `statuslogs` collection written by the status checker)
- **API Routes**: ~75 route files
- **Pages**: ~39 pages (public, dashboard, admin, support, auth, widgets)
- **Components**: ~54 files (shared, dashboard, notifications, shell, site, widget, home previews)
- **Lib modules**: 43 files in `src/lib`
- **External Integrations**: 4+ (Spotify, Twitch, Chatbots, BTTV / 7TV / FFZ)
- **Database**: MongoDB with ~18 collections (12 Mongoose + 6 native status collections, + NextAuth adapter collections)

### Key File Sizes
- Dashboard: split into 9 sub-pages plus the home (`/dashboard/*`); sizes not re-measured since v3.13.0
- Spotify widget: ~350 lines
- Auth config: ~50 lines
- Models: ~500 lines total

---

## 13. Deployment Configuration

### Vercel Setup
- **File**: `vercel.json` - pins the functions to the Paris region (`"regions": ["cdg1"]`, same area as the Atlas cluster in AWS eu-west-3); no `crons` block (Hobby only allows daily crons)
- **Health checks**: external pinger (cron-job.org), GET `/api/cron/check-status` every minute with the header `Authorization: Bearer <CRON_SECRET>`; a lazy probe in `/api/status` covers a missed beat
- **Support alerts**: run from the same pinger call (throttled, at most once per 15 min per instance) and callable directly on `/api/cron/support-alerts` (hourly is enough), same bearer secret

### Environment Variables Required
```
DATABASE_URL=mongodb://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Twitch OAuth
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...

# Encryption of Spotify credentials (AES-256-GCM, 64 hex chars)
ENCRYPTION_KEY=...

# Secret of the external status pinger (Authorization: Bearer ...)
CRON_SECRET=...

# Spotify (user-provided)
# Stored per-user in database
```

---

## 14. User Flow & Workflows

### New User Onboarding
1. Click "Connexion" on home page
2. Consent explainer page `/auth/connexion` (each permission and why), then redirect to Twitch OAuth
3. Accept permissions and redirect back
4. Terms modal appears
5. Accept terms
6. Redirect to dashboard

### Spotify Setup Workflow
Prerequisites: Spotify Premium (needed by the owner of a Spotify app in development mode) and a free Spotify developer application
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
6. Banner widget URL: `/widget/banner/[token]`, customized in Dashboard → Widgets → Bandeau
7. Links are masked on the Accueil page (eye button, 20 s); the widget cards then show whether each widget has really loaded in OBS

### Support Ticket Workflow
1. User creates ticket in Support → New
2. Ticket stored with status "en_attente"
3. Admin views ticket in Admin panel
4. Admin updates status and adds messages
5. User receives updates on ticket page
6. Ticket marked "resolu" or "ferme" when complete
7. Requester answers the "problem solved?" survey; a first "no" notifies the last staff member who replied
8. A ticket left without a staff reply for 48 h triggers an alert to its assignee (or to all ticket staff if unclaimed)

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
✅ Measurable support quality (statistics, satisfaction survey, stale-ticket alerts)
✅ In-app notifications for users and staff
✅ Defensive input handling on the recent features (`sanitizeInfoBanner`, `sanitizeBotList`, internal-link-only announcements, per-user caps)

### Primary Recommendations
1. **Refactor Dashboard** - Split into multiple smaller components
2. **Add Validation** - Implement input validation across all APIs
3. **Improve Testing** - Add unit and integration tests
4. **Database Optimization** - Use connection pooling and caching
5. **Error Handling** - Standardize error responses
6. **Documentation** - Add API docs and architecture guides
7. **Performance** - Add monitoring and performance optimization
8. **Security** - Implement rate limiting and input sanitization
9. **Privacy hygiene** - Done for notifications and ticket satisfaction (section 11); keep the export and the deletion in step with every new collection

### Next Steps for Development
1. Multi-platform music (Deezer first): abstract the "now playing" provider behind a common interface before adding services
2. Add webhook support for Discord notifications
3. Extend notifications beyond the app (e-mail, push or Discord); in-app alerts already cover replies, stale tickets and unsolved feedback (v3.15–v3.16)
4. Add comprehensive test coverage
5. Optimize dashboard performance
6. Move notifications from 60 s polling to real time (SSE / push) if the volume justifies it
7. Add advanced analytics
8. Create mobile-optimized interface
