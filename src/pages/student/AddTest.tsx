/**
 * Add / edit a test. Three short steps, live score preview, autosaved draft.
 *
 * Only correct + incorrect are typed; unattempted is worked out, which
 * removes the most common data-entry mistake (counts not adding up).
 */
import clsx from 'clsx'
import { ArrowLeft, Check, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, ErrorState, LoadingBlock, Panel } from '../../components/ui/primitives'
import { Rating, Segmented, Stepper, TextField } from '../../components/ui/form'
import { useToast } from '../../components/ui/toast'
import { useSignedIn } from '../../context/AppContext'
import { todayIST } from '../../domain/dates'
import { RATING_WORDS, SUBJECT_LABEL, SUBJECT_STYLE, TEST_TYPE_LABEL } from '../../domain/labels'
import { scoreTest, validateCounts } from '../../domain/scoring'
import { SUBJECTS, type Settings, type Subject, type SubjectCounts, type Test, type TestInput, type TestType } from '../../domain/types'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../services'

const DRAFT_KEY = 'hitneet.draft.addTest'

interface Form {
  name: string
  date: string
  type: TestType
  source: string
  durationMin: number
  timeTakenMin: number | null
  difficulty: number | null
  paperLength: number | null
  included: Record<Subject, boolean>
  counts: Record<Subject, { total: number; correct: number; incorrect: number }>
}

function blankForm(s: Settings): Form {
  return {
    name: '',
    date: todayIST(),
    type: 'full',
    source: '',
    durationMin: s.durationMin,
    timeTakenMin: null,
    difficulty: null,
    paperLength: null,
    included: { physics: true, chemistry: true, biology: true },
    counts: {
      physics: { total: s.pattern.physics, correct: 0, incorrect: 0 },
      chemistry: { total: s.pattern.chemistry, correct: 0, incorrect: 0 },
      biology: { total: s.pattern.biology, correct: 0, incorrect: 0 },
    },
  }
}

function fromTest(t: Test, s: Settings): Form {
  const f = blankForm(s)
  f.name = t.name
  f.date = t.date
  f.type = t.type
  f.source = t.source
  f.durationMin = t.durationMin
  f.timeTakenMin = t.timeTakenMin
  f.difficulty = t.difficulty
  f.paperLength = t.paperLength
  for (const sub of SUBJECTS) {
    const c = t.subjects.find((x) => x.subject === sub)
    f.included[sub] = !!c
    if (c) f.counts[sub] = { total: c.totalQuestions, correct: c.correct, incorrect: c.incorrect }
  }
  return f
}

function toCounts(f: Form): SubjectCounts[] {
  return SUBJECTS.filter((s) => f.included[s]).map((s) => {
    const c = f.counts[s]
    return { subject: s, totalQuestions: c.total, correct: c.correct, incorrect: c.incorrect, unattempted: Math.max(0, c.total - c.correct - c.incorrect) }
  })
}

const STEPS = ['Basics', 'Marks', 'How it felt'] as const

export default function AddTest() {
  const { id } = useParams()
  const { settings } = useSignedIn()
  const existing = useAsync(() => (id ? api.getTest(id) : Promise.resolve(null)), [id])

  if (id && existing.error) return <ErrorState error={existing.error} onRetry={existing.reload} />
  if (id && (existing.loading || !existing.data)) return <LoadingBlock />
  return <TestForm key={id ?? 'new'} initial={existing.data ? fromTest(existing.data, settings) : null} editId={id ?? null} />
}

function TestForm({ initial, editId }: { initial: Form | null; editId: string | null }) {
  const { settings } = useSignedIn()
  const navigate = useNavigate()
  const toast = useToast()
  const [requestId] = useState(() => crypto.randomUUID())
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [draft] = useState<Form | null>(() => {
    if (initial) return null
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      return raw ? (JSON.parse(raw) as Form) : null
    } catch {
      return null
    }
  })
  const [restored, setRestored] = useState(draft !== null)
  const [form, setForm] = useState<Form>(() => initial ?? draft ?? blankForm(settings))

  // Autosave new-test drafts so a closed tab or dropped network doesn't lose work.
  useEffect(() => {
    if (editId) return
    const touchedAnything = form.name.trim() !== '' || SUBJECTS.some((s) => form.counts[s].correct + form.counts[s].incorrect > 0)
    try {
      if (touchedAnything) localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
      else localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* ignore */
    }
  }, [form, editId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setCount = (s: Subject, k: 'total' | 'correct' | 'incorrect', v: number) =>
    setForm((f) => ({ ...f, counts: { ...f.counts, [s]: { ...f.counts[s], [k]: v } } }))

  const changeType = (type: TestType) =>
    setForm((f) => ({
      ...f,
      type,
      included: type === 'full' || type === 'part' ? { physics: true, chemistry: true, biology: true } : f.included,
      counts:
        type === 'full'
          ? {
              physics: { ...f.counts.physics, total: settings.pattern.physics },
              chemistry: { ...f.counts.chemistry, total: settings.pattern.chemistry },
              biology: { ...f.counts.biology, total: settings.pattern.biology },
            }
          : f.counts,
    }))

  const counts = toCounts(form)
  const result = useMemo(() => scoreTest({ subjects: counts }, settings.scheme), [counts, settings.scheme])
  // Shown live (not only after "Next"): an impossible count is never a half-typed state worth hiding.
  const countIssues: Partial<Record<Subject, string>> = Object.fromEntries(
    counts.map((c) => {
      const over = c.correct + c.incorrect - c.totalQuestions
      return [c.subject, over > 0 ? `${over} too many — correct + incorrect can't be more than ${c.totalQuestions} questions.` : undefined]
    }),
  )

  const basicsErrors = {
    name: !form.name.trim() ? 'Give the test a name, e.g. "Allen FT 10".' : undefined,
    date: !form.date ? 'Pick the date you took it.' : undefined,
    subjects: counts.length === 0 ? 'Pick at least one subject.' : undefined,
  }
  const basicsOk = !basicsErrors.name && !basicsErrors.date && !basicsErrors.subjects
  const marksOk = counts.every((c) => validateCounts(c).length === 0 && c.totalQuestions > 0)

  const next = () => {
    setTouched(true)
    if (step === 0 && !basicsOk) return
    if (step === 1 && !marksOk) return
    setTouched(false)
    setStep((s) => Math.min(2, s + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async () => {
    setTouched(true)
    if (!basicsOk) return setStep(0)
    if (!marksOk) return setStep(1)
    setSaving(true)
    setServerError(null)
    const input: TestInput = {
      name: form.name.trim(),
      date: form.date,
      type: form.type,
      source: form.source.trim(),
      maxMarks: result.maxScore,
      totalQuestions: result.totalQuestions,
      durationMin: form.durationMin,
      timeTakenMin: form.timeTakenMin,
      difficulty: form.difficulty,
      paperLength: form.paperLength,
      subjects: counts,
      status: 'submitted',
    }
    try {
      // Same requestId on retry → server returns the same test, no duplicate.
      const saved = editId ? await api.updateTest(editId, input) : await api.createTest(input, requestId)
      if (!editId) localStorage.removeItem(DRAFT_KEY)
      toast(editId ? 'Changes saved' : 'Test saved')
      navigate(`/app/tests/${saved.id}${editId ? '' : '?saved=1'}`)
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Could not save. Your entries are kept — try again.')
    } finally {
      setSaving(false)
    }
  }

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setForm(blankForm(settings))
    setRestored(false)
    setStep(0)
  }

  return (
    <div className="mx-auto max-w-5xl pb-20 lg:pb-0">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Back
      </button>
      <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{editId ? 'Edit test' : 'Add a test'}</h1>
      <p className="mt-1 text-ink-soft">Just the numbers for now. Mistakes and reflection can come later.</p>

      {restored && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-control bg-sky-soft px-4 py-2.5 text-sm">
          <span>Picked up your unsaved draft.</span>
          <button onClick={discardDraft} className="flex items-center gap-1 font-medium text-sky hover:underline">
            <RotateCcw className="size-3.5" /> Start fresh
          </button>
        </div>
      )}

      {/* Step indicator — this really is a sequence, so numbers are honest here */}
      <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => (i < step || (i === 1 && basicsOk) || (i === 2 && basicsOk && marksOk) ? setStep(i) : undefined)}
              aria-current={step === i ? 'step' : undefined}
              className="w-full text-left"
            >
              <span className={clsx('block h-1.5 rounded-full', i <= step ? 'bg-brand-600' : 'bg-line')} />
              <span className={clsx('mt-1.5 flex items-center gap-1 text-sm', i === step ? 'font-semibold text-ink' : 'text-ink-mute')}>
                {i < step ? <Check className="size-3.5 text-good" /> : <span className="tabular">{i + 1}.</span>} {label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
        <Panel className="sm:p-6">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Test name"
                placeholder="e.g. Allen FT 10"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                error={touched ? basicsErrors.name : undefined}
                className="sm:col-span-2"
                autoFocus
              />
              <TextField label="Date" type="date" value={form.date} max={todayIST()} onChange={(e) => set('date', e.target.value)} error={touched ? basicsErrors.date : undefined} />
              <TextField label="Source" placeholder="Coaching or book" optional value={form.source} onChange={(e) => set('source', e.target.value)} list="sources" />
              <datalist id="sources">
                <option value="Allen AITS" />
                <option value="Aakash" />
                <option value="PW" />
                <option value="Self (PYQ set)" />
              </datalist>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm font-medium">Type</p>
                <Segmented
                  label="Test type"
                  value={form.type}
                  onChange={changeType}
                  options={(Object.keys(TEST_TYPE_LABEL) as TestType[]).map((t) => ({ value: t, label: TEST_TYPE_LABEL[t] }))}
                />
              </div>
              {(form.type === 'chapter' || form.type === 'subject') && (
                <fieldset className="sm:col-span-2">
                  <legend className="mb-1.5 text-sm font-medium">Subjects in this test</legend>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS.map((s) => (
                      <label
                        key={s}
                        className={clsx(
                          'flex h-10 items-center gap-2 rounded-chip border px-3.5 text-sm font-medium',
                          form.included[s] ? `${SUBJECT_STYLE[s].soft} ${SUBJECT_STYLE[s].text} border-transparent` : 'border-line-strong text-ink-soft',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-brand-600"
                          checked={form.included[s]}
                          onChange={(e) => set('included', { ...form.included, [s]: e.target.checked })}
                        />
                        {SUBJECT_LABEL[s]}
                      </label>
                    ))}
                  </div>
                  {touched && basicsErrors.subjects && <p className="mt-1.5 text-sm text-bad">{basicsErrors.subjects}</p>}
                </fieldset>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {form.type === 'full' && (
                <p className="text-sm text-ink-mute">
                  Full paper: {settings.pattern.physics} + {settings.pattern.chemistry} + {settings.pattern.biology} questions, +{settings.scheme.correct} / −{settings.scheme.incorrect}.
                </p>
              )}
              {counts.map((c) => {
                const s = c.subject
                const err = countIssues[s]
                const r = result.subjects.find((x) => x.subject === s)!
                return (
                  <div key={s} className={clsx('rounded-[18px] border p-4', err ? 'border-bad/50 bg-bad-soft/40' : 'border-line')}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className={clsx('flex items-center gap-2 font-sans text-base font-semibold', SUBJECT_STYLE[s].text)}>
                        <span className={clsx('size-2.5 rounded-full', SUBJECT_STYLE[s].bg)} aria-hidden />
                        {SUBJECT_LABEL[s]}
                      </h3>
                      <span className="tabular text-sm text-ink-soft">
                        <span className="font-display text-lg font-bold text-ink">{r.score}</span> / {r.maxScore}
                      </span>
                    </div>
                    <div className={clsx('grid gap-2', form.type === 'full' ? 'grid-cols-2' : 'grid-cols-3')}>
                      {form.type !== 'full' && <Stepper label="Questions" value={c.totalQuestions} onChange={(v) => setCount(s, 'total', v)} max={200} />}
                      <Stepper label="Correct" tone="good" value={c.correct} onChange={(v) => setCount(s, 'correct', v)} max={c.totalQuestions} />
                      <Stepper label="Incorrect" tone="bad" value={c.incorrect} onChange={(v) => setCount(s, 'incorrect', v)} max={c.totalQuestions} />
                    </div>
                    <p className="mt-2 text-sm text-ink-mute">
                      Left blank: <span className="tabular font-semibold text-ink">{Math.max(0, c.totalQuestions - c.correct - c.incorrect)}</span> of {c.totalQuestions}
                    </p>
                    {err && (
                      <p className="mt-1 text-sm text-bad" role="alert">
                        {err}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5">
              <p className="text-sm text-ink-mute">All optional — but they help explain the score later.</p>
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Time allowed (min)"
                  inputMode="numeric"
                  value={form.durationMin}
                  onChange={(e) => set('durationMin', parseInt(e.target.value.replace(/\D/g, '') || '0', 10))}
                />
                <TextField
                  label="Time you took (min)"
                  inputMode="numeric"
                  optional
                  value={form.timeTakenMin ?? ''}
                  onChange={(e) => set('timeTakenMin', e.target.value ? parseInt(e.target.value.replace(/\D/g, ''), 10) : null)}
                />
              </div>
              <Rating label="How hard did the paper feel?" value={form.difficulty} onChange={(v) => set('difficulty', v)} words={RATING_WORDS.difficulty} />
              <Rating label="How long did the paper feel?" value={form.paperLength} onChange={(v) => set('paperLength', v)} words={RATING_WORDS.paperLength} />
            </div>
          )}

          {serverError && (
            <p className="mt-4 rounded-control bg-bad-soft px-3 py-2.5 text-sm text-bad" role="alert">
              {serverError}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              {step === 1 && (
                <Button variant="secondary" onClick={submit} loading={saving}>
                  Save now
                </Button>
              )}
              {step < 2 ? (
                <Button onClick={next}>Next</Button>
              ) : (
                <Button onClick={submit} loading={saving}>
                  {editId ? 'Save changes' : 'Save test'}
                </Button>
              )}
            </div>
          </div>
        </Panel>

        {/* Live preview */}
        {/* Phones: a compact strip pinned above the bottom bar, so the score
            stays visible while typing. Desktop: a full card beside the form. */}
        <aside
          className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 lg:sticky lg:inset-auto lg:top-6 lg:z-auto"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3 rounded-[18px] bg-ink px-4 py-2.5 text-white shadow-lg shadow-ink/20 lg:block lg:rounded-panel lg:p-5 lg:shadow-none">
            <p className="hidden text-sm text-white/65 lg:block">Score so far</p>
            <p className="font-display text-3xl font-extrabold tabular lg:text-5xl">
              {result.score}
              <span className="ml-1 text-base font-semibold text-white/50 lg:text-xl">/ {result.maxScore}</span>
            </p>
            <dl className="grid grid-cols-3 gap-3 text-xs lg:mt-4 lg:gap-2 lg:text-sm">
              <div>
                <dt className="text-white/55">Accuracy</dt>
                <dd className="tabular font-semibold">{result.accuracy === null ? '—' : `${result.accuracy}%`}</dd>
              </div>
              <div>
                <dt className="text-white/55">Attempted</dt>
                <dd className="tabular font-semibold">{result.attemptRate}%</dd>
              </div>
              <div>
                <dt className="text-white/55">Negative</dt>
                <dd className="tabular font-semibold text-[#ffb4b4]">{result.negative ? `−${result.negative}` : '0'}</dd>
              </div>
            </dl>
            <p className="mt-4 hidden text-xs text-white/50 lg:block">The server recalculates this when you save.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
