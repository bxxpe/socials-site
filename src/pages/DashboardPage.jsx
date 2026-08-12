import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import ProfileView from '../components/ProfileView'
import { Field, Toggle, Segmented, Slider, AccentPicker, CopyRow, UploadButton } from '../components/ui'
import { PLATFORMS, platformOf, SocialIcon } from '../lib/icons'
import { newId } from '../lib/defaults'
import { allZones, localZone } from '../hooks/useClock'
import { FONTS } from '../lib/fonts'
import { THEMES } from '../lib/themes'
import { CURSOR_THEMES, cursorThemeOf } from '../lib/cursors'
import { geocode } from '../lib/weather'
import { PERIODS, LASTFM_KEY } from '../lib/lastfm'
import { badgesFrom, badgeUrl, MANUAL_BADGES } from '../lib/badges'
import { displayNameStyle, DISPLAY_FONTS } from '../lib/discordStyles'
import {
  discordAuthorizeUrl,
  discordAvatarUrl,
  decorationUrl,
  restPresence,
  pickActivity,
  STATUS_COLORS,
  STATUS_LABELS,
  ACTIVITY_VERBS,
} from '../lib/discord'
import { getSession, onAuthChange, signOut, fetchMyProfile, saveProfile, demoMode } from '../lib/store'
import { PageLoader } from '../App'

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'socials', label: 'Socials' },
  { id: 'discord', label: 'Discord' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'account', label: 'Account' },
]

const stripVolatile = ({ views, fresh, ...rest }) => rest

// Built once — the browser's full IANA list is a few hundred entries.
const ZONES = allZones()

export default function DashboardPage() {
  const location = useLocation()
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [savedObj, setSavedObj] = useState(null)
  const [tab, setTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [toast, setToast] = useState('')
  const [manualId, setManualId] = useState('')
  const [geoQuery, setGeoQuery] = useState('')
  const [geoResults, setGeoResults] = useState([])
  const [geoBusy, setGeoBusy] = useState(false)
  const [dcCheck, setDcCheck] = useState({ state: 'idle' })
  const toastTimer = useRef(0)

  useEffect(() => {
    document.title = 'dashboard'
    getSession().then(setSession)
    return onAuthChange(setSession)
  }, [])

  useEffect(() => {
    if (!session?.user) return
    fetchMyProfile(session.user.id, session.user.email).then((p) => {
      setProfile(p)
      setSavedObj(stripVolatile(p))
    })
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Landed here from the Discord OAuth callback -> open the tab + confirm.
  useEffect(() => {
    if (location.state?.discordConnected) {
      setTab('discord')
      setToast('discord connected ✓')
      const t = setTimeout(() => setToast(''), 2200)
      window.history.replaceState({}, '')
      return () => clearTimeout(t)
    }
  }, [location.state])

  // Auto-check lanyard presence whenever the Discord tab is open.
  useEffect(() => {
    const id = profile?.config?.discord?.user_id
    if (tab !== 'discord' || !id) return
    let alive = true
    setDcCheck({ state: 'loading' })
    restPresence(id).then((r) => {
      if (!alive) return
      setDcCheck(r.ok ? { state: 'ok', data: r.data } : { state: 'fail', error: r.error })
    })
    return () => {
      alive = false
    }
  }, [tab, profile?.config?.discord?.user_id])

  const dirty = useMemo(
    () => profile && savedObj && JSON.stringify(stripVolatile(profile)) !== JSON.stringify(savedObj),
    [profile, savedObj]
  )

  if (session === undefined) return <PageLoader />
  if (session === null) return <Navigate to="/login" replace />
  if (!profile) return <PageLoader />

  const cfg = profile.config
  const dc = cfg.discord
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID
  const patch = (obj) => setProfile((p) => ({ ...p, ...obj }))
  const patchCfg = (obj) => setProfile((p) => ({ ...p, config: { ...p.config, ...obj } }))
  const patchFx = (obj) =>
    setProfile((p) => ({ ...p, config: { ...p.config, effects: { ...p.config.effects, ...obj } } }))
  const patchDc = (obj) =>
    setProfile((p) => ({ ...p, config: { ...p.config, discord: { ...p.config.discord, ...obj } } }))

  const flash = (text) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1800)
  }

  const trySave = async (p = profile) => {
    setSaveErr('')
    if (!/^[a-z0-9_.]{2,24}$/.test(p.username)) {
      setSaveErr('username must be 2–24 chars: lowercase letters, numbers, dots, underscores')
      return false
    }
    setSaving(true)
    try {
      await saveProfile(p)
      setSavedObj(stripVolatile(p))
      return true
    } catch (ex) {
      setSaveErr(ex.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  const doSave = async () => {
    if (await trySave()) flash('saved ✓')
  }

  const reset = () => {
    setProfile((p) => ({ ...p, ...structuredClone(savedObj) }))
    setSaveErr('')
  }

  const connectDiscord = async () => {
    // The redirect leaves the page, so persist any pending edits first.
    if (dirty && !(await trySave())) return
    window.location.href = discordAuthorizeUrl(clientId)
  }

  const runGeocode = async () => {
    if (!geoQuery.trim()) return
    setGeoBusy(true)
    try {
      setGeoResults(await geocode(geoQuery.trim()))
    } catch (ex) {
      flash(ex.message || 'city lookup failed')
    } finally {
      setGeoBusy(false)
    }
  }

  const recheckPresence = async () => {
    if (!dc.user_id) return
    setDcCheck({ state: 'loading' })
    const r = await restPresence(dc.user_id)
    setDcCheck(r.ok ? { state: 'ok', data: r.data } : { state: 'fail', error: r.error })
  }

  // ---- socials helpers ----
  const setSocial = (id, obj) =>
    patchCfg({ socials: cfg.socials.map((s) => (s.id === id ? { ...s, ...obj } : s)) })
  const removeSocial = (id) => patchCfg({ socials: cfg.socials.filter((s) => s.id !== id) })
  const moveSocial = (i, dir) => {
    const next = [...cfg.socials]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    patchCfg({ socials: next })
  }
  const addSocial = () =>
    patchCfg({ socials: [...cfg.socials, { id: newId(), platform: 'discord', url: '' }] })

  const checkedActivity = dcCheck.state === 'ok' ? pickActivity(dcCheck.data) : null
  const checkedUser = dcCheck.state === 'ok' ? dcCheck.data.discord_user : null
  const dcDecoAsset = checkedUser?.avatar_decoration_data?.asset || dc.decoration
  const detectedBadges = badgesFrom(checkedUser?.public_flags ?? dc.public_flags)
  const liveStyles = displayNameStyle(checkedUser?.display_name_styles, {
    fontOverride: dc.name_font_override,
  })

  return (
    <div className="dash" style={{ '--accent': cfg.accent }}>
      <aside className="dash-side">
        <div className="brand">
          <span className="brand-dot" />
          <span className="brand-name">socials</span>
        </div>
        <nav className="dash-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'nav-on' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="dash-side-foot">
          <div className="side-stat">
            <span>views</span>
            <b>{Intl.NumberFormat().format(profile.views || 0)}</b>
          </div>
          <a className="btn btn-ghost btn-block" href="/" target="_blank" rel="noreferrer">
            view your page ↗
          </a>
          <button
            className="btn btn-ghost btn-block"
            onClick={async () => {
              await signOut()
              setSession(null)
            }}
          >
            sign out
          </button>
          <small className="side-email">{session.user.email}</small>
          <div className="side-legal">
            <a href="/privacy" target="_blank" rel="noreferrer">
              privacy
            </a>
            <span>·</span>
            <a href="/terms" target="_blank" rel="noreferrer">
              terms
            </a>
          </div>
        </div>
      </aside>

      <main className="dash-main">
        {demoMode && (
          <div className="demo-note">
            demo mode — edits save to this browser only. hook up Supabase (README, ~5 min) for real
            login + a real database.
          </div>
        )}

        {tab === 'profile' && (
          <section className="panel">
            <h2>Profile</h2>
            <Field label="username" hint="your handle — shows as @username">
              <input
                value={profile.username}
                onChange={(e) => patch({ username: e.target.value.toLowerCase().trim() })}
                placeholder="bxxpe"
                maxLength={24}
              />
            </Field>
            <Field label="display name">
              <input
                value={cfg.display_name}
                onChange={(e) => patchCfg({ display_name: e.target.value })}
                placeholder="bxxpe"
                maxLength={40}
              />
            </Field>
            <Field label="bio" hint={`${cfg.bio.length}/160`}>
              <textarea
                value={cfg.bio}
                onChange={(e) => patchCfg({ bio: e.target.value })}
                rows={3}
                maxLength={160}
                placeholder="say something"
              />
            </Field>
            <Field label="avatar" hint="upload an image or gif, paste a link — or connect discord and use your discord avatar">
              <div className="upload-row">
                <input
                  value={cfg.avatar_url}
                  onChange={(e) => patchCfg({ avatar_url: e.target.value.trim() })}
                  placeholder="https://…/you.png or .gif"
                />
                <UploadButton
                  accept="image/*"
                  kind="avatar"
                  onDone={(url) => patchCfg({ avatar_url: url })}
                  onError={flash}
                />
              </div>
            </Field>
            <Field
              label="tab icon"
              hint="the little icon in the browser tab — square png or gif works best (32×32 or 64×64)"
            >
              <div className="upload-row">
                <input
                  value={cfg.favicon_url}
                  onChange={(e) => patchCfg({ favicon_url: e.target.value.trim() })}
                  placeholder="https://…/icon.png"
                />
                {cfg.favicon_url && (
                  <img
                    className="favicon-preview"
                    src={cfg.favicon_url}
                    alt=""
                    onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                    onLoad={(e) => (e.currentTarget.style.visibility = 'visible')}
                  />
                )}
                <UploadButton
                  accept="image/png,image/gif,image/jpeg,image/svg+xml,image/x-icon,image/webp"
                  kind="favicon"
                  onDone={(url) => patchCfg({ favicon_url: url })}
                  onError={flash}
                />
              </div>
            </Field>
            <Field label="location" hint="optional">
              <input
                value={cfg.location}
                onChange={(e) => patchCfg({ location: e.target.value })}
                placeholder="somewhere"
                maxLength={40}
              />
            </Field>

            <Toggle
              label="show weather"
              hint="current conditions from open-meteo — free, no account, no api key"
              on={cfg.show_weather}
              onChange={(v) => patchCfg({ show_weather: v })}
            />
            {cfg.show_weather && (
              <div className="sub-settings">
                <Field label="location" hint={cfg.weather_place ? `using: ${cfg.weather_place}` : 'search for your city'}>
                  <div className="upload-row">
                    <input
                      value={geoQuery}
                      placeholder="e.g. austin"
                      onChange={(e) => setGeoQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), runGeocode())}
                    />
                    <button type="button" className="btn btn-ghost" onClick={runGeocode} disabled={geoBusy}>
                      {geoBusy ? 'searching…' : 'search'}
                    </button>
                  </div>
                </Field>
                {geoResults.length > 0 && (
                  <div className="geo-results">
                    {geoResults.map((r) => (
                      <button
                        key={`${r.lat},${r.lon}`}
                        type="button"
                        className="geo-opt"
                        onClick={() => {
                          patchCfg({ weather_place: r.place, weather_lat: r.lat, weather_lon: r.lon })
                          setGeoResults([])
                          setGeoQuery('')
                        }}
                      >
                        {r.place}
                      </button>
                    ))}
                  </div>
                )}
                <Field label="units">
                  <Segmented
                    value={cfg.weather_unit}
                    onChange={(weather_unit) => patchCfg({ weather_unit })}
                    options={[
                      { value: 'f', label: '°F' },
                      { value: 'c', label: '°C' },
                    ]}
                  />
                </Field>
              </div>
            )}

            <Toggle
              label="show top artists"
              hint="your most-played artists from last.fm"
              on={cfg.show_top_artists}
              onChange={(v) => patchCfg({ show_top_artists: v })}
            />
            {cfg.show_top_artists && (
              <div className="sub-settings">
                {!LASTFM_KEY && (
                  <div className="demo-note">
                    needs a free last.fm api key: grab one at{' '}
                    <a href="https://www.last.fm/api/account/create" target="_blank" rel="noreferrer">
                      last.fm/api
                    </a>
                    , then add <code>VITE_LASTFM_KEY=…</code> to <code>.env</code> (and to Vercel) and
                    redeploy. spotify can't do this from a static site — its top-artists endpoint
                    needs a server.
                  </div>
                )}
                <Field label="last.fm username">
                  <input
                    value={cfg.lastfm_user}
                    onChange={(e) => patchCfg({ lastfm_user: e.target.value.trim() })}
                    placeholder="your last.fm handle"
                  />
                </Field>
                <div className="two-col">
                  <Field label="time range">
                    <select
                      value={cfg.top_artists_period}
                      onChange={(e) => patchCfg({ top_artists_period: e.target.value })}
                    >
                      {PERIODS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="how many">
                    <select
                      value={cfg.top_artists_count}
                      onChange={(e) => patchCfg({ top_artists_count: Number(e.target.value) })}
                    >
                      {[3, 4, 5, 6, 8, 10].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            )}

            <Toggle
              label="show my local time"
              hint="a live clock on your card, in your timezone — visitors see your time, not theirs"
              on={cfg.show_time}
              onChange={(v) =>
                // Default to the timezone of whatever machine turned this on,
                // otherwise the clock would show each visitor their own time.
                patchCfg({ show_time: v, timezone: v && !cfg.timezone ? localZone() : cfg.timezone })
              }
            />
            {cfg.show_time && (
              <>
                <Field label="timezone">
                  <div className="upload-row">
                    <select
                      value={cfg.timezone || localZone()}
                      onChange={(e) => patchCfg({ timezone: e.target.value })}
                    >
                      {(ZONES.includes(cfg.timezone || localZone())
                        ? ZONES
                        : [cfg.timezone || localZone(), ...ZONES]
                      ).map((z) => (
                        <option key={z} value={z}>
                          {z.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => patchCfg({ timezone: localZone() })}
                    >
                      use mine
                    </button>
                  </div>
                </Field>
                <Toggle
                  label="24-hour clock"
                  on={cfg.time_24h}
                  onChange={(v) => patchCfg({ time_24h: v })}
                />
                <Toggle
                  label="show how far ahead/behind visitors are"
                  hint="adds “you're 3h ahead” next to your clock, worked out from each visitor's own timezone"
                  on={cfg.show_time_diff}
                  onChange={(v) => patchCfg({ show_time_diff: v })}
                />
              </>
            )}
          </section>
        )}

        {tab === 'socials' && (
          <section className="panel">
            <h2>Socials</h2>
            <p className="panel-sub">add as many as you want — reorder with the arrows.</p>
            <div className="social-list">
              {cfg.socials.map((s, i) => (
                <div className="social-row" key={s.id}>
                  <span className="social-row-icon">
                    <SocialIcon platform={s.platform} />
                  </span>
                  <select
                    value={s.platform}
                    onChange={(e) => setSocial(s.id, { platform: e.target.value })}
                    aria-label="platform"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={s.url}
                    onChange={(e) => setSocial(s.id, { url: e.target.value.trim() })}
                    placeholder={platformOf(s.platform).placeholder}
                    aria-label="link url"
                  />
                  <div className="row-btns">
                    <button className="mini" onClick={() => moveSocial(i, -1)} disabled={i === 0} aria-label="move up">↑</button>
                    <button className="mini" onClick={() => moveSocial(i, 1)} disabled={i === cfg.socials.length - 1} aria-label="move down">↓</button>
                    <button className="mini mini-danger" onClick={() => removeSocial(s.id)} aria-label="remove">×</button>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost" onClick={addSocial}>
              + add link
            </button>
          </section>
        )}

        {tab === 'discord' && (
          <section className="panel">
            <h2>Discord</h2>

            {!dc.user_id ? (
              <>
                <p className="panel-sub">
                  connect your discord and your page shows your <b>live status, current game, and
                  spotify</b> — exactly like guns.lol. authorization uses discord's official oauth;
                  nothing but your id, name, and avatar is stored.
                </p>

                {clientId ? (
                  <button className="btn btn-primary" onClick={connectDiscord}>
                    connect discord
                  </button>
                ) : (
                  <div className="demo-note">
                    one-time setup needed first: create the discord app below, then add{' '}
                    <code>VITE_DISCORD_CLIENT_ID</code> to your <code>.env</code> and restart the dev
                    server — the connect button appears here after that.
                  </div>
                )}

                <h3>one-time app setup (discord's end)</h3>
                <ol className="dc-steps">
                  <li>
                    open the{' '}
                    <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
                      discord developer portal
                    </a>{' '}
                    → <b>New Application</b> → name it whatever
                  </li>
                  <li>
                    go to <b>OAuth2</b> → under <b>Redirects</b> add:
                    <CopyRow value={`${window.location.origin}/discord/callback`} />
                    (when you deploy, come back and add your live domain too, e.g.{' '}
                    <code>https://yoursite.vercel.app/discord/callback</code>)
                  </li>
                  <li>
                    copy the <b>Client ID</b> from the same page into your <code>.env</code>:
                    <CopyRow value="VITE_DISCORD_CLIENT_ID=paste_client_id_here" />
                    no bot, no client secret needed.
                  </li>
                </ol>

                <h3>prefer not to oauth?</h3>
                <div className="dc-manual">
                  <input
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value.replace(/\D/g, ''))}
                    placeholder="paste your discord user id"
                    aria-label="discord user id"
                  />
                  <button
                    className="btn btn-ghost"
                    disabled={manualId.length < 15}
                    onClick={() => {
                      patchDc({ user_id: manualId, username: '', avatar: '' })
                      setManualId('')
                    }}
                  >
                    use this id
                  </button>
                </div>
                <p className="hint">
                  discord → settings → advanced → developer mode, then right-click yourself → copy
                  user id.
                </p>
              </>
            ) : (
              <>
                <div className="dc-user">
                  <span className="dc-ava-box">
                    <img
                      className="dc-avatar"
                      src={discordAvatarUrl(dc.user_id, checkedUser?.avatar ?? dc.avatar)}
                      alt=""
                      draggable="false"
                    />
                    {dcDecoAsset && (
                      <img
                        className="deco"
                        src={decorationUrl(dcDecoAsset)}
                        alt=""
                        draggable="false"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                  </span>
                  <div className="dc-user-text">
                    <b>{dc.username || 'discord connected'}</b>
                    <span className="mono">{dc.user_id}</span>
                  </div>
                  <button
                    className="btn btn-ghost"
                    onClick={() => patchDc({ user_id: '', username: '', avatar: '' })}
                  >
                    disconnect
                  </button>
                </div>

                {dcCheck.state === 'loading' && <div className="dc-status">checking your presence…</div>}
                {dcCheck.state === 'ok' && (
                  <div className="dc-status">
                    <span
                      className="status-dot-inline"
                      style={{ background: STATUS_COLORS[dcCheck.data.discord_status] || STATUS_COLORS.offline }}
                    />
                    <div>
                      presence detected — you're <b>{STATUS_LABELS[dcCheck.data.discord_status] || 'offline'}</b>
                      {dcCheck.data.listening_to_spotify && (
                        <> · listening to <b>{dcCheck.data.spotify?.song}</b></>
                      )}
                      {checkedActivity && (
                        <> · {ACTIVITY_VERBS[checkedActivity.type] || 'playing'} <b>{checkedActivity.name}</b></>
                      )}
                      {checkedUser?.avatar_decoration_data && <> · decoration ✓</>}
                      {checkedUser?.collectibles?.nameplate && <> · nameplate ✓</>}
                      <div className="hint">this is exactly what visitors see on your card, live.</div>
                    </div>
                  </div>
                )}
                {dcCheck.state === 'fail' && (
                  <div className="dc-status dc-warn">
                    <div>
                      <b>presence not found</b> ({dcCheck.error}). the free{' '}
                      <a href="https://discord.gg/lanyard" target="_blank" rel="noreferrer">
                        lanyard discord server
                      </a>{' '}
                      has to see you — join it with this account (30 seconds, it's the standard
                      guns.lol-style presence source), then{' '}
                      <button className="linkish" onClick={recheckPresence}>recheck</button>.
                    </div>
                  </div>
                )}

                <h3>what shows on your page</h3>
                <Toggle label="show presence" hint="status dot on your avatar + the discord card" on={dc.show_presence} onChange={(v) => patchDc({ show_presence: v })} />
                <Toggle label="use discord avatar" hint="your profile picture follows your discord avatar" on={dc.use_discord_avatar} onChange={(v) => patchDc({ use_discord_avatar: v })} />
                <Toggle label="avatar decoration" hint="your discord decoration frames both avatars (if you own one)" on={dc.show_decoration} onChange={(v) => patchDc({ show_decoration: v })} />
                <Toggle label="nameplate" hint="your nameplate animates behind the discord card (if you own one)" on={dc.show_nameplate} onChange={(v) => patchDc({ show_nameplate: v })} />
                <Toggle
                  label="nitro name styling"
                  hint={
                    liveStyles
                      ? `detected: ${liveStyles.colors.join(' → ')}${liveStyles.fontName ? ` · ${liveStyles.fontName}` : ''}`
                      : 'gradient + font from your discord display name (nitro only)'
                  }
                  on={dc.use_name_styles}
                  onChange={(v) => patchDc({ use_name_styles: v })}
                />
                {dc.use_name_styles && (
                  <div className="sub-settings">
                    <Toggle
                      label="also style the big name"
                      hint="apply the same gradient + font to the name at the top of your card"
                      on={dc.styles_on_main_name}
                      onChange={(v) => patchDc({ styles_on_main_name: v })}
                    />
                    <Field
                      label="font override"
                      hint="discord doesn't publish its font id list, so the auto-detected face is a best guess — pick manually if it looks wrong"
                    >
                      <select
                        value={dc.name_font_override}
                        onChange={(e) => patchDc({ name_font_override: Number(e.target.value) })}
                      >
                        <option value={0}>auto (from discord)</option>
                        {Object.entries(DISPLAY_FONTS).map(([id, f]) => (
                          <option key={id} value={id}>
                            {f.name}
                            {f.google ? '' : ' (not on google fonts — falls back)'}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}
                <Field
                  label="now-playing font"
                  hint="font for the discord card — spotify, activity, and your discord name"
                >
                  <select
                    value={dc.presence_font}
                    onChange={(e) => patchDc({ presence_font: e.target.value })}
                  >
                    <option value="">same as page font</option>
                    {FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Toggle
                  label="server tag"
                  hint="the little guild tag next to your name, if you have one"
                  on={dc.show_guild_tag}
                  onChange={(v) => patchDc({ show_guild_tag: v })}
                />
                <Toggle
                  label="profile badges"
                  hint={
                    detectedBadges.length
                      ? `detected: ${detectedBadges.map((b) => b.name).join(', ')}`
                      : "discord's public badges (hypesquad, active developer…). nitro and boosting aren't public, so they can't be shown"
                  }
                  on={dc.show_badges}
                  onChange={(v) => patchDc({ show_badges: v })}
                />
                {dc.show_badges && (
                  <div className="sub-settings">
                    <p className="hint" style={{ marginBottom: 10 }}>
                      auto-detected from your account:{' '}
                      <b>{detectedBadges.length ? detectedBadges.map((b) => b.name).join(', ') : 'none'}</b>.
                      nitro and boosting aren't in discord's public data — no site can read them — so
                      tick them here if you have them.
                    </p>
                    <div className="badge-picker">
                      {MANUAL_BADGES.map((b) => {
                        const on = (dc.manual_badges || []).includes(b.id)
                        return (
                          <button
                            key={b.id}
                            type="button"
                            className={`badge-opt${on ? ' on' : ''}`}
                            title={b.name}
                            onClick={() =>
                              patchDc({
                                manual_badges: on
                                  ? dc.manual_badges.filter((x) => x !== b.id)
                                  : [...(dc.manual_badges || []), b.id],
                              })
                            }
                          >
                            <img src={badgeUrl(b.hash)} alt="" />
                            <span>{b.name}</span>
                          </button>
                        )
                      })}
                    </div>

                    <h3 style={{ marginTop: 20 }}>your own badges</h3>
                    {(dc.custom_badges || []).map((b) => (
                      <div className="social-row" key={b.id}>
                        <span className="social-row-icon">
                          {b.url ? <img src={b.url} alt="" style={{ width: 17, height: 17 }} /> : '?'}
                        </span>
                        <input
                          value={b.name || ''}
                          placeholder="label"
                          style={{ width: 130, flex: 'none' }}
                          onChange={(e) =>
                            patchDc({
                              custom_badges: dc.custom_badges.map((x) =>
                                x.id === b.id ? { ...x, name: e.target.value } : x
                              ),
                            })
                          }
                        />
                        <input
                          value={b.url || ''}
                          placeholder="https://…/badge.png"
                          onChange={(e) =>
                            patchDc({
                              custom_badges: dc.custom_badges.map((x) =>
                                x.id === b.id ? { ...x, url: e.target.value.trim() } : x
                              ),
                            })
                          }
                        />
                        <div className="row-btns">
                          <UploadButton
                            accept="image/*"
                            kind="badge"
                            onDone={(url) =>
                              patchDc({
                                custom_badges: dc.custom_badges.map((x) =>
                                  x.id === b.id ? { ...x, url } : x
                                ),
                              })
                            }
                            onError={flash}
                          />
                          <button
                            className="mini mini-danger"
                            aria-label="remove"
                            onClick={() =>
                              patchDc({ custom_badges: dc.custom_badges.filter((x) => x.id !== b.id) })
                            }
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      className="btn btn-ghost"
                      onClick={() =>
                        patchDc({
                          custom_badges: [...(dc.custom_badges || []), { id: newId(), url: '', name: '' }],
                        })
                      }
                    >
                      + add custom badge
                    </button>
                  </div>
                )}
                <Toggle label="show current activity" hint="the game or app you're in" on={dc.show_activity} onChange={(v) => patchDc({ show_activity: v })} />
                <Toggle label="show spotify" hint="song, artist, and a live progress bar" on={dc.show_spotify} onChange={(v) => patchDc({ show_spotify: v })} />
                <Toggle
                  label="spotify player"
                  hint="official spotify player for the song you're on — visitors press play to hear it, and it follows along when you change tracks"
                  on={dc.spotify_player}
                  onChange={(v) => patchDc({ spotify_player: v })}
                />
              </>
            )}
          </section>
        )}

        {tab === 'appearance' && (
          <section className="panel">
            <h2>Appearance</h2>

            <div className="field">
              <span>theme presets</span>
              <small className="hint">
                one click sets colours, border, entrance, background and trail — your links, bio and
                discord settings aren't touched
              </small>
              <div className="theme-grid">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="theme-card"
                    onClick={() => patchCfg(t.patch)}
                    title={`apply ${t.name}`}
                  >
                    <span
                      className="theme-swatch"
                      style={{
                        background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})`,
                      }}
                    />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span>accent colour</span>
              <AccentPicker value={cfg.accent} onChange={(accent) => patchCfg({ accent })} />
            </div>

            <div className="two-col">
              <Field label="background colour">
                <input
                  type="color"
                  className="color-input"
                  value={cfg.bg_color}
                  onChange={(e) => patchCfg({ bg_color: e.target.value })}
                />
              </Field>
              <Field label="icon style">
                <Segmented
                  value={cfg.icon_style}
                  onChange={(icon_style) => patchCfg({ icon_style })}
                  options={[
                    { value: 'mono', label: 'mono' },
                    { value: 'brand', label: 'brand colours' },
                  ]}
                />
              </Field>
            </div>

            <Field
              label="background media"
              hint="image, gif, or video (mp4/webm — loops muted). replaces the colour glow. max 50mb"
            >
              <div className="upload-row">
                <input
                  value={cfg.bg_image_url}
                  onChange={(e) => patchCfg({ bg_image_url: e.target.value.trim() })}
                  placeholder="https://…/wallpaper.jpg / .gif / .mp4"
                />
                <UploadButton
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  kind="background"
                  onDone={(url) => patchCfg({ bg_image_url: url })}
                  onError={flash}
                />
              </div>
            </Field>

            {cfg.bg_image_url && (
              <div className="sub-settings">
                <Slider
                  label="background blur"
                  value={cfg.bg_blur}
                  min={0}
                  max={40}
                  step={1}
                  onChange={(bg_blur) => patchCfg({ bg_blur })}
                  format={(v) => `${v}px`}
                />
                <Slider
                  label="background brightness"
                  value={cfg.bg_brightness}
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  onChange={(bg_brightness) => patchCfg({ bg_brightness })}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
                <p className="hint">
                  dimmer backgrounds keep your text readable — around 55% is a safe default.
                </p>
              </div>
            )}

            <Toggle
              label="animated gradient name"
              hint={
                dc.styles_on_main_name && dc.use_name_styles
                  ? "off — your discord nitro name styling is applied to the big name instead"
                  : 'your display name cycles through a moving gradient'
              }
              on={cfg.name_gradient}
              onChange={(v) => patchCfg({ name_gradient: v })}
            />
            {cfg.name_gradient && (
              <div className="sub-settings">
                <div className="field">
                  <span>gradient colours</span>
                  <div className="grad-stops">
                    {cfg.name_gradient_colors.map((c, i) => (
                      <span className="grad-stop" key={i}>
                        <input
                          type="color"
                          className="color-input"
                          value={c}
                          onChange={(e) => {
                            const next = [...cfg.name_gradient_colors]
                            next[i] = e.target.value
                            patchCfg({ name_gradient_colors: next })
                          }}
                        />
                        {cfg.name_gradient_colors.length > 2 && (
                          <button
                            className="mini mini-danger"
                            aria-label="remove colour"
                            onClick={() =>
                              patchCfg({
                                name_gradient_colors: cfg.name_gradient_colors.filter((_, j) => j !== i),
                              })
                            }
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {cfg.name_gradient_colors.length < 5 && (
                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          patchCfg({
                            name_gradient_colors: [...cfg.name_gradient_colors, cfg.accent],
                          })
                        }
                      >
                        + colour
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  label="gradient speed"
                  value={cfg.name_gradient_speed}
                  min={1}
                  max={20}
                  step={0.5}
                  onChange={(name_gradient_speed) => patchCfg({ name_gradient_speed })}
                  format={(v) => `${v}s`}
                />
              </div>
            )}

            <Field label="font" hint="applies to your whole page">
              <select value={cfg.font} onChange={(e) => patchCfg({ font: e.target.value })}>
                {FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>

            <Slider
              label="card opacity"
              value={cfg.card_opacity}
              min={0.1}
              max={0.95}
              step={0.05}
              onChange={(card_opacity) => patchCfg({ card_opacity })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Slider
              label="card blur"
              value={cfg.card_blur}
              min={0}
              max={40}
              step={1}
              onChange={(card_blur) => patchCfg({ card_blur })}
              format={(v) => `${v}px`}
            />

            <div className="two-col">
              <Field label="card border">
                <select
                  value={cfg.card_border}
                  onChange={(e) => patchCfg({ card_border: e.target.value })}
                >
                  <option value="none">none</option>
                  <option value="glow">accent glow</option>
                  <option value="gradient">spinning gradient</option>
                  <option value="beam">light beam</option>
                </select>
              </Field>
              <Field label="entrance animation">
                <select value={cfg.entrance} onChange={(e) => patchCfg({ entrance: e.target.value })}>
                  <option value="rise">rise</option>
                  <option value="fade">fade</option>
                  <option value="zoom">zoom</option>
                  <option value="flip">flip</option>
                  <option value="blur">blur in</option>
                  <option value="glitch">glitch</option>
                </select>
              </Field>
            </div>

            <Field label="cursor set" hint="a full themed set — normal, link, help and loading cursors, animated">
              <div className="upload-row">
                <select
                  value={cfg.cursor_theme}
                  onChange={(e) => patchCfg({ cursor_theme: e.target.value })}
                >
                  {CURSOR_THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {cursorThemeOf(cfg.cursor_theme)?.preview && (
                  <img
                    className="favicon-preview"
                    src={cursorThemeOf(cfg.cursor_theme).preview}
                    alt=""
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
              </div>
            </Field>

            {cfg.cursor_theme === 'none' && (
              <Field label="single custom cursor" hint="a plain image instead of a full set — 32×32 png or gif works best">
                <div className="upload-row">
                  <input
                    value={cfg.cursor_url}
                    onChange={(e) => patchCfg({ cursor_url: e.target.value.trim() })}
                    placeholder="https://…/cursor.png"
                  />
                  <UploadButton
                    accept="image/png,image/gif,image/webp,image/svg+xml"
                    kind="cursor"
                    onDone={(url) => patchCfg({ cursor_url: url })}
                    onError={flash}
                  />
                </div>
              </Field>
            )}

            <h3>Effects</h3>
            <Toggle label="particles" hint="animated background field" on={cfg.effects.particles} onChange={(v) => patchFx({ particles: v })} />
            {cfg.effects.particles && (
              <div className="sub-settings">
                <Field label="background style">
                  <Segmented
                    value={cfg.particle_style}
                    onChange={(particle_style) => patchCfg({ particle_style })}
                    options={[
                      { value: 'dust', label: 'dust' },
                      { value: 'snow', label: 'snow' },
                      { value: 'rain', label: 'rain' },
                      { value: 'matrix', label: 'matrix' },
                    ]}
                  />
                </Field>
              </div>
            )}
            <Toggle label="glow orbs" hint="soft colour clouds behind the card" on={cfg.effects.orbs} onChange={(v) => patchFx({ orbs: v })} />
            <Toggle label="3d tilt" hint="card follows the cursor" on={cfg.effects.tilt} onChange={(v) => patchFx({ tilt: v })} />
            {cfg.effects.tilt && (
              <div className="sub-settings">
                <Slider
                  label="tilt intensity"
                  value={cfg.tilt_strength}
                  min={2}
                  max={30}
                  step={1}
                  onChange={(tilt_strength) => patchCfg({ tilt_strength })}
                  format={(v) => `${v}°`}
                />
              </div>
            )}
            <Toggle label="sheen" hint="soft light that follows your cursor" on={cfg.effects.sheen} onChange={(v) => patchFx({ sheen: v })} />
            <Toggle label="glare" hint="a specular streak that swings to face the cursor, plus a rim light on the leading edge" on={cfg.effects.glare} onChange={(v) => patchFx({ glare: v })} />
            <Toggle label="holographic foil" hint="iridescent rainbow sheen that shifts with the tilt — bold" on={cfg.effects.holo} onChange={(v) => patchFx({ holo: v })} />
            {(cfg.effects.sheen || cfg.effects.glare || cfg.effects.holo) && (
              <div className="sub-settings">
                <Slider
                  label="reflection intensity"
                  value={cfg.reflect_intensity}
                  min={0.2}
                  max={2}
                  step={0.1}
                  onChange={(reflect_intensity) => patchCfg({ reflect_intensity })}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
              </div>
            )}
            <Toggle label="typewriter bio" hint="bio types itself out" on={cfg.effects.typewriter} onChange={(v) => patchFx({ typewriter: v })} />
            <Toggle label="CRT screen" hint="scanlines, vignette and a rolling band, like an old monitor" on={cfg.effects.crt} onChange={(v) => patchFx({ crt: v })} />
            {cfg.effects.crt && (
              <div className="sub-settings">
                <Slider
                  label="CRT intensity"
                  value={cfg.crt_intensity}
                  min={0.15}
                  max={1}
                  step={0.05}
                  onChange={(crt_intensity) => patchCfg({ crt_intensity })}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
                <Slider
                  label="grain"
                  value={cfg.crt_grain}
                  min={0}
                  max={1.5}
                  step={0.05}
                  onChange={(crt_grain) => patchCfg({ crt_grain })}
                  format={(v) => (v === 0 ? 'off' : `${Math.round(v * 100)}%`)}
                />
              </div>
            )}
            <Toggle label="cursor trail" hint="follows the mouse (desktop only)" on={cfg.effects.trail} onChange={(v) => patchFx({ trail: v })} />

            {cfg.effects.trail && (
              <div className="sub-settings">
                <Field label="trail style">
                  <Segmented
                    value={cfg.trail_style}
                    onChange={(trail_style) => patchCfg({ trail_style })}
                    options={[
                      { value: 'glow', label: 'glow' },
                      { value: 'comet', label: 'comet' },
                      { value: 'sparkle', label: 'sparkle' },
                    ]}
                  />
                </Field>
                <div className="field">
                  <span>trail colour</span>
                  <AccentPicker
                    value={cfg.trail_color || cfg.accent}
                    onChange={(trail_color) => patchCfg({ trail_color })}
                  />
                  {cfg.trail_color && (
                    <button
                      type="button"
                      className="linkish trail-reset"
                      onClick={() => patchCfg({ trail_color: '' })}
                    >
                      match accent colour
                    </button>
                  )}
                </div>
                <p className="hint">
                  trails don't show in this preview — open{' '}
                  <a href="/" target="_blank" rel="noreferrer">
                    your page
                  </a>{' '}
                  to try it.
                </p>
              </div>
            )}

            <h3>Page behaviour</h3>
            <Field label="background music" hint="upload or paste an mp3 — starts on the visitor's first click or keypress (browsers block audio before that)">
              <div className="upload-row">
                <input
                  value={cfg.audio_url}
                  onChange={(e) => patchCfg({ audio_url: e.target.value.trim() })}
                  placeholder="https://…/song.mp3"
                />
                <UploadButton
                  accept="audio/*"
                  kind="audio"
                  onDone={(url) => patchCfg({ audio_url: url })}
                  onError={flash}
                />
              </div>
            </Field>
            {cfg.audio_url && (
              <Slider
                label="music volume"
                value={cfg.audio_volume}
                min={0}
                max={1}
                step={0.05}
                onChange={(audio_volume) => patchCfg({ audio_volume })}
                format={(v) => `${Math.round(v * 100)}%`}
              />
            )}
            <Toggle label="show view counter" on={cfg.show_views} onChange={(v) => patchCfg({ show_views: v })} />
          </section>
        )}

        {tab === 'account' && (
          <section className="panel">
            <h2>Account</h2>
            <div className="kv">
              <span>email</span>
              <b>{session.user.email}</b>
            </div>
            <div className="kv">
              <span>storage</span>
              <b>{demoMode ? 'this browser (demo)' : 'supabase'}</b>
            </div>
            <div className="kv">
              <span>discord</span>
              <b>{dc.user_id ? dc.username || dc.user_id : 'not connected'}</b>
            </div>
            {demoMode ? (
              <p className="panel-sub">
                to make login real and sync your page everywhere: create a free Supabase project, run{' '}
                <code>supabase/schema.sql</code>, and drop the two keys into <code>.env</code> — full
                steps in the README.
              </p>
            ) : (
              <p className="panel-sub">
                tip: once your account exists you can disable new sign-ups in Supabase → Auth →
                Providers, so the dashboard stays yours alone.
              </p>
            )}
          </section>
        )}
      </main>

      <aside className="preview-pane">
        <div className="preview-label">live preview</div>
        <div className="preview-frame">
          <ProfileView profile={profile} preview views={profile.views || 0} />
        </div>
      </aside>

      {dirty && (
        <div className="savebar">
          <span className="savebar-text">{saveErr || 'unsaved changes'}</span>
          <button className="btn btn-ghost" onClick={reset} disabled={saving}>
            reset
          </button>
          <button className="btn btn-primary" onClick={doSave} disabled={saving}>
            {saving ? 'saving…' : 'save'}
          </button>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
