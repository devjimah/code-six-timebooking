// Applies all SQL migrations from ./drizzle that have not run yet, then seeds demo data.
// Run with: npm run db:migrate
import { client, db } from "./db.js"
import { setupDatabase } from "./setup.js"

await setupDatabase(db)
client.close()
