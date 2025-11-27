import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import prisma from './prisma'

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      dailyGoal: true,
      weeklyGoal: true,
      step2Date: true,
      comlexDate: true,
      createdAt: true,
    },
  })

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}
