// Reads a list of accounts from a CSV file, for moving from the old tool. Only the format is checked here; each account
// then passes the same rules as one created by hand (application/import-users.ts).
import { DomainError } from "./errors.js"
import type { GermanState, Role } from "./models.js"
import { GERMAN_STATES } from "./public-holidays.js"

export const MAX_IMPORT_ROWS = 500
const ROLES: Role[] = ["consultant", "project_manager", "purchasing", "admin", "supplier_manager"]

export type ImportRow = {
  line: number // in the file, so the admin can find it
  email: string
  name: string
  role: Role
  supplierName: string | null
  workState: GermanState | null
}
export type ImportProblem = { line: number; email: string; code: string; message: string }

const clean = (value: string | undefined) => (value ?? "").trim().replace(/^"(.*)"$/, "$1").trim()

export function parseUserCsv(csv: string): { rows: ImportRow[]; problems: ImportProblem[] } {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/)
  const separator = lines[0]?.includes(";") ? ";" : ","
  const header = (lines[0] ?? "").split(separator).map((column) => clean(column).toLowerCase())
  const column = (name: string) => header.indexOf(name)
  if (column("email") < 0 || column("name") < 0 || column("role") < 0) {
    throw new DomainError("IMPORT_BAD_HEADER", "The first line must name the columns: email, name, role, and optionally supplier and state.")
  }

  const filled = lines.map((text, index) => ({ text, line: index + 1 })).slice(1).filter(({ text }) => text.trim() !== "")
  if (filled.length > MAX_IMPORT_ROWS) {
    throw new DomainError("IMPORT_TOO_LARGE", `A file can hold at most ${MAX_IMPORT_ROWS} accounts. This one has ${filled.length}.`)
  }

  const rows: ImportRow[] = []
  const problems: ImportProblem[] = []
  for (const { text, line } of filled) {
    const cells = text.split(separator)
    const cell = (name: string) => (column(name) < 0 ? "" : clean(cells[column(name)]))
    const email = cell("email").toLowerCase()
    const name = cell("name")
    const role = cell("role").toLowerCase().replaceAll(" ", "_") as Role
    const state = cell("state").toUpperCase()
    const problem = (code: string, message: string) => problems.push({ line, email, code, message })

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) problem("IMPORT_INVALID_EMAIL", "This is not an email address.")
    else if (name.length < 2 || name.length > 100) problem("IMPORT_INVALID_NAME", "A name needs 2 to 100 characters.")
    else if (!ROLES.includes(role)) problem("IMPORT_INVALID_ROLE", `There is no role "${cell("role")}".`)
    else if (state !== "" && !GERMAN_STATES.includes(state as GermanState)) problem("IMPORT_INVALID_STATE", `There is no state "${cell("state")}".`)
    else rows.push({ line, email, name, role, supplierName: cell("supplier") || null, workState: (state || null) as GermanState | null })
  }
  return { rows, problems }
}
