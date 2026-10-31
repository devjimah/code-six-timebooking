import { createApp } from "./app.js"
import { config } from "./config.js"
import { db } from "./persistence/db.js"
import { setupDatabase } from "./persistence/setup.js"

// Entry point of the API: prepare the database, then start listening.
// Migrate + seed on start so data and demo users exist after a fresh clone.
await setupDatabase(db)
createApp({
  db,
  sessionSecret: config.sessionSecret,
  secureCookies: config.secureCookies,
  trustProxyHops: config.trustProxyHops,
}).listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`)
})
