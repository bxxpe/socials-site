import { useEffect, useRef, useState } from 'react'

const SpeakerOn = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.4 5.6a9 9 0 0 1 0 12.8" />
  </svg>
)

const SpeakerOff = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
    <path d="m22 9-6 6M16 9l6 6" />
  </svg>
)

/** Floating volume pill — only mounts after the click-to-enter gesture, so autoplay is legal. */
export default function AudioDock({ src, volume = 0.35, play = false }) {
  const audioRef = useRef(null)
  const [muted, setMuted] = useState(false)
  const [vol, setVol] = useState(volume)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.volume = vol
    a.muted = muted
  }, [vol, muted])

  useEffect(() => {
    const a = audioRef.current
    if (a && play) a.play().catch(() => {})
  }, [play])

  if (!src) return null

  return (
    <div className={`audio-dock${play ? ' shown' : ''}`}>
      <audio ref={audioRef} src={src} loop preload="none" />
      <button
        type="button"
        className="audio-btn"
        aria-label={muted ? 'unmute' : 'mute'}
        onClick={() => setMuted((m) => !m)}
      >
        {muted || vol === 0 ? SpeakerOff : SpeakerOn}
      </button>
      <input
        className="audio-vol"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={vol}
        aria-label="volume"
        onChange={(e) => {
          setVol(parseFloat(e.target.value))
          setMuted(false)
        }}
      />
    </div>
  )
}
