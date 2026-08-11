import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProfileView from '../components/ProfileView'
import AudioDock from '../components/AudioDock'
import { fetchPublicProfile, incrementViews } from '../lib/store'
import { PageLoader } from '../App'

export default function ProfilePage() {
  const [profile, setProfile] = useState(undefined) // undefined = loading, null = none yet
  const [views, setViews] = useState(null)
  const [entered, setEntered] = useState(false)
  const [overlayGone, setOverlayGone] = useState(false)

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
      // No enter screen configured -> straight in.
      if (!p.config.enter_text) {
        setEntered(true)
        setOverlayGone(true)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  const enter = () => {
    if (entered) return
    setEntered(true)
    setTimeout(() => setOverlayGone(true), 700)
  }

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
        <Link to="/privacy" className="privacy-fab">
          privacy
        </Link>
      </div>
    )
  }

  return (
    <>
      <ProfileView profile={profile} entered={entered} views={views} />
      <AudioDock src={profile.config.audio_url} volume={profile.config.audio_volume} play={entered} />
      <Link to="/privacy" className="privacy-fab">
        privacy
      </Link>
      {!overlayGone && (
        <div
          className={`enter-overlay${entered ? ' leaving' : ''}`}
          onClick={enter}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && enter()}
        >
          <span className="enter-text">{profile.config.enter_text}</span>
        </div>
      )}
    </>
  )
}
