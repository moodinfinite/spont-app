'use client'

import { useEffect, type ReactNode } from 'react'

/**
 * A bottom sheet: scrim, slide-up panel, escape and tap-outside to close.
 *
 * It stays mounted when closed so the slide out can animate — visibility
 * (transitioned with a delay in the CSS) keeps a closed sheet out of the tab
 * order without cutting the animation short.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div className={`sheet-scrim${open ? ' on' : ''}`} onClick={onClose} aria-hidden="true" />
      <div
        className={`sheet${open ? ' on' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-hidden={!open}
      >
        <div className="grabber" />
        {children}
      </div>
    </>
  )
}
