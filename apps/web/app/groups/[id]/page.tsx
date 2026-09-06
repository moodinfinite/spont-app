import { redirect, notFound } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { getGroupDetail } from '@spont/core'
import { GroupInviteResponse } from './group-invite-response'
import { GroupDetailClient } from './group-detail-client'

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: params.id, userId } },
    include: { group: true },
  })
  if (!membership || membership.status === 'DECLINED') notFound()

  if (membership.status === 'INVITED') {
    return (
      <main>
        <h1>{membership.group.name}</h1>
        <p>You&apos;ve been invited to join this group.</p>
        <GroupInviteResponse membershipId={membership.id} />
      </main>
    )
  }

  const group = await getGroupDetail(prisma, params.id, userId)
  const memberIds = new Set(group.members.map((m) => m.userId))
  const directory = await prisma.user.findMany({ where: { id: { notIn: [...memberIds] } } })

  return (
    <GroupDetailClient
      groupId={group.id}
      groupName={group.name}
      members={group.members.map((m) => ({
        membershipId: m.id,
        status: m.status,
        role: m.role,
        user: { id: m.user.id, name: m.user.name },
      }))}
      directory={directory.map((u) => ({ id: u.id, name: u.name }))}
    />
  )
}
