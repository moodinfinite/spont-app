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
 * Applies a stored choice before first paint. Without this the page renders
 * in the OS theme and then snaps to the chosen one, which is worse than
 * having no setting at all.
 */
export function ThemeScript() {
  const js = `try{var t=localStorage.getItem('spont-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`
  return <script dangerouslySetInnerHTML={{ __html: js }} />
}
