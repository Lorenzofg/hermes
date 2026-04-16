import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

export async function runMigrations() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 })
  const db = drizzle(client)

  console.log('Executando migrations...')
  await migrate(db, { migrationsFolder: new URL('./migrations', import.meta.url).pathname })
  console.log('Migrations concluídas!')

  await client.end()
}
