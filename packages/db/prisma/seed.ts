import { prisma, resetDb } from '../src/index'
import { seedDatabase } from '../src/seed-data'

async function main() {
  await resetDb()
  await seedDatabase(prisma)
  const count = await prisma.user.count()
  console.log(`Seeded ${count} users with mock calendars.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
