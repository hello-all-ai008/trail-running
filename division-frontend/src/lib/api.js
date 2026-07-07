/**
 * Real-backend client: Supabase Auth (staff login) + Realtime
 * (live_progress) + fetch wrapper for division-backend's Go API.
 * Only imported when VITE_USE_MOCK_DATA=false.
 */
import { createClient } from '@supabase/supabase-js'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

// Lazy singleton: this module is imported unconditionally by useRaceState.js
// even in mock mode, where VITE_SUPABASE_URL/ANON_KEY may be unset —
// createClient() throws on a missing URL, so don't call it at module load.
let _supabase = null
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  }
  return _supabase
}

/** @returns {Promise<import('@supabase/supabase-js').Session|null>} */
export async function getSession() {
  const { data } = await getSupabase().auth.getSession()
  return data.session
}

/**
 * @param {string} email
 * @param {string} password
 */
export async function signIn(email, password) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOut() {
  await getSupabase().auth.signOut()
}

/**
 * @param {(session: import('@supabase/supabase-js').Session|null) => void} callback
 * @returns {() => void} unsubscribe
 */
export function onAuthChange(callback) {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

/**
 * Authenticated fetch against division-backend. Throws on non-2xx.
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function apiFetch(path, init = {}) {
  const session = await getSession()
  if (!session) throw new Error('not signed in')

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${session.access_token}`,
      ...init.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `request failed: ${res.status}`)
  }
  return res
}

/** @returns {Promise<import('./raceData').Runner[]>} */
export async function fetchRunners() {
  const res = await apiFetch('/runners')
  return res.json()
}

/**
 * @param {string} rawValue
 * @param {string} checkpointCode  'CHECKIN' | 'A1' | 'A2' | 'A3' | 'FINISH'
 * @param {string} [stationId]
 * @returns {Promise<import('../hooks/useRaceState').ScanResult>}
 */
export async function postScan(rawValue, checkpointCode, stationId = '') {
  const res = await apiFetch('/scan', {
    method: 'POST',
    body: JSON.stringify({ rawValue, checkpointCode, stationId }),
  })
  return res.json()
}

/**
 * Subscribes to live_progress row changes (any scan, from any station).
 * @param {() => void} onChange
 * @returns {() => void} unsubscribe
 */
export function subscribeLiveProgress(onChange) {
  const channel = getSupabase()
    .channel('live_progress_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_progress' }, onChange)
    .subscribe()
  return () => getSupabase().removeChannel(channel)
}
