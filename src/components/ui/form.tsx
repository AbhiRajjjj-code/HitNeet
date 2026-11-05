/** Form controls with labels, hints and inline errors built in. */
import clsx from 'clsx'
import { Eye, EyeOff, Minus, Plus } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const control =
  'w-full rounded-control border bg-surface px-3 text-[15px] text-ink placeholder:text-ink-mute/70 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200'

interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: string
  className?: string
  optional?: boolean
}

function FieldShell({ id, label, hint, error, className, optional, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-mute">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="text-sm text-bad" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-mute">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function TextField({ label, hint, error, className, optional, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <FieldShell id={id} {...{ label, hint, error, className, optional }}>
      <input
        id={id}
        className={clsx(control, 'h-11', error ? 'border-bad' : 'border-line-strong')}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
    </FieldShell>
  )
}

/** Password input with a show/hide eye button. */
export function PasswordField({ label, hint, error, className, optional, ...rest }: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const id = useId()
  const [shown, setShown] = useState(false)
  return (
    <FieldShell id={id} {...{ label, hint, error, className, optional }}>
      <div className="relative">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          className={clsx(control, 'h-11 pr-11', error ? 'border-bad' : 'border-line-strong')}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-control text-ink-mute hover:text-ink"
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
        >
          {shown ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
    </FieldShell>
  )
}

export function TextArea({ label, hint, error, className, optional, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <FieldShell id={id} {...{ label, hint, error, className, optional }}>
      <textarea
        id={id}
        rows={3}
        className={clsx(control, 'py-2.5 leading-relaxed', error ? 'border-bad' : 'border-line-strong')}
        aria-invalid={!!error}
        {...rest}
      />
    </FieldShell>
  )
}

export function SelectField({
  label,
  hint,
  error,
  className,
  optional,
  children,
  ...rest
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <FieldShell id={id} {...{ label, hint, error, className, optional }}>
      <select id={id} className={clsx(control, 'h-11 pr-8', error ? 'border-bad' : 'border-line-strong')} aria-invalid={!!error} {...rest}>
        {children}
      </select>
    </FieldShell>
  )
}

/** Big +/− number input. Comfortable with a thumb; also typeable. */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max,
  tone,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  tone?: 'good' | 'bad' | 'mute'
}) {
  const id = useId()
  const clamp = (n: number) => Math.max(min, max !== undefined ? Math.min(max, n) : n)
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-ink-soft">
        {label}
      </label>
      <div className="flex h-11 items-stretch overflow-hidden rounded-control border border-line-strong bg-surface focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200">
        <button
          type="button"
          className="grid w-9 shrink-0 place-items-center text-ink-mute hover:bg-brand-50 hover:text-brand-700"
          onClick={() => onChange(clamp(value - 1))}
          aria-label={`Decrease ${label}`}
          tabIndex={-1}
        >
          <Minus className="size-4" />
        </button>
        <input
          id={id}
          inputMode="numeric"
          className={clsx(
            'tabular w-full min-w-0 bg-transparent text-center font-display text-lg font-semibold focus:outline-none',
            tone === 'good' && 'text-good',
            tone === 'bad' && 'text-bad',
            tone === 'mute' && 'text-ink-mute',
          )}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
            onChange(Number.isNaN(n) ? 0 : clamp(n))
          }}
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          className="grid w-9 shrink-0 place-items-center text-ink-mute hover:bg-brand-50 hover:text-brand-700"
          onClick={() => onChange(clamp(value + 1))}
          aria-label={`Increase ${label}`}
          tabIndex={-1}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

/** 1–5 rating as a row of segmented buttons with end labels. */
export function Rating({
  label,
  value,
  onChange,
  words,
}: {
  label: string
  value: number | null
  onChange: (n: number) => void
  words: [string, string]
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-5 gap-1.5" role="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${label}: ${n} of 5`}
            onClick={() => onChange(n)}
            className={clsx(
              'h-10 rounded-control border text-sm font-semibold transition-colors',
              value === n
                ? 'border-brand-600 bg-brand-600 text-white'
                : value !== null && n < value
                  ? 'border-brand-200 bg-brand-50 text-brand-700'
                  : 'border-line-strong bg-surface text-ink-soft hover:border-brand-400',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-ink-mute">
        <span>{words[0]}</span>
        <span>{words[1]}</span>
      </div>
    </fieldset>
  )
}

/** Pill-style single choice (filters, segmented controls). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'h-9 rounded-chip border px-3.5 text-sm font-medium transition-colors',
            value === o.value ? 'border-ink bg-ink text-white' : 'border-line-strong bg-surface text-ink-soft hover:border-brand-400',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
