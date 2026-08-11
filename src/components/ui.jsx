import { useRef, useState } from 'react'
import { uploadMedia } from '../lib/store'

/** Tiny form kit for the dashboard — consistent, accessible, zero deps. */

/** Hidden file input + button; hands back the uploaded file's public URL. */
export function UploadButton({ accept, kind, onDone, onError }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setBusy(true)
          try {
            onDone(await uploadMedia(file, kind))
          } catch (ex) {
            onError?.(ex.message || 'upload failed')
          } finally {
            setBusy(false)
          }
        }}
      />
      <button
        type="button"
        className="btn btn-ghost"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'uploading…' : 'upload'}
      </button>
    </>
  )
}

export function CopyRow({ value }) {
  const [ok, setOk] = useState(false)
  return (
    <span className="copy-row">
      <code>{value}</code>
      <button
        type="button"
        className="mini mini-copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setOk(true)
            setTimeout(() => setOk(false), 1200)
          } catch {
            /* clipboard unavailable — user can select the text manually */
          }
        }}
      >
        {ok ? '✓' : 'copy'}
      </button>
    </span>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="hint">{hint}</small>}
    </label>
  )
}

export function Toggle({ label, on, onChange, hint }) {
  return (
    <div className="toggle-row">
      <div className="toggle-text">
        <span>{label}</span>
        {hint && <small className="hint">{hint}</small>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className="switch"
        data-on={on}
        onClick={() => onChange(!on)}
      />
    </div>
  )
}

export function Segmented({ value, options, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'seg-on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Slider({ label, value, min, max, step, onChange, format }) {
  return (
    <div className="slider-row">
      <div className="slider-head">
        <span>{label}</span>
        <span className="slider-val">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

const SWATCHES = [
  '#a855f7', '#6366f1', '#3b82f6', '#22d3ee', '#10b981',
  '#f43f5e', '#ef4444', '#f59e0b', '#ec4899', '#ffffff',
]

export function AccentPicker({ value, onChange }) {
  return (
    <div className="swatches">
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          className={`swatch${value.toLowerCase() === c ? ' on' : ''}`}
          style={{ background: c }}
          aria-label={`accent ${c}`}
          onClick={() => onChange(c)}
        />
      ))}
      <label className="swatch swatch-custom" title="custom colour">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <span>+</span>
      </label>
    </div>
  )
}
