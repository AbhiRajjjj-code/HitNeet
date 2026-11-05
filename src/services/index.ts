/**
 * Picks which backend the app uses, from VITE_DATA_SOURCE in .env.local:
 *   demo     → mockApi: sample data kept in this browser (default)
 *   supabase → supabaseApi: the real database and real sign-in
 * Screens import `api` from here and never know which one they got.
 */
import type { HitNeetApi } from './api'
import { mockApi } from './mockApi'
import { assertSupabaseConfigured, supabaseApi } from './supabaseApi'

const source = import.meta.env.VITE_DATA_SOURCE === 'supabase' ? 'supabase' : 'demo'
if (source === 'supabase') assertSupabaseConfigured()

export const api: HitNeetApi = source === 'supabase' ? supabaseApi : mockApi
/** True only with demo data: shows the demo banner, role switch and sample accounts. */
export const IS_DEMO = source === 'demo'
export * from './api'
