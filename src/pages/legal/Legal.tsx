/**
 * Public Privacy policy and Terms of use (/privacy, /terms).
 * Written in plain language. Google requires both links before an app with
 * "Continue with Google" can be published to everyone.
 * Keep them true: if what HitNeet stores or who can see it changes, update
 * these pages and the "Last updated" date.
 */
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../../components/domain/bits'

const CONTACT = 'abhira957@gmail.com'
const UPDATED = '5 November 2026'

export function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        HitNeet is a free study tool for tracking NEET mock tests. This page explains, in plain words, what HitNeet keeps about you, who can see it, and how to
        delete it.
      </p>

      <Section title="What HitNeet stores">
        <ul>
          <li>
            <b>Your account:</b> your name and email address. If you sign up with a password, it is stored only in scrambled (hashed) form — nobody, including
            the admin, can read it.
          </li>
          <li>
            <b>What you enter:</b> your mock-test marks, the mistakes you log, your reflections after a test, and your planner tasks.
          </li>
          <li>
            <b>On your device:</b> your browser keeps you signed in and saves an unfinished test form as a draft, so you don’t lose it. This stays in your browser.
          </li>
        </ul>
      </Section>

      <Section title="If you use “Continue with Google”">
        <p>
          Google tells HitNeet only your <b>name, email address and profile picture</b>. HitNeet never sees your Google password and can’t read your Gmail,
          contacts, files or anything else in your Google account.
        </p>
      </Section>

      <Section title="Who can see your data">
        <ul>
          <li>
            <b>You.</b>
          </li>
          <li>
            <b>The HitNeet admin</b> can view students’ records (read-only) to help them prepare. The admin can’t change or add to your records.
          </li>
          <li>
            <b>Nobody else.</b> Other students can’t see your data — the database itself blocks it, not just the app’s screens.
          </li>
        </ul>
        <p>HitNeet has no ads and no tracking or analytics tools. Your data is never sold or shared with anyone for marketing.</p>
      </Section>

      <Section title="Where it is kept">
        <p>
          Data is stored with <b>Supabase</b> (a database service) on servers in Mumbai, India, and the website is served by <b>Netlify</b>. Both are used only to
          run HitNeet. Connections are encrypted (HTTPS).
        </p>
      </Section>

      <Section title="Deleting your account">
        <p>
          Email <Mail /> from the address you signed up with and ask for your account to be deleted. Your account and everything you entered will be permanently
          removed, usually within 7 days.
        </p>
      </Section>

      <Section title="Under 18?">
        <p>Many NEET students are under 18. If you are, please use HitNeet with a parent or guardian’s knowledge.</p>
      </Section>

      <Section title="Changes and questions">
        <p>
          If this policy changes, the new version will be posted here with a new date. Questions? Email <Mail />.
        </p>
      </Section>
    </LegalPage>
  )
}

export function Terms() {
  return (
    <LegalPage title="Terms of use">
      <p>By creating an account or using HitNeet, you agree to these simple terms.</p>

      <Section title="What HitNeet is">
        <p>
          A free, personal tool to record NEET mock-test results, mistakes and study tasks, and to see trends. It is not a coaching service and is not linked to
          NTA or any coaching institute.
        </p>
      </Section>

      <Section title="No guarantees">
        <p>
          HitNeet is provided “as is”. Scores and trends are worked out from the numbers you enter, so they are only as accurate as those numbers. HitNeet doesn’t
          promise any exam result. Always check official exam details (dates, marking scheme) with NTA.
        </p>
      </Section>

      <Section title="Your account">
        <ul>
          <li>Keep your password private. You are responsible for what happens in your account.</li>
          <li>Enter only your own information.</li>
        </ul>
      </Section>

      <Section title="Fair use">
        <p>Don’t try to access other people’s accounts or data, disrupt the service, or use it for anything unlawful. Accounts that do may be removed.</p>
      </Section>

      <Section title="Changes">
        <p>
          HitNeet may change, pause or end the service, and may update these terms. Changes will be posted here with a new date. If you want your data deleted,
          see the <Link to="/privacy">Privacy policy</Link>.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Email <Mail />.
        </p>
      </Section>
    </LegalPage>
  )
}

function Mail() {
  return (
    <a href={`mailto:${CONTACT}`} className="font-medium">
      {CONTACT}
    </a>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-sans text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  )
}

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex items-center justify-between">
          <Link to="/login" aria-label="HitNeet home">
            <Brand />
          </Link>
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
            <ArrowLeft className="size-4" /> Sign in
          </Link>
        </div>
        <h1 className="mt-10 text-[32px] font-bold leading-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-mute">Last updated {UPDATED}</p>
        <article className="mt-6 text-[16px] leading-relaxed text-ink-soft [&_a]:text-brand-700 [&_a]:underline [&_b]:font-semibold [&_b]:text-ink [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </article>
        <LegalLinks className="mt-14 border-t border-line pt-6" />
      </div>
    </div>
  )
}

/** "Privacy · Terms" links, also used in the sign-in page footer. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={`flex justify-center gap-4 text-sm text-ink-mute ${className ?? ''}`}>
      <Link to="/privacy" className="hover:text-ink hover:underline">
        Privacy policy
      </Link>
      <Link to="/terms" className="hover:text-ink hover:underline">
        Terms of use
      </Link>
    </nav>
  )
}
