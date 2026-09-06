import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'

export default async function SettingsPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) redirect('/login')

  return (
    <main>
      <h1>Settings</h1>
      <dl>
        <dt>Name</dt>
        <dd>{user.name}</dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
      </dl>
      <p>Scheduling preferences and notification settings arrive in later phases.</p>
    </main>
  )
}
