/**
 * Log or edit a mistake. Opens as a bottom sheet on phones, a centred
 * dialog on desktop. Uses the native <dialog> element for focus trapping
 * and Esc-to-close.
 */
import clsx from 'clsx'
import { ImagePlus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, formatDate, todayIST } from '../../domain/dates'
import { CATEGORY_HINT, CATEGORY_LABEL, RATING_WORDS, SUBJECT_LABEL } from '../../domain/labels'
import { SUBJECTS, type Mistake, type MistakeCategory, type MistakeInput, type Subject, type Test } from '../../domain/types'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../services'
import { Rating, SelectField, TextArea, TextField } from '../ui/form'
import { Button } from '../ui/primitives'
import { useToast } from '../ui/toast'

const CATEGORIES = Object.keys(CATEGORY_LABEL) as MistakeCategory[]

export function MistakeSheet({
  tests,
  defaultTestId,
  existing,
  onClose,
  onSaved,
}: {
  tests: Test[]
  defaultTestId?: string
  existing?: Mistake
  onClose: () => void
  onSaved: (m: Mistake) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const toast = useToast()
  const chapters = useAsync(() => api.listChapters(), [])
  const [requestId] = useState(() => crypto.randomUUID())
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [f, setF] = useState<MistakeInput>(() =>
    existing
      ? { ...existing }
      : {
          testId: defaultTestId ?? tests[0]?.id ?? '',
          subject: 'physics',
          chapter: '',
          topic: '',
          questionNumber: null,
          category: 'conceptual',
          luckyGuess: false,
          whatWentWrong: '',
          correctApproach: '',
          confidence: 3,
          status: 'open',
          reviewDate: addDays(todayIST(), 7),
        },
  )
  const set = <K extends keyof MistakeInput>(k: K, v: MistakeInput[K]) => setF((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    // No close() in cleanup: it fires the dialog's "close" event, which would
    // call onClose and unmount us (React StrictMode runs effects twice in dev).
    if (ref.current && !ref.current.open) ref.current.showModal()
  }, [])

  const subjectChapters = useMemo(() => (chapters.data ?? []).filter((c) => c.subject === f.subject), [chapters.data, f.subject])
  const errors = {
    testId: !f.testId ? 'Pick the test.' : undefined,
    chapter: !f.chapter ? 'Pick a chapter — it powers the patterns view.' : undefined,
    whatWentWrong: !f.whatWentWrong.trim() ? 'One line is enough.' : undefined,
  }
  const ok = !errors.testId && !errors.chapter && !errors.whatWentWrong

  const save = async () => {
    setTouched(true)
    if (!ok) return
    setSaving(true)
    setErr(null)
    try {
      const m = existing ? await api.updateMistake(existing.id, f) : await api.createMistake(f, requestId)
      toast(existing ? 'Mistake updated' : f.luckyGuess ? 'Lucky guess logged' : 'Mistake logged')
      onSaved(m)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="mistake-title"
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-[26px] bg-surface p-0 text-ink backdrop:bg-ink/40 sm:m-auto sm:max-w-2xl sm:rounded-panel"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="mistake-title" className="text-xl font-semibold">
            {existing ? 'Edit mistake' : 'Log a mistake'}
          </h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-control text-ink-mute hover:bg-paper" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2">
          {tests.length > 1 && (
            <SelectField label="From test" value={f.testId} onChange={(e) => set('testId', e.target.value)} error={touched ? errors.testId : undefined} className="sm:col-span-2">
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {formatDate(t.date)}
                </option>
              ))}
            </SelectField>
          )}
          <SelectField
            label="Subject"
            value={f.subject}
            onChange={(e) => setF((x) => ({ ...x, subject: e.target.value as Subject, chapter: '' }))}
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {SUBJECT_LABEL[s]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Chapter" value={f.chapter} onChange={(e) => set('chapter', e.target.value)} error={touched ? errors.chapter : undefined}>
            <option value="">Choose…</option>
            {subjectChapters.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </SelectField>
          <TextField label="Topic" optional placeholder="e.g. Rolling motion" value={f.topic} onChange={(e) => set('topic', e.target.value)} />
          <TextField
            label="Question no."
            optional
            inputMode="numeric"
            value={f.questionNumber ?? ''}
            onChange={(e) => set('questionNumber', e.target.value ? parseInt(e.target.value.replace(/\D/g, ''), 10) || null : null)}
          />

          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">What kind of mistake?</legend>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-label={`${CATEGORY_LABEL[c]}: ${CATEGORY_HINT[c]}`}
                  aria-checked={f.category === c}
                  onClick={() => set('category', c)}
                  className={clsx(
                    'rounded-control border px-3 py-2 text-left transition-colors',
                    f.category === c ? 'border-brand-600 bg-brand-50' : 'border-line-strong hover:border-brand-400',
                  )}
                >
                  <span className="block text-sm font-semibold">{CATEGORY_LABEL[c]}</span>
                  <span className="block text-xs text-ink-mute">{CATEGORY_HINT[c]}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start gap-3 rounded-control bg-paper px-3 py-3 sm:col-span-2">
            <input type="checkbox" className="mt-0.5 size-4 accent-brand-600" checked={f.luckyGuess} onChange={(e) => set('luckyGuess', e.target.checked)} />
            <span className="text-sm">
              <span className="font-medium">I got this right, but it was a guess.</span>
              <span className="block text-ink-mute">Lucky guesses are worth reviewing too — next time it might not land.</span>
            </span>
          </label>

          <TextArea
            label={f.luckyGuess ? 'What were you unsure about?' : 'What went wrong?'}
            value={f.whatWentWrong}
            onChange={(e) => set('whatWentWrong', e.target.value)}
            error={touched ? errors.whatWentWrong : undefined}
            className="sm:col-span-2"
          />
          <TextArea label="The right way to do it" optional value={f.correctApproach} onChange={(e) => set('correctApproach', e.target.value)} className="sm:col-span-2" />
          <Rating label="How sure were you while answering?" value={f.confidence} onChange={(v) => set('confidence', v)} words={RATING_WORDS.confidence} />
          <TextField label="Review again on" type="date" optional value={f.reviewDate ?? ''} onChange={(e) => set('reviewDate', e.target.value || null)} />

          <div className="flex items-center gap-3 rounded-control border border-dashed border-line-strong px-3 py-3 text-sm text-ink-mute sm:col-span-2">
            <ImagePlus className="size-5 shrink-0" />
            Photo of the question — coming once file storage is connected.
          </div>
          {err && (
            <p className="rounded-control bg-bad-soft px-3 py-2 text-sm text-bad sm:col-span-2" role="alert">
              {err}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {existing ? 'Save changes' : 'Log it'}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
