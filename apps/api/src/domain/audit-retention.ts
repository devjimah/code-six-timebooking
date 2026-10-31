// How long audit events are kept (ADR 0012, GDPR Art. 5 (1) e: personal data only as long as needed).
// Reads ("who looked at what") are needed briefly, to investigate misuse.
// Changes and sign-ins ("who booked or tried to sign in") are kept longer, to settle disputed invoices.

export type AuditRetentionPolicy = {
  readDays: number
  changeDays: number
}

/** These only read; every other method changes something or signs someone in. */
export const READ_METHODS = ["GET", "HEAD"]

/** Events that happened before these instants are expired. ISO strings in UTC, like `occurredAt`. */
export function auditRetentionCutoffs(now: Date, policy: AuditRetentionPolicy): { readBefore: string; changeBefore: string } {
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
  return { readBefore: daysAgo(policy.readDays), changeBefore: daysAgo(policy.changeDays) }
}
