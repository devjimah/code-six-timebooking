import "dotenv/config"
import { defineConfig } from "drizzle-kit"

// drizzle-kit reads the schema and writes versioned SQL migrations to ./drizzle.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/persistence/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "file:./data/app.db" },
})

