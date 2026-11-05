/// <reference types="vite/client" />

/** Settings read from .env.local (see .env.example). Every VITE_* value ends up in the browser. */
interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: 'demo' | 'supabase'
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
