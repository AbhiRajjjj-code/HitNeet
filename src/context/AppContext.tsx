/**
 * App-wide state: who is signed in + the settings (exam date, marking scheme).
 * Everything else is loaded per-screen through the api.
 */
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Role, Settings } from '../domain/types'
import { api, type Session } from '../services'

interface AppState {
  ready: boolean
  session: Session | null
  settings: Settings | null
  signIn: (role: Role) => Promise<Session>
  signOut: () => Promise<void>
  setSettings: (s: Settings) => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([api.getSession(), api.getSettings()])
      .then(([s, st]) => {
        if (!alive) return
        setSession(s)
        setSettings(st)
      })
      .finally(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [])

  const signIn = useCallback(async (role: Role) => {
    const s = await api.signInDemo(role)
    setSession(s)
    setSettings(await api.getSettings())
    return s
  }, [])

  const signOut = useCallback(async () => {
    await api.signOut()
    setSession(null)
  }, [])

  return <Ctx value={{ ready, session, settings, signIn, signOut, setSettings }}>{children}</Ctx>
}

export function useApp() {
  const v = use(Ctx)
  if (!v) throw new Error('useApp must be used inside <AppProvider>')
  return v
}

/** For screens that only render once signed in + settings loaded. */
export function useSignedIn() {
  const { session, settings, ...rest } = useApp()
  if (!session || !settings) throw new Error('useSignedIn used outside a protected route')
  return { session, settings, ...rest }
}
