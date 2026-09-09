import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { countUpcomingGroupProposals, getGroupDetail } from '@spont/core'
import { GroupInviteResponse } from './group-invite-response'
import { GroupDetailClient } from './group-detail-client'

const initial = (name: string) => name.trim().charAt(0).toUpperCase()

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  if (!userId) redirect('/welcome')

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: params.id, userId } },
    include: { group: true },
  })
  if (!membership || membership.status === 'DECLINED') notFound()

  if (membership.status === 'INVITED') {
    /**
     * Who's already in it is the whole decision — you join a group because of
     * the people, not the name. Only accepted members are shown: listing the
     * others' pending invites would let someone's silence look like a yes.
     */
    const members = await prisma.groupMembership.findMany({
      where: { groupId: params.id, status: 'ACCEPTED' },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    })

    const group = membership.group

    return (
      <main className="page">
        <header className="page-head head-back">
          <Link href="/friends" className="icon-btn back" aria-label="Back to your people">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M12 4l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          {/* The group leads, not the person who added you — partly because
              it's the subject of the decision, and partly because we don't
              actually record who sent the invite. Any accepted member can,
              so naming the owner would have been a guess. */}
          <h1>
            You&rsquo;re invited to
            <br />
            {group.name}.
          </h1>
        </header>

        <div className="section-label">
          <span>Who&rsquo;s in it</span>
          <span>{members.length}</span>
        </div>
        <div className="panel">
          {members.map((m) => (
            <div className="row" key={m.id}>
              <span className="person-avatar">{initial(m.user.name)}</span>
              <span className="row-text">
                <span className="row-name">{m.user.name}</span>
                {m.role === 'OWNER' && <span className="row-sub">Started the group</span>}
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <GroupInviteResponse
            membershipId={membership.id}
            groupId={group.id}
            groupName={group.name}
            minAttendees={group.minAttendees}
            memberCount={members.length}
          />
        </div>

        <p className="note">
          A group is for people you see together. Nothing gets proposed until you say yes.
        </p>
      </main>
    )
  }

  const group = await getGroupDetail(prisma, params.id, userId)
  const memberIds = new Set(group.members.map((m) => m.userId))
  const directory = await prisma.user.findMany({ where: { id: { notIn: [...memberIds] } } })
  const upcomingCount = await countUpcomingGroupProposals(prisma, group.id)

  return (
    <GroupDetailClient
      groupId={group.id}
      groupName={group.name}
      minAttendees={group.minAttendees}
      members={group.members.map((m) => ({
        membershipId: m.id,
        status: m.status,
        role: m.role,
        user: { id: m.user.id, name: m.user.name },
      }))}
      directory={directory.map((u) => ({ id: u.id, name: u.name }))}
      isOwner={group.ownerId === userId}
      upcomingCount={upcomingCount}
    />
  )
}
