import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useSignedIn } from '../context/AppContext'
import { scoreAll } from '../domain/analytics'
import { api } from '../services'
import { useAsync } from './useAsync'

/**
 * Whose records this screen shows.
 *  - student: always themself
 *  - admin:   the student in the URL, /admin/students/:studentId/...
 */
export function useStudentId() {
  const { session } = useSignedIn()
  const { studentId } = useParams()
  if (session.role === 'student') return session.userId
  if (!studentId) throw new Error('Admin screen rendered without a :studentId in the URL')
  return studentId
}

/** Link prefix so shared screens work in both views: '/app' or '/admin/students/:id'. */
export function useBase() {
  const { session } = useSignedIn()
  const { studentId } = useParams()
  return session.role === 'admin' ? `/admin/students/${studentId}` : '/app'
}

/** Loads tests + mistakes + tasks together for dashboard-style screens. */
export function useStudentData() {
  const studentId = useStudentId()
  const q = useAsync(
    () =>
      Promise.all([api.listTests(studentId), api.listMistakes(studentId), api.listTasks(studentId)]).then(([tests, mistakes, tasks]) => ({
        tests,
        mistakes,
        tasks,
      })),
    [studentId],
  )
  const scored = useMemo(() => (q.data ? scoreAll(q.data.tests) : []), [q.data])
  return { ...q, scored, studentId }
}
