import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { GroupsClient } from './groups-client'

export default async function GroupsPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const memberships = await prisma.groupMembership.findMany({
    where: { userId, status: 'ACCEPTED' },
    include: { group: true },
  })

  return <GroupsClient groups={memberships.map((m) => m.group)} />
}
