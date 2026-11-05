import { Download, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button, PageHeader, Panel, PanelHeader } from '../../components/ui/primitives'
import { TextField } from '../../components/ui/form'
import { useToast } from '../../components/ui/toast'
import { useSignedIn } from '../../context/AppContext'
import { scoreTest } from '../../domain/scoring'
import type { Settings, StudentSummary } from '../../domain/types'
import { api, IS_DEMO } from '../../services'

export default function AdminSettings() {
  const { settings, setSettings } = useSignedIn()
  const toast = useToast()
  const [f, setF] = useState<Settings>(settings)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const dirty = JSON.stringify(f) !== JSON.stringify(settings)
  const num = (v: string) => (v === '' ? 0 : Number(v))

  const save = async () => {
    setSaving(true)
    setErr(null)
    try {
      const s = await api.updateSettings(f)
      setSettings(s)
      toast('Settings saved')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Settings & reports" />

      <Panel className="sm:p-6">
        <PanelHeader title="Exam" sub="Shown as the countdown on every student's home screen." />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="NEET exam date" type="date" value={f.examDate} onChange={(e) => setF({ ...f, examDate: e.target.value })} />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-4 accent-brand-600" checked={f.examDateConfirmed} onChange={(e) => setF({ ...f, examDateConfirmed: e.target.checked })} />
            Date confirmed by NTA (removes the "expected" label)
          </label>
        </div>
      </Panel>

      <Panel className="sm:p-6">
        <PanelHeader title="Marking scheme & paper pattern" sub="Check against the official NEET notice. Applies to tests added from now on — saved tests keep the scheme they were marked with." />
        <div className="grid grid-cols-3 gap-3">
          <TextField label="Per correct" inputMode="decimal" value={f.scheme.correct} onChange={(e) => setF({ ...f, scheme: { ...f.scheme, correct: num(e.target.value) } })} />
          <TextField label="Penalty per wrong" inputMode="decimal" value={f.scheme.incorrect} onChange={(e) => setF({ ...f, scheme: { ...f.scheme, incorrect: num(e.target.value) } })} />
          <TextField label="Per blank" inputMode="decimal" value={f.scheme.unattempted} onChange={(e) => setF({ ...f, scheme: { ...f.scheme, unattempted: num(e.target.value) } })} />
          <TextField label="Physics Qs" inputMode="numeric" value={f.pattern.physics} onChange={(e) => setF({ ...f, pattern: { ...f.pattern, physics: num(e.target.value) } })} />
          <TextField label="Chemistry Qs" inputMode="numeric" value={f.pattern.chemistry} onChange={(e) => setF({ ...f, pattern: { ...f.pattern, chemistry: num(e.target.value) } })} />
          <TextField label="Biology Qs" inputMode="numeric" value={f.pattern.biology} onChange={(e) => setF({ ...f, pattern: { ...f.pattern, biology: num(e.target.value) } })} />
        </div>
        <p className="mt-3 text-sm text-ink-mute">
          Full paper = {f.pattern.physics + f.pattern.chemistry + f.pattern.biology} questions, max{' '}
          {(f.pattern.physics + f.pattern.chemistry + f.pattern.biology) * f.scheme.correct} marks.
        </p>
      </Panel>

      {err && (
        <p className="rounded-control bg-bad-soft px-3 py-2.5 text-sm text-bad" role="alert">
          {err}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled={!dirty} onClick={() => setF(settings)}>
          Undo changes
        </Button>
        <Button disabled={!dirty} loading={saving} onClick={save}>
          Save settings
        </Button>
      </div>

      <Panel className="sm:p-6">
        <PanelHeader title="Export" sub="Every student's records as CSV — opens in Excel or Google Sheets." />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportTests().then(() => toast('Tests exported'))}>
            <Download className="size-4" /> Tests (CSV)
          </Button>
          <Button variant="secondary" onClick={() => exportMistakes().then(() => toast('Mistakes exported'))}>
            <Download className="size-4" /> Mistakes (CSV)
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Print this page
          </Button>
        </div>
      </Panel>

      {IS_DEMO && (
        <Panel tone="quiet" className="sm:p-6">
          <PanelHeader title="Demo data" sub="Puts back the sample tests, mistakes and tasks." />
          <Button
            variant="secondary"
            onClick={async () => {
              await api.resetDemo?.()
              window.location.href = '/login'
            }}
          >
            <RotateCcw className="size-4" /> Reset demo data
          </Button>
        </Panel>
      )}
    </div>
  )
}

function download(name: string, rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    let s = v === null ? '' : String(v)
    // Formula-injection guard: a text cell starting with = + - @ would run as a
    // formula in Excel/Sheets. Prefix it with ' so it stays plain text.
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Runs `fn` for each student and tags every row with the student's name. */
async function perStudent<T>(fn: (s: StudentSummary) => Promise<T[]>) {
  const students = await api.listStudents()
  const chunks = await Promise.all(students.map(async (s) => (await fn(s)).map((row) => ({ student: s, row }))))
  return chunks.flat()
}

async function exportTests() {
  const tests = await perStudent((s) => api.listTests(s.id))
  const header = ['student', 'date', 'name', 'type', 'source', 'score', 'max', 'accuracy', 'negative', 'phy_c', 'phy_i', 'chem_c', 'chem_i', 'bio_c', 'bio_i', 'difficulty']
  const rows = tests.map(({ student, row: t }) => {
    const r = scoreTest(t, t.scheme)
    const s = (sub: string) => t.subjects.find((x) => x.subject === sub)
    return [student.name, t.date, t.name, t.type, t.source, r.score, r.maxScore, r.accuracy, r.negative, s('physics')?.correct ?? null, s('physics')?.incorrect ?? null, s('chemistry')?.correct ?? null, s('chemistry')?.incorrect ?? null, s('biology')?.correct ?? null, s('biology')?.incorrect ?? null, t.difficulty]
  })
  download('hitneet-tests.csv', [header, ...rows])
}

async function exportMistakes() {
  const ms = await perStudent((s) => api.listMistakes(s.id))
  download('hitneet-mistakes.csv', [
    ['student', 'test_id', 'subject', 'chapter', 'topic', 'question', 'category', 'lucky_guess', 'what_went_wrong', 'correct_approach', 'confidence', 'status'],
    ...ms.map(({ student, row: m }) => [student.name, m.testId, m.subject, m.chapter, m.topic, m.questionNumber, m.category, m.luckyGuess ? 'yes' : 'no', m.whatWentWrong, m.correctApproach, m.confidence, m.status]),
  ])
}
