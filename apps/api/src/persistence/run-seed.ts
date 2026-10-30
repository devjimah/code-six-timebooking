// Seeds demo data only (migrations must have run). Run with: npm run db:seed
import { client, db } from "./db.js"
import { seed } from "./seed.js"

const seeded = await seed(db)
console.log(seeded ? "Demo data seeded" : "Seed data already present – nothing to do")
client.close()

