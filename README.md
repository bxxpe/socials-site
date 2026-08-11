# socials-site

A [guns.lol](https://guns.lol)-style link-in-bio page — dark, animated, and fast — with a private
dashboard where you customize everything. Built with React + Vite, zero UI frameworks, no bloat.

## Features

- **Public profile page** (`/`) — click-to-enter screen, animated particle background, glow orbs,
  3D tilt card with light sheen, typewriter bio, avatar glow, view counter, optional background
  music with a volume dock.
- **Private dashboard** (`/dashboard`) — email + password login. Edit profile, add/remove/reorder
  **unlimited social links** (28 platforms: Discord, X, Instagram, TikTok, YouTube, Twitch, Kick,
  Spotify, SoundCloud, Last.fm, GitHub, Steam, Valorant, Epic, League, Roblox, NameMC, Telegram,
  Snapchat, Reddit, Pinterest, LinkedIn, PayPal, Cash App, OnlyFans, email, website…).
- **Customization** — accent color (presets + custom), background color or image, card opacity +
  blur, mono/brand-colored icons, toggle every effect, enter-screen text, music URL, live preview
  while you edit.
- **Live Discord presence** — connect Discord via OAuth and your page shows a Discord card with
  your status dot, custom status, current game (with art + elapsed timer), and Spotify (album art
  + live progress bar), exactly like guns.lol. Your **avatar decoration** frames both avatars and
  your **nameplate** animates behind the Discord card if you own them. Optionally use your Discord
  avatar as the profile picture.
- **Fast on purpose** — animations only use GPU-composited `transform`/`opacity`, particles render
  from one pre-baked sprite on a single canvas, the tilt loop sleeps when idle, the dashboard is
  code-split so visitors never download it, and `prefers-reduced-motion` is respected.

## Quick start (local)

```bash
npm install
npm run dev
```

That's it — with no configuration the site runs in **demo mode**: any email/password opens the
dashboard and edits save to your browser's localStorage. Perfect for playing with the design.

## Going live for free (recommended: Vercel + Supabase)

Both free tiers are more than enough for a personal page. Supabase gives you a real login + real
database; Vercel hosts the site on a global CDN and redeploys on every git push.

### 1. Supabase (login + database) — ~5 minutes

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project: **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), hit **Run**.
3. Copy your **Project URL** (Project Settings → Data API) and your **publishable key**
   (Project Settings → API Keys → `sb_publishable_...`). On older projects the equivalent is the
   `anon public` key — either works. The **secret key** (`sb_secret_...`) is never used by this
   site; keep it out of `.env` and the repo.
4. Copy `.env.example` to `.env` and fill both values:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```

5. Run the site, open `/login`, and **create your account** — that account owns the page.
6. (Recommended) Back in Supabase: **Authentication → Sign In / Providers → disable "Allow new
   users to sign up"** — now the dashboard is yours alone forever.

> If sign-up says "check your email", confirm it, or turn off **Confirm email** in
> Authentication settings for instant access.

### 2. Vercel (hosting) — ~3 minutes

1. Push this repo to GitHub (already done if you're reading this there).
2. On [vercel.com](https://vercel.com), **Add New → Project → Import** the repo. Vite is
   auto-detected.
3. Add the two environment variables from your `.env` under **Environment Variables**.
4. Deploy. Every future `git push` redeploys automatically. Custom domains are free under
   **Settings → Domains**.

Netlify and Cloudflare Pages work identically (a `_redirects` file for Netlify SPA routing is
already included; `vercel.json` covers Vercel).

## Discord live presence (like guns.lol)

Two independent pieces — both free, no bot and no client secret:

**1. The "connect discord" button (OAuth)** — proves the account is yours and grabs your
id/name/avatar automatically:

1. Open the [Discord developer portal](https://discord.com/developers/applications) →
   **New Application** → any name.
2. **OAuth2 → Redirects** → add `http://localhost:5173/discord/callback` (and later your
   production URL, e.g. `https://yoursite.vercel.app/discord/callback`).
3. Copy the **Client ID** into `.env` as `VITE_DISCORD_CLIENT_ID=...` (also add it on Vercel),
   restart the dev server, then hit **connect discord** in Dashboard → Discord.

The OAuth token is used once in your browser to read `/users/@me` and is never stored.
(Prefer not to OAuth? The tab also accepts your user id pasted manually.)

**2. The live activity feed ([Lanyard](https://github.com/Phineas/lanyard))** — the standard
presence source these sites use. Join the [lanyard discord server](https://discord.gg/lanyard)
with your account (their bot reads your presence) and you're done — the Discord tab has a live
checker that tells you the moment it's working. Toggles let you pick what shows: status dot,
Discord avatar, current activity, Spotify.

## Where things live

```
src/
  pages/ProfilePage.jsx     the public page (enter gate, views, audio)
  pages/LoginPage.jsx       sign in / sign up
  pages/DashboardPage.jsx   the whole dashboard
  components/ProfileView.jsx  the actual profile card (shared with live preview)
  components/DiscordPresence.jsx  spotify + activity panels on the card
  components/Particles.jsx  canvas background
  hooks/useLanyard.js       live presence websocket
  pages/DiscordCallback.jsx discord oauth landing
  lib/discord.js            oauth url, cdn helpers, lanyard rest
  lib/store.js              Supabase <-> localStorage backend switch
  lib/icons.jsx             platform registry (add more platforms here)
  lib/defaults.js           default profile config
supabase/schema.sql         database schema + row-level security
```

### Adding another platform

Add one line to `PLATFORMS` in `src/lib/icons.jsx` (icons come from
[simple-icons](https://simpleicons.org)) — it immediately appears in the dashboard dropdown.

## Notes

- Avatar / background / music support **direct uploads** (stored in a public Supabase Storage
  bucket, 50MB per file, 1GB total on the free tier) or pasted URLs. Backgrounds accept images,
  GIFs, and videos (mp4/webm — rendered as a muted loop); avatars accept images and GIFs. The
  storage bucket + policies are created by `supabase/schema.sql` — if you ran an older version of
  the schema, just run the whole file again (it's idempotent).
- The view counter increments once per browser session via a locked-down SQL function — visitors
  can't touch anything else.
- `VITE_OWNER_USERNAME` in `.env` pins which profile shows on `/` (only matters if more than one
  account ever exists).
