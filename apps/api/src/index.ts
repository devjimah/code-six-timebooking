import { createApp } from "./app.js"
import { scheduleAuditRetention } from "./audit/retention.js"
import { config } from "./config.js"
import { db } from "./persistence/db.js"
import { setupDatabase } from "./persistence/setup.js"

// Entry point of the API: prepare the database, then start listening.
// Migrate + seed on start so data and demo users exist after a fresh clone.
await setupDatabase(db)
scheduleAuditRetention(db, config.auditRetention)
createApp({ db, sessionSecret: config.sessionSecret, secureCookies: config.secureCookies }).listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`)
})
