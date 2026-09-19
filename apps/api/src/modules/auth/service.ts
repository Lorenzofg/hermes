import bcrypt from 'bcryptjs'
import { db } from '../../db/index.js'
import { users } from './schema.js'
import { eq } from 'drizzle-orm'

const SALT_ROUNDS = 12

export async function createUser(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  const [user] = await db
    .insert(users)
    .values({ email: email.trim().toLowerCase(), passwordHash })
    .returning({ id: users.id, email: users.email, createdAt: users.createdAt })

  return user
}

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()))
  return user ?? null
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}
