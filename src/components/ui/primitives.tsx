/**
 * Base components. Every screen is built from these so spacing, radii and
 * states stay consistent. Variants are explicit props, not boolean soup.
 */
import clsx from 'clsx'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ComponentProps, CSSProperties, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantCls: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-900 disabled:bg-brand-200',
  secondary: 'bg-surface text-ink border border-line-strong hover:border-brand-400 hover:text-brand-700 disabled:opacity-50',
  ghost: 'text-ink-soft hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50',
  danger: 'bg-bad text-white hover:brightness-95 disabled:opacity-50',
}
const sizeCls: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-[15px] gap-2',
  lg: 'h-12 px-5 text-base gap-2',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return clsx(
    'inline-flex items-center justify-center rounded-control font-semibold transition-colors duration-150 select-none whitespace-nowrap',
    variantCls[variant],
    sizeCls[size],
    extra,
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant = 'primary', size = 'md', className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />
}

/** Main content panel. `tone` changes the background, not the border radius. */
export function Panel({
  className,
  tone = 'plain',
  children,
  ...rest
}: ComponentProps<'section'> & { tone?: 'plain' | 'brand' | 'quiet' }) {
  return (
    <section
      className={clsx(
        'rounded-panel p-4 sm:p-5',
        tone === 'plain' && 'bg-surface border border-line',
        tone === 'quiet' && 'bg-brand-50/60 border border-brand-100',
        tone === 'brand' && 'bg-brand-600 text-white',
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  )
}

export function PanelHeader({ title, action, sub }: { title: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-ink-mute">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{title}</h1>
        {sub && <p className="mt-1 text-ink-soft">{sub}</p>}
      </div>
      {action}
    </header>
  )
}

export function Chip({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-chip px-2.5 py-0.5 text-xs font-medium', className)} style={style}>
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton rounded-control', className)} aria-hidden />
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-panel border border-bad/30 bg-bad-soft p-5">
      <div className="flex items-center gap-2 font-semibold text-bad">
        <AlertCircle className="size-5" aria-hidden /> Couldn't load this
      </div>
      <p className="text-sm text-ink-soft">{error.message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-panel border border-dashed border-line-strong px-6 py-10 text-center">
      {icon && <div className="mb-1 text-brand-400">{icon}</div>}
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="max-w-sm text-sm text-ink-mute">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Small "not enough data yet" note — used wherever we refuse to over-interpret. */
export function NotEnoughData({ children }: { children: ReactNode }) {
  return <p className="rounded-control bg-paper px-3 py-2.5 text-sm text-ink-mute">{children}</p>
}
