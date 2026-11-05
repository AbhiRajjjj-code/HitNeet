import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useSignedIn } from '../context/AppContext'
import { scoreAll } from '../domain/analytics'
import { api } from '../services'
import { useAsync } from './useAsync'

/** '/app' for the student, '/admin' for the admin — so shared screens link correctly. */
export function useBase() {
  return useLocation().pathname.startsWith('/admin') ? '/admin' : '/app'
}

/** Loads tests + mistakes + tasks together for dashboard-style screens. */
export function useStudentData() {
  const { settings } = useSignedIn()
  const q = useAsync(
    () => Promise.all([api.listTests(), api.listMistakes(), api.listTasks()]).then(([tests, mistakes, tasks]) => ({ tests, mistakes, tasks })),
    [],
  )
  const scored = useMemo(() => (q.data ? scoreAll(q.data.tests, settings.scheme) : []), [q.data, settings.scheme])
  return { ...q, scored }
}
