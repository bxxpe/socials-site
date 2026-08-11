# socials-site

A [guns.lol](https://guns.lol)-style link-in-bio page — dark, animated, and fast — with a private
dashboard where you customize everything. Built with React + Vite, zero UI frameworks, no bloat.

Live at **[bxxpe.dev](https://bxxpe.dev)**.

## Features

- **Public profile page** (`/`) — click-to-enter screen, animated particle background, glow orbs,
  3D tilt card with light sheen, looping typewriter bio, animated tab title, avatar glow, view
  counter, optional background music with a volume dock.
- **Private dashboard** (`/dashboard`) — email + password login. Edit profile, add/remove/reorder
  **unlimited social links** (27 platforms: Discord, X, Instagram, TikTok, YouTube, Twitch, Kick,
  Spotify, SoundCloud, Last.fm, GitHub, Steam, Valorant, Epic, League, Roblox, NameMC, Telegram,
  Snapchat, Reddit, Pinterest, LinkedIn, PayPal, Cash App, OnlyFans, email, website).
- **Live Discord presence** — connect Discord via OAuth and your page shows a Discord card with
  your status dot, custom status, current game (art + elapsed timer), and Spotify (album art +
  live progress bar). Your **avatar decoration** frames both avatars and your **nameplate**
  animates behind the Discord card if you own them. Optionally use your Discord avatar as your
  profile picture.
- **Spotify player** — when you're listening, the page embeds Spotify's official player for the
  exact track and follows along as you change songs. Visitors press play themselves: full track if
  they're signed into Spotify, preview otherwise. (Spotify audio **cannot** be rebroadcast from
  your session — no API exposes the stream, and relaying it would break Spotify's terms and music
  licensing. The embed is the sanctioned way to let visitors hear what you're playing.)
- **Uploads** — avatar, background, and music upload straight from your machine to Supabase
  Storage. Backgrounds accept images, GIFs, and **videos** (mp4/webm, rendered as a muted loop).
- **Customization** — accent color (presets + custom), background color/image/video with blur and
  brightness sliders, 8 fonts (system + Google Fonts, loaded with `display=swap`), card opacity
  and blur, mono or brand-colored icons, toggle every effect, enter-screen text, live preview
  while you edit.
- **Cursor trail** — three styles (glow, comet, sparkle) in your accent or a custom color. Canvas
  only, self-stops when idle, off on touch and reduced-motion.
- **Discord badges** — public profile badges (HypeSquad, Active Developer, Early Supporter…)
  decoded from `public_flags`. Nitro and boosting aren't in public data, so no site can show them.
- **Local time** — an optional live clock on your card showing *your* timezone (not the
  visitor's), with a full IANA timezone picker, a "use mine" detect button, and 12/24-hour choice.
  It also tells each visitor how far ahead or behind they are ("you're 3h ahead"), computed from
  their own timezone and correct for DST and half-hour zones like India (+5:30) and Nepal (+5:45).
- **Custom tab icon** — upload or link a favicon that replaces the browser-tab icon on your page.
- **Legal pages** — `/privacy` and `/terms`, linked from the bottom-left and bottom-right corners
  of the page and from the dashboard sidebar.
- **Fast on purpose** — animations only use GPU-composited `transform`/`opacity`, particles render
  from one pre-baked sprite on a single canvas, the tilt loop sleeps when idle, every page is
  code-split, and `prefers-reduced-motion` is respected.

## Quick start (local)

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. With no `.env` the site runs in **demo mode**: any email/password
opens the dashboard and edits save to localStorage. Add Supabase keys (below) for the real thing.

## Environment variables

Copy `.env.example` to `.env`. The same variables go into Vercel under
**Project Settings → Environment Variables**.

| Variable | Required | What it is |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes | Project URL, e.g. `https://xxxx.supabase.co` — **bare origin**, no `/rest/v1` |
| `VITE_SUPABASE_ANON_KEY` | yes | The **publishable** key (`sb_publishable_…`), or `anon public` on older projects |
| `VITE_DISCORD_CLIENT_ID` | no | Discord app Client ID — enables the "connect discord" button |
| `VITE_OWNER_USERNAME` | no | Pins which profile `/` shows; only matters with multiple accounts |

Never put the Supabase **secret** key (`sb_secret_…`) in here — this site doesn't use it, and it
bypasses row-level security.

## Supabase setup (database, login, storage)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   The file is idempotent, so re-run it any time it changes.
3. **Storage → New bucket** → name it `media`, turn **Public** on. (Some projects don't allow
   creating buckets from SQL; the policies in the schema still apply to it.)
4. Copy the Project URL and publishable key into `.env`.
5. Run the site, open `/login`, and **create your account** — that account owns the page.
6. Recommended: **Authentication → Sign In / Providers → disable new sign-ups** so the dashboard
   stays yours alone. If sign-up asks for email confirmation, either confirm it or turn off
   **Confirm email** in the same settings.

## Deploying (Vercel)

1. Import the repo at [vercel.com](https://vercel.com) — Vite is auto-detected.
2. Add the environment variables above, then deploy. Env vars are baked in at **build** time, so
   changing one requires a redeploy.
3. Custom domain: **Settings → Domains**. Point the domain's nameservers at
   `ns1.vercel-dns.com` / `ns2.vercel-dns.com`, or add the `A` record Vercel shows at your
   registrar. HTTPS is issued automatically.

Netlify and Cloudflare Pages work too — `public/_redirects` and `vercel.json` both handle SPA
routing.

## Discord live presence

Two independent pieces, both free — no bot and no client secret:

**1. The "connect discord" button (OAuth).** Create an app in the
[Discord developer portal](https://discord.com/developers/applications) → **OAuth2 → Redirects**
→ add every origin you use, exactly:

```
http://localhost:5173/discord/callback
https://bxxpe.dev/discord/callback
```

Click **Save Changes** (easy to miss), then put the **Client ID** in `VITE_DISCORD_CLIENT_ID`.
The OAuth token is used once in the browser to read `/users/@me` and is never stored. The Discord
tab also accepts a manually pasted user ID if you'd rather skip OAuth.

**2. The live feed ([Lanyard](https://github.com/Phineas/lanyard)).** Join the
[lanyard discord server](https://discord.gg/lanyard) with your account so its bot can see your
presence. The dashboard's Discord tab has a live checker that confirms the moment it works, and
reports whether your decoration and nameplate were detected.

## Where things live

```
src/
  pages/ProfilePage.jsx        public page (enter gate, views, audio, corner links)
  pages/LoginPage.jsx          sign in / sign up
  pages/DashboardPage.jsx      the whole dashboard
  pages/DiscordCallback.jsx    discord oauth landing
  pages/PrivacyPage.jsx        /privacy — linked bottom-left
  pages/TermsPage.jsx          /terms — linked bottom-right
  components/ProfileView.jsx   the profile card (shared with the live preview)
  components/DiscordPresence.jsx  discord card: nameplate, decoration, spotify, activity
  components/Particles.jsx     canvas background
  components/AudioDock.jsx     floating volume pill
  components/ui.jsx            form kit + upload button
  hooks/useLanyard.js          live presence websocket
  hooks/useTypewriter.js       looping type/delete effect
  hooks/useTilt.js             3d card tilt
  lib/store.js                 supabase <-> localStorage backend switch + uploads
  lib/discord.js               oauth url, cdn helpers, lanyard rest
  lib/icons.jsx                platform registry (add platforms here)
  lib/defaults.js              default profile config
supabase/schema.sql            tables, row-level security, view counter, storage bucket
```

### Adding another platform

Add one line to `PLATFORMS` in `src/lib/icons.jsx` (icons from
[simple-icons](https://simpleicons.org)) — it appears in the dashboard dropdown immediately.

## Notes

- Uploads are capped at 50MB per file; the Supabase free tier gives 1GB total. Keep background
  videos short and small (5–15s, under ~20MB) or the page gets slow for visitors.
- The view counter increments once per browser session through a locked-down SQL function —
  visitors can't touch anything else in the database.
- The typewriter runs two independent loops: the bio on the card, and the `@handle` in the browser
  tab title.
