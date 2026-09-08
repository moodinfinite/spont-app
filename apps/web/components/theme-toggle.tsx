'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

/**
 * Sits beside the notifications bell. The app follows the OS by default —
 * this is the override for people whose phone is dark but who want the app
 * light, or the reverse.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    const stored = window.localStorage.getItem('spont-theme') as Theme | null
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
      document.documentElement.setAttribute('data-theme', stored)
    }
  }, [])

  function toggle() {
    const current =
      theme ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    const next: Theme = current === 'dark' ? 'light' : 'dark'
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
 * having no toggle at all.
 */
export function ThemeScript() {
  const js = `try{var t=localStorage.getItem('spont-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`
  return <script dangerouslySetInnerHTML={{ __html: js }} />
}
