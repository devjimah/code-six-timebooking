// Deletes expired audit events: once when the API starts, then once a day (ADR 0012).
// This job is the only code that deletes audit events; there is no API route for it.
import { type AuditRetentionPolicy, auditRetentionCutoffs } from "../domain/audit-retention.js"
import type { Db } from "../persistence/db.js"
import { auditEventRepository } from "../persistence/repositories.js"

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/** Returns how many events were deleted. */
export async function purgeExpiredAuditEvents(db: Db, policy: AuditRetentionPolicy, now = new Date()): Promise<number> {
  return auditEventRepository(db).deleteExpired(auditRetentionCutoffs(now, policy))
}

export function scheduleAuditRetention(db: Db, policy: AuditRetentionPolicy): void {
  const run = () =>
    purgeExpiredAuditEvents(db, policy)
      .then((deleted) => {
        if (deleted > 0) console.log(`Audit retention: deleted ${deleted} expired events`)
      })
      .catch((error) => console.error("Audit retention failed", error))

  void run()
  // unref: the timer alone does not keep the process alive (tests, shutdown).
  setInterval(run, ONE_DAY_MS).unref()
}
