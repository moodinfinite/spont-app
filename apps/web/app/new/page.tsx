import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { listFriends } from '@spont/core'
import { NewHangoutClient } from './new-hangout-client'

/**
 * The create flow.
 *
 * Only accepted friends are listed — the same rule the rest of the app runs
 * on, and the one the API enforces again on the way in. Picking the time is
 * the client's job because it needs the calendars read on demand, for
 * whichever people end up chosen.
 */
export default async function NewHangoutPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/welcome')

  const friends = await listFriends(prisma, userId)

  return (
    <NewHangoutClient friends={friends.map((f) => ({ id: f.id, name: f.name }))} />
  )
}
