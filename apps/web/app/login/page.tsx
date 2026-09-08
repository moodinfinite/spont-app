'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type User = { id: string; name: string; email: string }

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => setUsers(data.users))
  }, [])

  async function login(userId: string) {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    router.push('/')
    router.refresh()
  }

  return (
    <main>
      <h1>Who are you?</h1>
      <p>
        Dev-only picker — pick a seeded user to explore the app as them. Real sign-up is{' '}
        <a href="/welcome">connecting a calendar</a>.
      </p>
      <ul>
        {users.map((u) => (
          <li key={u.id}>
            <button onClick={() => login(u.id)}>{u.name}</button>
          </li>
        ))}
      </ul>
    </main>
  )
}
