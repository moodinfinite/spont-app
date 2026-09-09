'use client'

import { useEffect, useState } from 'react'

type Choice = 'system' | 'light' | 'dark'

const LABELS: Record<Choice, string> = { system: 'System', light: 'Light', dark: 'Dark' }

/**
 * Appearance, as a setting rather than a button in the header.
 *
 * It was a two-state toggle beside the avatar, which had no way back: once
 * you'd touched it the app stopped following your phone, and nothing on the
 * screen said so or offered to undo it. Three states make "follow my phone"
 * a choice you can return to.
 *
 * The choice is a device preference, not an account one — it lives in
 * localStorage, so it persists on this phone and doesn't follow you to
 * another one, which is the behaviour people expect from dark mode.
 */
export function ThemeChoice() {
  /**
   * The server can't read localStorage, so nothing is marked as chosen until
   * after mount — rendering a guess here is a hydration mismatch.
   */
  const [choice, setChoice] = useState<Choice | null>(null)

  useEffect(() => {
    const stored = window.localStorage.getItem('spont-theme')
    setChoice(stored === 'light' || stored === 'dark' ? stored : 'system')
  }, [])

  function pick(next: Choice) {
    setChoice(next)
    if (next === 'system') {
      window.localStorage.removeItem('spont-theme')
      document.documentElement.removeAttribute('data-theme')
    } else {
      window.localStorage.setItem('spont-theme', next)
      document.documentElement.setAttribute('data-theme', next)
    }
  }

  return (
    <span className="seg" role="group" aria-label="Appearance">
      {(Object.keys(LABELS) as Choice[]).map((c) => (
        <button key={c} type="button" aria-pressed={choice === c} onClick={() => pick(c)}>
          {LABELS[c]}
        </button>
      ))}
    </span>
  )
}

/**
 * The same choice as a single tap, for a page header.
 *
 * Deliberately only two states. It flips between light and dark, which is
 * what someone reaching for a header icon wants; going back to following
 * your phone is a deliberate act and lives in Settings, next to the
 * explanation of what "System" means.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)

  useEffect(() => {
    const stored = window.localStorage.getItem('spont-theme')
    if (stored === 'light' || stored === 'dark') setTheme(stored)
  }, [])

  function toggle() {
    const current =
      theme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    const next = current === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    window.localStorage.setItem('spont-theme', next)
  }

  return (
    <button className="icon-btn theme-toggle" onClick={toggle} aria-label="Switch light or dark">
      <svg className="sun" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M10 2v2.2M10 15.8V18M18 10h-2.2M4.2 10H2M15.5 4.5l-1.5 1.5M6 12.5l-1.5 1.5M15.5 15.5l-1.5-1.5M6 7.5l-1.5-1.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <svg className="moon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M17 11.5A7 7 0 018.5 3a7 7 0 109 8.5Z" fill="currentColor" />
      </svg>
    </button>
  )
}

/**
 * Applies a stored choice before first paint. Without this the page renders
 * in the OS theme and then snaps to the chosen one, which is worse than
 * having no setting at all.
 */
export function ThemeScript() {
  const js = `try{var t=localStorage.getItem('spont-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`
  return <script dangerouslySetInnerHTML={{ __html: js }} />
}
