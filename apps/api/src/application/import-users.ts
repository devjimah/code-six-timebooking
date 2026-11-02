// Use case "an admin imports accounts from a file" (feature list: moving from the old tool). Each account goes through
// createUser, so it passes the same rules as one made by hand. A row that fails is reported, and the others are created.
import { DomainError } from "../domain/errors.js"
import type { User } from "../domain/models.js"
import { type ImportProblem, parseUserCsv } from "../domain/user-import.js"
import type { Db } from "../persistence/db.js"
import { supplierRepository } from "../persistence/repositories.js"
import { createUser } from "./create-user.js"

export async function importUsers(db: Db, csv: string, initialPassword: string): Promise<{ created: User[]; refused: ImportProblem[] }> {
  const { rows, problems } = parseUserCsv(csv)
  const suppliers = await supplierRepository(db).findAll()
  const created: User[] = []
  const refused = [...problems]

  for (const { line, supplierName, ...account } of rows) {
    const supplier = supplierName && suppliers.find((s) => s.name.toLowerCase() === supplierName.toLowerCase())
    if (supplierName && !supplier) {
      refused.push({ line, email: account.email, code: "SUPPLIER_NOT_FOUND", message: `There is no supplier "${supplierName}".` })
      continue
    }
    try {
      created.push(await createUser(db, { ...account, supplierId: supplier ? supplier.id : null, initialPassword }))
    } catch (error) {
      if (!(error instanceof DomainError)) throw error
      refused.push({ line, email: account.email, code: error.code, message: error.message })
    }
  }
  return { created, refused: refused.sort((a, b) => a.line - b.line) }
}
