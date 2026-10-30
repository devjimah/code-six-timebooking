// Migrates the database and seeds demo data. Used by `npm run db:setup` and on server start.
import { migrate } from "drizzle-orm/libsql/migrator"
import type { Db } from "./db.js"
import { seed } from "./seed.js"

export async function setupDatabase(db: Db) {
  await migrate(db, { migrationsFolder: "./drizzle" })
  const seeded = await seed(db)
  console.log(seeded ? "Database migrated and seeded" : "Database migrated (seed data already present)")
}

