import type { AuditOutcome } from "@/lib/api-types.ts"

/** Badge colour per outcome, shared by the audit table and the event drawer. */
export const OUTCOME_BADGE: Record<AuditOutcome, "secondary" | "outline" | "destructive"> = {
  success: "secondary",
  rejected: "outline", // a business rule said no – expected, not alarming
  denied: "destructive", // someone tried something they may not do
  error: "destructive",
}
