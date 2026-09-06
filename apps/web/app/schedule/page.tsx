import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { ScheduleClient } from './schedule-client'

export default async function SchedulePage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  return <ScheduleClient />
}
