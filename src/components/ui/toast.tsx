/** Tiny toast system: `const toast = useToast(); toast('Test saved')` */
import clsx from 'clsx'
import { CheckCircle2, XCircle } from 'lucide-react'
import { createContext, use, useCallback, useState, type ReactNode } from 'react'

type Tone = 'good' | 'bad'
interface Item {
  id: number
  text: string
  tone: Tone
}

const Ctx = createContext<(text: string, tone?: Tone) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const push = useCallback((text: string, tone: Tone = 'good') => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs, { id, text, tone }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <Ctx value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'animate-rise pointer-events-auto flex items-center gap-2 rounded-control px-4 py-3 text-sm font-medium shadow-lg shadow-ink/10',
              t.tone === 'good' ? 'bg-ink text-white' : 'bg-bad text-white',
            )}
          >
            {t.tone === 'good' ? <CheckCircle2 className="size-4 text-emerald-300" /> : <XCircle className="size-4" />}
            {t.text}
          </div>
        ))}
      </div>
    </Ctx>
  )
}

export const useToast = () => use(Ctx)
