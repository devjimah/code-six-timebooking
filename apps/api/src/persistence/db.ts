import "dotenv/config"
import { mkdirSync } from "node:fs"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema.js"

// One shared database connection for the whole API.
export const databaseUrl = process.env.DATABASE_URL ?? "file:./data/app.db"

// SQLite will not create missing folders, so make sure ./data exists.
if (databaseUrl.startsWith("file:./data/")) mkdirSync("./data", { recursive: true })

export const client = createClient({ url: databaseUrl })
export const db = drizzle(client, { schema })
export type Db = typeof db

