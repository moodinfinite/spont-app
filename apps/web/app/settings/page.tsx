import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { ensureMappings, getVisibilitySettings } from '@spont/core'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({ where: { id: userId as string } })
  if (!user) redirect('/login')

  const categories = await prisma.category.findMany({ orderBy: { displayOrder: 'asc' } })
  const mappings = await ensureMappings(prisma, userId as string)
  const visibility = await getVisibilitySettings(prisma, userId as string)

  return (
    <SettingsClient
      user={{ name: user.name ?? '', email: user.email ?? '' }}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      initialMappings={mappings.map((m: any) => ({
        rawLabel: m.rawLabel,
        categoryId: m.categoryId,
        categoryName: m.category?.name ?? '',
        source: m.source,
      }))}
      initialVisibility={visibility.map((v: any) => ({
        categoryId: v.categoryId,
        displayMode: v.displayMode,
      }))}
    />
  )
}
