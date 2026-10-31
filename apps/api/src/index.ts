import "dotenv/config"
import express from "express"
import { errorHandler } from "./api/error-handler.js"
import { db } from "./persistence/db.js"
import { setupDatabase } from "./persistence/setup.js"

// Entry point of the API. Routes are added per feature; for now only a health check
// so we can prove the server starts (walking skeleton).
const app = express()
app.use(express.json())

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" })
})

// Must stay last: turns DomainError into 422 and hides internal errors.
app.use(errorHandler)

const port = Number(process.env.PORT ?? 3001)
// Migrate + seed on start so data and demo users exist after a fresh clone.
await setupDatabase(db)
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})

