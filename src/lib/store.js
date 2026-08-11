import { createClient } from '@supabase/supabase-js'
import { mergeConfig } from './defaults'

// Tolerate common paste mistakes: trailing slashes or a copied endpoint path
// like /rest/v1 — supabase-js needs the bare project origin.
const url = (import.meta.env.VITE_SUPABASE_URL || '')
  .replace(/\/(rest|auth|storage|realtime|functions)\/v1\/?$/, '')
  .replace(/\/+$/, '')
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True when no Supabase project is configured — everything falls back to localStorage. */
export const demoMode = !(url && anon)
export const supabase = demoMode ? null : createClient(url, anon)

const LS_PROFILE = 'socials.profile'
const LS_SESSION = 'socials.demo-session'

function demoProfile() {
  try {
    const raw = localStorage.getItem(LS_PROFILE)
    if (raw) {
      const p = JSON.parse(raw)
      p.config = mergeConfig(p.config)
      return p
    }
  } catch {
    /* corrupted local data — fall through to defaults */
  }
  return { id: 'demo', username: 'bxxpe', views: 0, config: mergeConfig(null) }
}

function friendly(error) {
  if (error?.code === '23505') return 'that username is already taken'
  return error?.message || 'something went wrong'
}

// ---------- auth ----------

export async function getSession() {
  if (demoMode) {
    const raw = localStorage.getItem(LS_SESSION)
    return raw ? JSON.parse(raw) : null
  }
  const { data } = await supabase.auth.getSession()
  return data.session ? { user: { id: data.session.user.id, email: data.session.user.email } } : null
}

export function onAuthChange(cb) {
  if (demoMode) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session ? { user: { id: session.user.id, email: session.user.email } } : null)
  })
  return () => data.subscription.unsubscribe()
}

export async function signIn(email, password) {
  if (demoMode) {
    const s = { user: { id: 'demo', email } }
    localStorage.setItem(LS_SESSION, JSON.stringify(s))
    return {}
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return {}
}

export async function signUp(email, password) {
  if (demoMode) return signIn(email, password)
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  // If email confirmation is on, there is no session yet.
  if (!data.session) return { needsConfirm: true }
  return {}
}

export async function signOut() {
  if (demoMode) {
    localStorage.removeItem(LS_SESSION)
    return
  }
  await supabase.auth.signOut()
}

// ---------- profile ----------

export async function fetchPublicProfile() {
  if (demoMode) return demoProfile()
  const owner = import.meta.env.VITE_OWNER_USERNAME
  let q = supabase.from('profiles').select('id, username, views, config')
  q = owner ? q.eq('username', owner) : q.order('created_at', { ascending: true })
  const { data, error } = await q.limit(1).maybeSingle()
  if (error || !data) return null
  return { ...data, config: mergeConfig(data.config) }
}

export async function fetchMyProfile(userId, email) {
  if (demoMode) return demoProfile()
  const { data } = await supabase
    .from('profiles')
    .select('id, username, views, config')
    .eq('id', userId)
    .maybeSingle()
  if (data) return { ...data, config: mergeConfig(data.config) }
  const base = (email || 'user').split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '')
  return { id: userId, username: base || 'user', views: 0, config: mergeConfig(null), fresh: true }
}

export async function saveProfile(profile) {
  const { fresh, ...row } = profile
  if (demoMode) {
    localStorage.setItem(LS_PROFILE, JSON.stringify(row))
    return
  }
  const { error } = await supabase
    .from('profiles')
    .upsert(
      { id: row.id, username: row.username, config: row.config, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
  if (error) throw new Error(friendly(error))
}

/** Upload a file to the public `media` bucket and return its public URL. */
export async function uploadMedia(file, kind = 'file') {
  if (demoMode) throw new Error('uploads need supabase connected — paste a url instead')
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData?.user?.id
  if (!uid) throw new Error('sign in first')
  const ext =
    (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `${uid}/${kind}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file, {
    contentType: file.type || undefined,
    cacheControl: '31536000',
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

export async function incrementViews(profileId) {
  if (demoMode) {
    const p = demoProfile()
    p.views = (p.views || 0) + 1
    localStorage.setItem(LS_PROFILE, JSON.stringify(p))
    return
  }
  try {
    await supabase.rpc('increment_views', { profile_id: profileId })
  } catch {
    /* view counting is best-effort */
  }
}
