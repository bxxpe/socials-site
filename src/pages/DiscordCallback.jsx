import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchDiscordUser } from '../lib/discord'
import { getSession, fetchMyProfile, saveProfile } from '../lib/store'

// Module-level so React 18 StrictMode's dev double-mount can't run the
// exchange twice. A real OAuth redirect is a fresh page load, which resets it.
let handled = false

export default function DiscordCallback() {
  const nav = useNavigate()
  const [err, setErr] = useState('')

  useEffect(() => {
    if (handled) {
      nav('/dashboard', { replace: true })
      return
    }
    handled = true
    ;(async () => {
      try {
        const hash = new URLSearchParams(window.location.hash.slice(1))
        const token = hash.get('access_token')
        const state = hash.get('state')
        const expected = sessionStorage.getItem('socials.discord-state')
        sessionStorage.removeItem('socials.discord-state')
        // Scrub the token out of the address bar / history immediately.
        window.history.replaceState(null, '', '/discord/callback')

        if (!token) throw new Error(hash.get('error_description') || 'discord did not return a token')
        if (!expected || state !== expected)
          throw new Error('state mismatch — start the connection from the dashboard again')

        const user = await fetchDiscordUser(token)
        const session = await getSession()
        if (!session) throw new Error('sign in to the dashboard first, then connect discord')

        const profile = await fetchMyProfile(session.user.id, session.user.email)
        profile.config.discord = {
          ...profile.config.discord,
          user_id: user.id,
          username: user.global_name || user.username,
          avatar: user.avatar || '',
          decoration: user.avatar_decoration_data?.asset || '',
          nameplate: user.collectibles?.nameplate?.asset || '',
          public_flags: user.public_flags ?? 0,
          show_presence: true,
        }
        await saveProfile(profile)
        nav('/dashboard', { replace: true, state: { discordConnected: true } })
      } catch (ex) {
        setErr(ex.message || 'something went wrong')
      }
    })()
  }, [nav])

  if (!err) {
    return (
      <div className="page-loading">
        <div className="callback-wait">
          <div className="spinner" aria-label="loading" />
          <p>connecting discord…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="orbs" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="auth-card">
        <h1 className="auth-title">couldn't connect discord</h1>
        <p className="auth-sub">{err}</p>
        <Link className="btn btn-primary btn-block" to="/dashboard">
          back to dashboard
        </Link>
      </div>
    </div>
  )
}
