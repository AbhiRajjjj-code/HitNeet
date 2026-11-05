/**
 * Database security tests.
 *
 * Runs every file in supabase/migrations/ inside PGlite (Postgres compiled to
 * WebAssembly, in memory — no Docker, no network), with a tiny stand-in for
 * Supabase's `auth` schema. Then signs in as two students, the admin and a
 * signed-out visitor and tries allowed and forbidden things.
 *
 * If a future migration weakens a rule, CI goes red before it reaches the
 * real database.
 */
import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const MIGRATIONS = join(import.meta.dirname, '..', 'migrations')
const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'
const ADM = '00000000-0000-0000-0000-0000000000ad'

let db: PGlite

/** Run SQL as a signed-in user (uuid) or as a signed-out visitor (null). */
async function as<T = Record<string, unknown>>(who: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${who ?? ''}', false);`)
  await db.exec(who ? 'set role authenticated' : 'set role anon')
  try {
    return (await db.query<T>(sql, params)).rows
  } finally {
    await db.exec('reset role')
  }
}
/** Same as `as`, but expects an error. Returns the error message. */
async function denied(who: string | null, sql: string, params: unknown[] = []) {
  try {
    await as(who, sql, params)
  } catch (e) {
    return (e as Error).message
  }
  throw new Error(`Expected this to be refused: ${sql}`)
}
const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0]
const count = async (who: string | null, table: string) => (await as<{ n: number }>(who, `select count(*)::int as n from public.${table}`))[0].n

const input = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    name: 'FT 1',
    date: '2026-11-01',
    type: 'full',
    source: 'Allen',
    durationMin: 180,
    timeTakenMin: 170,
    difficulty: 3,
    paperLength: 3,
    status: 'submitted',
    subjects: [
      { subject: 'physics', totalQuestions: 45, correct: 30, incorrect: 10, unattempted: 5 },
      { subject: 'chemistry', totalQuestions: 45, correct: 35, incorrect: 5, unattempted: 5 },
      { subject: 'biology', totalQuestions: 90, correct: 80, incorrect: 5, unattempted: 5 },
    ],
    ...over,
  })
const saveTest = async (who: string, requestId: string, json: string, id: string | null = null) =>
  (await as<{ id: string }>(who, `select public.save_test($1, $2, $3::jsonb) as id`, [id, requestId, json]))[0].id

beforeAll(async () => {
  db = new PGlite()
  // Minimal stand-in for what Supabase provides.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
  `)
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, f), 'utf8'))
  }
  await db.exec(`insert into public.admin_emails values ('admin@example.com')`)
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'a@example.com', '{"name":"Asha"}'), ($2, 'B@Example.com', '{"full_name":"Bina G"}'), ($3, 'ADMIN@example.com', '{}')`,
    [A, B, ADM],
  )
}, 60_000)

describe('accounts and roles', () => {
  it('decides the role from the email, never from the client', async () => {
    expect((await one<{ role: string }>(`select role from public.profiles where id = $1`, [ADM])).role).toBe('admin')
    expect(await one(`select role, display_name from public.profiles where id = $1`, [A])).toEqual({ role: 'student', display_name: 'Asha' })
    expect(await one(`select email, display_name from public.profiles where id = $1`, [B])).toEqual({ email: 'b@example.com', display_name: 'Bina G' })
  })

  it('a student cannot promote themself, but can rename themself', async () => {
    await denied(A, `update public.profiles set role = 'admin' where id = $1`, [A])
    await as(A, `update public.profiles set display_name = 'Asha K' where id = $1`, [A])
    expect((await one<{ display_name: string }>(`select display_name from public.profiles where id = $1`, [A])).display_name).toBe('Asha K')
  })

  it('profiles: students see themselves, the admin sees everyone; admin_emails is hidden', async () => {
    expect(await count(A, 'profiles')).toBe(1)
    expect(await count(ADM, 'profiles')).toBe(3)
    await denied(A, `select * from public.admin_emails`)
  })
})

describe('tests', () => {
  let t1 = ''

  it('saves a test with its subjects; a retry returns the same test', async () => {
    t1 = await saveTest(A, 'req-1', input())
    expect(await saveTest(A, 'req-1', input())).toBe(t1)
    expect(await count(A, 'tests')).toBe(1)
    expect(await count(A, 'test_subjects')).toBe(3)
    expect(await one(`select correct_marks::float c, wrong_penalty::float w, student_id from public.tests where id = $1`, [t1])).toEqual({ c: 4, w: 1, student_id: A })
  })

  it('rejects bad input and saves nothing half-way', async () => {
    await denied(A, `select public.save_test(null, 'bad', $1::jsonb)`, [input({ subjects: [{ subject: 'physics', totalQuestions: 45, correct: 40, incorrect: 10, unattempted: 0 }] })])
    await denied(A, `select public.save_test(null, 'empty', $1::jsonb)`, [input({ subjects: [] })])
    await denied(A, `select public.save_test(null, 'noname', $1::jsonb)`, [input({ name: '   ' })])
    expect(await count(A, 'tests')).toBe(1)
  })

  it('keeps students apart', async () => {
    expect(await count(B, 'tests')).toBe(0)
    expect(await count(B, 'test_subjects')).toBe(0)
    await denied(B, `select public.save_test($1, 'x', $2::jsonb)`, [t1, input({ name: 'hacked' })])
    expect((await one<{ name: string }>(`select name from public.tests where id = $1`, [t1])).name).toBe('FT 1')
    await denied(null, `select * from public.tests`)
    await denied(A, `delete from public.tests where id = $1`, [t1])
  })

  it('lets the admin read but not write', async () => {
    expect(await count(ADM, 'tests')).toBe(1)
    await denied(ADM, `select public.save_test(null, 'adm', $1::jsonb)`, [input()])
    await denied(ADM, `select public.save_test($1, 'x', $2::jsonb)`, [t1, input({ name: 'by admin' })])
    const students = await as<{ name: string; test_count: number }>(ADM, `select name, test_count::int from public.list_students()`)
    expect(students.map((s) => s.name).sort()).toEqual(['Asha K', 'Bina G'])
    expect(await as(A, `select * from public.list_students()`)).toEqual([])
  })

  it('freezes the marking scheme per test', async () => {
    await as(A, `update public.settings set correct_marks = 9`)
    expect((await one<{ c: number }>(`select correct_marks::float c from public.settings`)).c).toBe(4) // student can't
    await as(ADM, `update public.settings set correct_marks = 3`)
    expect((await one<{ c: number }>(`select correct_marks::float c from public.settings`)).c).toBe(3) // admin can

    await saveTest(A, 'ignored', input({ name: 'FT 1 edited' }), t1)
    expect(await one(`select name, correct_marks::float c from public.tests where id = $1`, [t1])).toEqual({ name: 'FT 1 edited', c: 4 })
    const t2 = await saveTest(A, 'req-2', input({ name: 'FT 2' }))
    expect((await one<{ c: number }>(`select correct_marks::float c from public.tests where id = $1`, [t2])).c).toBe(3)

    await as(A, `update public.tests set correct_marks = 10 where id = $1`, [t1]).catch(() => undefined)
    expect((await one<{ c: number }>(`select correct_marks::float c from public.tests where id = $1`, [t1])).c).toBe(4)
  })

  it('only the admin archives, and archived tests stay archived', async () => {
    await denied(A, `select public.archive_test($1)`, [t1])
    await as(ADM, `select public.archive_test($1)`, [t1])
    await as(A, `update public.tests set status = 'submitted' where id = $1`, [t1])
    expect((await one<{ status: string }>(`select status from public.tests where id = $1`, [t1])).status).toBe('archived')
  })
})

describe('mistakes, reflections, tasks', () => {
  it('students write their own; links must stay within one student', async () => {
    const tA = await saveTest(A, 'm-host', input({ name: 'Host' }))
    const tB = await saveTest(B, 'b-1', input())
    const ins = `insert into public.mistakes (test_id, request_id, subject, chapter, category, confidence) values ($1, $2, 'physics', 'Rotational Motion', 'silly', 3)`
    await as(A, ins, [tA, 'm1'])
    expect(await count(A, 'mistakes')).toBe(1)
    await denied(A, ins, [tA, 'm1']) // same request id twice
    await denied(A, ins, [tB, 'm2']) // someone else's test

    await as(A, `insert into public.reflections (test_id, difficulty, confidence, concentration, stress, finished_on_time) values ($1, 3,4,3,2,true)`, [tA])
    expect(await count(ADM, 'reflections')).toBe(1)
  })

  it('the admin cannot create tasks, mistakes or reflections', async () => {
    await denied(ADM, `insert into public.tasks (request_id, title) values ('t', 'Revise')`)
    const tA = (await one<{ id: string }>(`select id from public.tests where name = 'Host'`)).id
    await denied(ADM, `insert into public.reflections (test_id, student_id, difficulty, confidence, concentration, stress, finished_on_time) values ($1, $2, 3,3,3,3,true)`, [tA, A])
    await denied(ADM, `insert into public.mistakes (test_id, student_id, request_id, subject, chapter, category, confidence) values ($1, $2, 'x', 'physics', 'X', 'silly', 3)`, [tA, A])
  })

  it('completed_at follows the task status', async () => {
    await as(A, `insert into public.tasks (request_id, title) values ('task-1', 'Revise rotation')`)
    await as(A, `update public.tasks set status = 'done' where request_id = 'task-1'`)
    expect((await one<{ completed_at: Date | null }>(`select completed_at from public.tasks where request_id = 'task-1'`)).completed_at).not.toBeNull()
    await as(A, `update public.tasks set status = 'pending' where request_id = 'task-1'`)
    expect((await one<{ completed_at: Date | null }>(`select completed_at from public.tasks where request_id = 'task-1'`)).completed_at).toBeNull()
    expect(await count(B, 'tasks')).toBe(0)
  })
})

describe('reference data', () => {
  it('everyone (even signed out) can read settings and the 80 chapters', async () => {
    expect((await as(null, `select exam_date from public.settings`)).length).toBe(1)
    expect(await count(null, 'chapters')).toBe(80)
  })
})
