import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { addDays, daysBetween, formatDate, todayIST } from '../../domain/dates'
import { PRIORITY_LABEL } from '../../domain/labels'
import type { Task, TaskStatus } from '../../domain/types'
import { api } from '../../services'
import { useToast } from '../ui/toast'
import { SubjectChip } from './bits'

/** One task with a tick-box. Optimistic: ticks instantly, rolls back on error. */
export function TaskItem({ task, onChange, readOnly }: { task: Task; onChange: (t: Task) => void; readOnly?: boolean }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const done = task.status === 'done'
  const today = todayIST()

  const setStatus = async (status: TaskStatus) => {
    const prev = task
    onChange({ ...task, status })
    setBusy(true)
    try {
      onChange(await api.setTaskStatus(task.id, status))
      if (status === 'done') toast('Task done')
    } catch (e) {
      onChange(prev)
      toast(e instanceof Error ? e.message : 'Could not update the task', 'bad')
    } finally {
      setBusy(false)
    }
  }

  const due = task.dueDate
  const dueText = !due
    ? null
    : done
      ? null
      : due < today
        ? `Was due ${formatDate(due)}`
        : due === today
          ? 'Due today'
          : due === addDays(today, 1)
            ? 'Due tomorrow'
            : daysBetween(today, due) <= 6
              ? `Due in ${daysBetween(today, due)} days`
              : `Due ${formatDate(due)}`

  return (
    <div className="flex items-start gap-3 py-3">
      <button
        type="button"
        disabled={readOnly || busy}
        onClick={() => setStatus(done ? 'pending' : 'done')}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        aria-pressed={done}
        className={clsx(
          'mt-0.5 grid size-6 shrink-0 place-items-center rounded-[8px] border-2 transition-colors',
          done ? 'border-good bg-good text-white' : 'border-line-strong bg-surface hover:border-brand-500',
          readOnly && 'cursor-default',
        )}
      >
        {done && <Check className="size-3.5" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={clsx('font-medium leading-snug', done && 'text-ink-mute line-through decoration-ink-mute/50')}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-mute">
          {task.subject && <SubjectChip subject={task.subject} />}
          {task.priority === 'high' && !done && <span className="font-medium text-brand-700">{PRIORITY_LABEL.high} priority</span>}
          {dueText && <span className={clsx(due && due < today && 'text-warn')}>{dueText}</span>}
          {task.status === 'in_progress' && <span className="text-sky">In progress</span>}
          {task.status === 'deferred' && <span>Saved for later</span>}
        </div>
      </div>
    </div>
  )
}
