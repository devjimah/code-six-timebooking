// ADR 0012: reads are kept for a short time, changes and sign-ins for longer.
import { describe, expect, it } from "vitest"
import { auditRetentionCutoffs } from "../../src/domain/audit-retention.js"

describe("audit retention cutoffs", () => {
  const now = new Date("2026-10-31T12:00:00.000Z")

  it("counts the days back from now, in UTC", () => {
    expect(auditRetentionCutoffs(now, { readDays: 90, changeDays: 365 })).toEqual({
      readBefore: "2026-08-02T12:00:00.000Z",
      changeBefore: "2025-10-31T12:00:00.000Z",
    })
  })

  it("produces the same ISO format as occurredAt, so text comparison orders correctly", () => {
    const { readBefore } = auditRetentionCutoffs(now, { readDays: 1, changeDays: 1 })

    expect("2026-10-30T11:59:59.999Z" < readBefore).toBe(true) // older → expired
    expect("2026-10-30T12:00:00.000Z" < readBefore).toBe(false) // exactly at the cutoff → kept
  })
})
