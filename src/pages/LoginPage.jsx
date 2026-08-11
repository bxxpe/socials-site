import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn, signUp, getSession, demoMode } from '../lib/store'

export default function LoginPage() {
  const nav = useNavigate()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getSession().then((s) => {
      if (s) nav('/dashboard', { replace: true })
    })
    document.title = 'sign in'
  }, [nav])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setMsg('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
        nav('/dashboard')
      } else {
        const r = await signUp(email, password)
        if (r?.needsConfirm) {
          setMsg('check your email to confirm the account, then sign in.')
          setMode('signin')
        } else {
          nav('/dashboard')
        }
      }
    } catch (ex) {
      setErr(ex.message || 'something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="orbs" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <form className="auth-card" onSubmit={submit}>
        <h1 className="auth-title">{mode === 'signin' ? 'welcome back' : 'create your account'}</h1>
        <p className="auth-sub">
          {mode === 'signin' ? 'sign in to edit your page' : 'one account — it becomes your page'}
        </p>

        {demoMode && (
          <div className="demo-note">
            demo mode — no database connected. any email + password works and edits save to{' '}
            <b>this browser only</b>. connect Supabase (see README) for real login.
          </div>
        )}

        <label className="field">
          <span>email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label className="field">
          <span>password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        {err && <p className="auth-err">{err}</p>}
        {msg && <p className="auth-msg">{msg}</p>}

        <button className="btn btn-primary btn-block" disabled={busy} type="submit">
          {busy ? 'one sec…' : mode === 'signin' ? 'sign in' : 'create account'}
        </button>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
            setErr('')
            setMsg('')
          }}
        >
          {mode === 'signin' ? "no account? create one" : 'already have an account? sign in'}
        </button>

        <Link to="/" className="auth-back">
          ← back to page
        </Link>
      </form>
    </div>
  )
}
