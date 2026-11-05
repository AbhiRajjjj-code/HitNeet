/**
 * Picks which backend the app uses.
 * Stage 6: `import { supabaseApi } from './supabaseApi'` and switch on
 * import.meta.env.VITE_DATA_SOURCE === 'supabase'.
 */
import type { HitNeetApi } from './api'
import { mockApi } from './mockApi'

export const api: HitNeetApi = mockApi
export const IS_DEMO = true
export * from './api'
