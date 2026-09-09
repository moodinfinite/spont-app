import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { PingButton } from '@/components/ping-button'

export default async function HomePage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({ where: { id: userId } })

  return (
    <main>
      <h1>Welcome{user ? `, ${user.name}` : ''}</h1>
      <p>This is the foundation phase — scheduling suggestions arrive in a later phase.</p>
      <PingButton />
    </main>
  )
}
