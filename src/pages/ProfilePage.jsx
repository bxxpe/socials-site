import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProfileView from '../components/ProfileView'
import AudioDock from '../components/AudioDock'
import CursorTrail from '../components/CursorTrail'
import CursorTheme from '../components/CursorTheme'
import { fetchPublicProfile, incrementViews } from '../lib/store'
import { PageLoader } from '../App'

export default function ProfilePage() {
  const [profile, setProfile] = useState(undefined) // undefined = loading, null = none yet
  const [views, setViews] = useState(null)
  // Browsers only allow audio after a user gesture, so background music waits
  // for the visitor's first click/keypress instead of a click-to-enter gate.
  const [interacted, setInteracted] = useState(false)

  useEffect(() => {
    let alive = true
    fetchPublicProfile().then((p) => {
      if (!alive) return
      setProfile(p)
      if (!p) return
      document.title = p.config.display_name || p.username
      // Count one view per browser session.
      if (!sessionStorage.getItem('socials.viewed')) {
        sessionStorage.setItem('socials.viewed', '1')
        incrementViews(p.id)
        setViews((p.views || 0) + 1)
      } else {
        setViews(p.views || 0)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  // Swap the browser tab icon to the owner's, restoring the default on unmount.
  const favicon = profile?.config?.favicon_url
  useEffect(() => {
    if (!favicon) return
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    const previous = link.getAttribute('href')
    link.setAttribute('href', favicon)
    return () => link.setAttribute('href', previous || '')
  }, [favicon])

  // Arm background music on the first interaction of any kind.
  const needsAudio = Boolean(profile?.config?.audio_url)
  useEffect(() => {
    if (!needsAudio || interacted) return
    const go = () => setInteracted(true)
    const opts = { once: true, passive: true }
    window.addEventListener('pointerdown', go, opts)
    window.addEventListener('keydown', go, opts)
    window.addEventListener('scroll', go, opts)
    return () => {
      window.removeEventListener('pointerdown', go)
      window.removeEventListener('keydown', go)
      window.removeEventListener('scroll', go)
    }
  }, [needsAudio, interacted])

  if (profile === undefined) return <PageLoader />

  if (profile === null) {
    return (
      <div className="empty-state">
        <div className="empty-card">
          <h1>nothing here yet</h1>
          <p>this page hasn't been set up. sign in to claim it.</p>
          <Link className="btn btn-primary" to="/login">
            open dashboard
          </Link>
        </div>
        <Link to="/privacy" className="corner-fab fab-left">
          privacy
        </Link>
        <Link to="/terms" className="corner-fab fab-right">
          terms
        </Link>
      </div>
    )
  }

  return (
    <>
      <ProfileView profile={profile} entered views={views} />
      <CursorTheme theme={profile.config.cursor_theme} />
      <CursorTrail
        enabled={profile.config.effects.trail}
        variant={profile.config.trail_style}
        color={profile.config.trail_color || profile.config.accent}
      />
      <AudioDock src={profile.config.audio_url} volume={profile.config.audio_volume} play={interacted} />
      <Link to="/privacy" className="corner-fab fab-left">
        privacy
      </Link>
      <Link to="/terms" className="corner-fab fab-right">
        terms
      </Link>
    </>
  )
}
