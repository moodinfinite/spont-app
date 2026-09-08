import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'

export default async function NotificationsPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/welcome')

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main>
      <h1>Notifications</h1>
      {notifications.length === 0 ? (
        <p>Nothing yet — this fills up once scheduling suggestions start going out.</p>
      ) : (
        <ul>
          {notifications.map((n) => (
            <li key={n.id}>{n.type}</li>
          ))}
        </ul>
      )}
    </main>
  )
}
