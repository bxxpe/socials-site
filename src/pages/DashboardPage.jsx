import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import ProfileView from '../components/ProfileView'
import { Field, Toggle, Segmented, Slider, AccentPicker, CopyRow } from '../components/ui'
import { PLATFORMS, platformOf, SocialIcon } from '../lib/icons'
import { newId } from '../lib/defaults'
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
            <Field label="avatar url" hint="paste a direct image link — or connect discord and use your discord avatar">
              <input
                value={cfg.avatar_url}
                onChange={(e) => patchCfg({ avatar_url: e.target.value.trim() })}
                placeholder="https://…/you.png"
              />
            </Field>
            <Field label="location" hint="optional">
              <input
                value={cfg.location}
                onChange={(e) => patchCfg({ location: e.target.value })}
                placeholder="somewhere"
                maxLength={40}
              />
            </Field>
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
                <Toggle label="show current activity" hint="the game or app you're in" on={dc.show_activity} onChange={(v) => patchDc({ show_activity: v })} />
                <Toggle label="show spotify" hint="song, artist, and a live progress bar" on={dc.show_spotify} onChange={(v) => patchDc({ show_spotify: v })} />
              </>
            )}
          </section>
        )}

        {tab === 'appearance' && (
          <section className="panel">
            <h2>Appearance</h2>

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

            <Field label="background image url" hint="optional — replaces the colour glow">
              <input
                value={cfg.bg_image_url}
                onChange={(e) => patchCfg({ bg_image_url: e.target.value.trim() })}
                placeholder="https://…/wallpaper.jpg"
              />
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

            <h3>Effects</h3>
            <Toggle label="particles" hint="floating dust in the background" on={cfg.effects.particles} onChange={(v) => patchFx({ particles: v })} />
            <Toggle label="glow orbs" hint="soft colour clouds behind the card" on={cfg.effects.orbs} onChange={(v) => patchFx({ orbs: v })} />
            <Toggle label="3d tilt" hint="card follows the cursor" on={cfg.effects.tilt} onChange={(v) => patchFx({ tilt: v })} />
            <Toggle label="sheen" hint="light reflection on the card" on={cfg.effects.sheen} onChange={(v) => patchFx({ sheen: v })} />
            <Toggle label="typewriter bio" hint="bio types itself out" on={cfg.effects.typewriter} onChange={(v) => patchFx({ typewriter: v })} />

            <h3>Page behaviour</h3>
            <Field label="enter screen text" hint="leave empty to skip the click-to-enter screen">
              <input
                value={cfg.enter_text}
                onChange={(e) => patchCfg({ enter_text: e.target.value })}
                placeholder="click to enter"
                maxLength={40}
              />
            </Field>
            <Field label="background music url" hint="direct mp3 link — plays after the visitor clicks enter">
              <input
                value={cfg.audio_url}
                onChange={(e) => patchCfg({ audio_url: e.target.value.trim() })}
                placeholder="https://…/song.mp3"
              />
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
