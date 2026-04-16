import { pgEnum } from 'drizzle-orm/pg-core'

export const providerEnum = pgEnum('provider', ['claude', 'gpt'])
