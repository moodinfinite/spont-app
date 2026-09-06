import { redirect, notFound } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { listFriends } from '@spont/core'
import { FriendScheduleClient } from './friend-schedule-client'

export default async function FriendSchedulePage({ params }: { params: { friendId: string } }) {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const friends = await listFriends(prisma, userId)
  const friend = friends.find((f) => f.id === params.friendId)
  if (!friend) notFound()

  return <FriendScheduleClient friendId={friend.id} friendName={friend.name} />
}
