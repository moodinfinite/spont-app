import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { listFriends, listIncomingRequests, listOutgoingRequests } from '@spont/core'
import { FriendsClient } from './friends-client'

export default async function FriendsPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/welcome')

  const me = await prisma.user.findUnique({ where: { id: userId } })
  if (!me) redirect('/welcome')

  const [accepted, incoming, outgoing, allUsers] = await Promise.all([
    listFriends(prisma, userId),
    listIncomingRequests(prisma, userId),
    listOutgoingRequests(prisma, userId),
    prisma.user.findMany({ where: { id: { not: userId } } }),
  ])

  const excludedIds = new Set([
    ...accepted.map((u) => u.id),
    ...incoming.map((f) => f.userAId),
    ...outgoing.map((f) => f.userBId),
  ])
  const directory = allUsers.filter((u) => !excludedIds.has(u.id))

  return (
    <FriendsClient
      accepted={accepted}
      incoming={incoming.map((f) => ({ id: f.id, from: f.userA }))}
      outgoing={outgoing.map((f) => ({ id: f.id, to: f.userB }))}
      directory={directory}
      you={me.name.trim().charAt(0).toUpperCase()}
    />
  )
}
