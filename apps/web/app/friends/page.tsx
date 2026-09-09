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

  const [accepted, incoming, outgoing] = await Promise.all([
    listFriends(prisma, userId),
    listIncomingRequests(prisma, userId),
    listOutgoingRequests(prisma, userId),
  ])

  /**
   * "3 people" has to mean three people who said yes. Counting every
   * membership row counted the invitations too, so a group of two with one
   * unanswered invite advertised itself as three — the same silence-as-a-yes
   * the group screens go out of their way to avoid showing.
   */
  const memberships = await prisma.groupMembership.findMany({
    where: { userId, status: 'ACCEPTED' },
    include: { group: { include: { members: { where: { status: 'ACCEPTED' }, select: { id: true } } } } },
  })

  /**
   * Groups you've been asked to join. Without this the invite page is only
   * reachable by direct link — the Groups tab counts accepted memberships,
   * so a pending invite was invisible from inside the app.
   */
  const groupInvites = await prisma.groupMembership.findMany({
    where: { userId, status: 'INVITED' },
    include: { group: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <FriendsClient
      accepted={accepted}
      incoming={incoming.map((f) => ({ id: f.id, from: f.userA }))}
      outgoing={outgoing.map((f) => ({ id: f.id, to: f.userB }))}
      groups={memberships.map((m) => ({
        id: m.group.id,
        name: m.group.name,
        memberCount: m.group.members.length,
      }))}
      groupInvites={groupInvites.map((m) => ({ id: m.group.id, name: m.group.name }))}
      you={me.name.trim().charAt(0).toUpperCase()}
      inviteCode={userId.slice(-6)}
    />
  )
}
