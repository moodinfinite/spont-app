'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Category = { id: string; name: string }
type MappingRow = { rawLabel: string; categoryId: string; categoryName: string; source: string }
type VisibilityRow = { categoryId: string; displayMode: string }

export function SettingsClient({
  user,
  categories,
  initialMappings,
  initialVisibility,
}: {
  user: { name: string; email: string }
  categories: Category[]
  initialMappings: MappingRow[]
  initialVisibility: VisibilityRow[]
}) {
  const router = useRouter()
  const [mappings, setMappings] = useState(initialMappings)
  const [visibility, setVisibility] = useState(initialVisibility)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleOverride(rawLabel: string, categoryId: string) {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/label-mappings/${encodeURIComponent(rawLabel)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Something went wrong')
      setPending(false)
      return
    }
    setPending(false)
    router.refresh()
  }

  async function handleReset(rawLabel: string) {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/label-mappings/${encodeURIComponent(rawLabel)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Something went wrong')
      setPending(false)
      return
    }
    setPending(false)
    router.refresh()
  }

  async function handleVisibilityChange(categoryId: string, displayMode: string) {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/category-visibility/${categoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayMode }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Something went wrong')
      setPending(false)
      return
    }
    setPending(false)
    router.refresh()
  }

  const visibilityMap = new Map(visibility.map((v) => [v.categoryId, v.displayMode]))

  return (
    <main>
      <h1>Settings</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <section>
        <h2>Profile</h2>
        <dl>
          <dt>Name</dt>
          <dd>{user.name}</dd>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </dl>
      </section>

      <section>
        <h2>My Labels</h2>
        <table>
          <thead>
            <tr>
              <th>Raw Label</th>
              <th>Category</th>
              <th>Source</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m) => (
              <tr key={m.rawLabel}>
                <td>{m.rawLabel}</td>
                <td>
                  <select
                    value={m.categoryId}
                    disabled={pending}
                    onChange={(e) => handleOverride(m.rawLabel, e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{m.source === 'MANUAL' ? 'custom' : 'auto'}</td>
                <td>
                  {m.source === 'MANUAL' && (
                    <button disabled={pending} onClick={() => handleReset(m.rawLabel)}>
                      Reset to suggested
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Privacy</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Visibility</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>
                  <select
                    value={visibilityMap.get(c.id) ?? 'CATEGORY_NAME'}
                    disabled={pending}
                    onChange={(e) => handleVisibilityChange(c.id, e.target.value)}
                  >
                    <option value="CATEGORY_NAME">Show category name</option>
                    <option value="BUSY_ONLY">Show as Busy</option>
                    <option value="HIDDEN">Hide completely</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}
