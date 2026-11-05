import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, ErrorState, LoadingBlock, Panel } from '../../components/ui/primitives'
import { Rating, TextArea, TextField } from '../../components/ui/form'
import { useToast } from '../../components/ui/toast'
import { formatDate } from '../../domain/dates'
import { RATING_WORDS, SUBJECT_LABEL } from '../../domain/labels'
import { SUBJECTS, type Reflection, type ReflectionInput, type Test } from '../../domain/types'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../services'

export default function ReflectionPage() {
  const { id = '' } = useParams()
  const q = useAsync(() => Promise.all([api.getTest(id), api.getReflection(id)]).then(([test, reflection]) => ({ test, reflection })), [id])
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />
  if (q.loading || !q.data) return <LoadingBlock rows={4} />
  return <ReflectionForm test={q.data.test} existing={q.data.reflection} />
}

function ReflectionForm({ test, existing }: { test: Test; existing: Reflection | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [f, setF] = useState<ReflectionInput>(
    () =>
      existing ?? {
        testId: test.id,
        difficulty: test.difficulty ?? 3,
        confidence: 3,
        concentration: 3,
        stress: 3,
        finishedOnTime: true,
        timeNotes: '',
        subjectNotes: { physics: '', chemistry: '', biology: '' },
        sillyMistakes: '',
        guessing: '',
        chaptersToRevise: '',
        nextTarget: null,
        comments: '',
      },
  )
  const set = <K extends keyof ReflectionInput>(k: K, v: ReflectionInput[K]) => setF((x) => ({ ...x, [k]: v }))

  const save = async () => {
    setSaving(true)
    setErr(null)
    try {
      await api.saveReflection(f)
      toast('Reflection saved')
      navigate(`/app/tests/${test.id}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save. Try again.')
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/app/tests/${test.id}`} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> {test.name}
      </Link>
      <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">How did it go?</h1>
      <p className="mt-1 text-ink-soft">
        {test.name}, {formatDate(test.date, true)}. Honest beats perfect — only you and your admin see this.
      </p>

      <div className="mt-5 space-y-5">
        <Panel className="grid gap-5 sm:grid-cols-2 sm:p-6">
          <Rating label="Paper difficulty" value={f.difficulty} onChange={(v) => set('difficulty', v)} words={RATING_WORDS.difficulty} />
          <Rating label="Confidence" value={f.confidence} onChange={(v) => set('confidence', v)} words={RATING_WORDS.confidence} />
          <Rating label="Concentration" value={f.concentration} onChange={(v) => set('concentration', v)} words={RATING_WORDS.concentration} />
          <Rating label="Stress" value={f.stress} onChange={(v) => set('stress', v)} words={RATING_WORDS.stress} />
        </Panel>

        <Panel className="space-y-4 sm:p-6">
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Did you finish on time?</legend>
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={f.finishedOnTime === v}
                  onClick={() => set('finishedOnTime', v)}
                  className={`h-10 rounded-chip border px-4 text-sm font-medium ${f.finishedOnTime === v ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-soft'}`}
                >
                  {v ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </fieldset>
          <TextArea label="Time notes" optional placeholder="Order you attempted, where time went" value={f.timeNotes} onChange={(e) => set('timeNotes', e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-3">
            {SUBJECTS.map((s) => (
              <TextArea
                key={s}
                label={SUBJECT_LABEL[s]}
                optional
                rows={3}
                value={f.subjectNotes[s]}
                onChange={(e) => set('subjectNotes', { ...f.subjectNotes, [s]: e.target.value })}
              />
            ))}
          </div>
        </Panel>

        <Panel className="grid gap-4 sm:grid-cols-2 sm:p-6">
          <TextArea label="Silly mistakes" optional value={f.sillyMistakes} onChange={(e) => set('sillyMistakes', e.target.value)} />
          <TextArea label="Guessing" optional placeholder="How many, which subjects" value={f.guessing} onChange={(e) => set('guessing', e.target.value)} />
          <TextArea label="Chapters to revise" optional value={f.chaptersToRevise} onChange={(e) => set('chaptersToRevise', e.target.value)} />
          <TextField
            label="Target for the next test"
            optional
            inputMode="numeric"
            placeholder={`out of ${test.maxMarks}`}
            value={f.nextTarget ?? ''}
            onChange={(e) => {
              const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
              set('nextTarget', Number.isNaN(n) ? null : Math.min(n, test.maxMarks))
            }}
            hint="A realistic step up, not a leap."
          />
          <TextArea label="Anything else" optional value={f.comments} onChange={(e) => set('comments', e.target.value)} className="sm:col-span-2" />
        </Panel>

        {err && (
          <p className="rounded-control bg-bad-soft px-3 py-2.5 text-sm text-bad" role="alert">
            {err}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save reflection
          </Button>
        </div>
      </div>
    </div>
  )
}
