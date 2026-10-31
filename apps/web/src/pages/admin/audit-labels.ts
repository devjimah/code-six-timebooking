// Turns the technical fields of an audit event into words the admin understands.
// Action names come from ACTIONS in apps/api/src/audit/audit-log.ts – add a label here when you add one there.
import type { TFunction } from "i18next"

import { formatDate, formatHours, translateApiError } from "@/i18n/format.ts"
import type { AuditEvent, Role, User } from "@/lib/api-types.ts"

export const ACTION_LABELS = {
  "auth.login": "auditActions.auth.login",
  "auth.logout": "auditActions.auth.logout",
  "auth.session": "auditActions.auth.session",
  "user.list": "auditActions.user.list",
  "user.create": "auditActions.user.create",
  "supplier.list": "auditActions.supplier.list",
  "supplier.create": "auditActions.supplier.create",
  "supplier.update": "auditActions.supplier.update",
  "time_entry.create": "auditActions.time_entry.create",
  "time_entry.list_own": "auditActions.time_entry.list_own",
  "order.list_bookable": "auditActions.order.list_bookable",
  "order.list_managed": "auditActions.order.list_managed",
  "order.view_budget": "auditActions.order.view_budget",
  "audit.view": "auditActions.audit.view",
  "request.unknown_route": "auditActions.request.unknown_route",
} as const

export type KnownAction = keyof typeof ACTION_LABELS

/** "Book time", or the raw route for actions we have no label for (e.g. old events). */
export function actionLabel(t: TFunction, event: AuditEvent): string {
  const key = event.action ? ACTION_LABELS[event.action as KnownAction] : undefined
  return key ? t(key) : `${event.method} ${event.route}`
}

/** "Order #1", or the user's name when the target is a user we know. */
export function targetLabel(t: TFunction, event: AuditEvent, users: User[] | undefined): string | null {
  if (event.targetType === null || event.targetId === null) return null
  if (event.targetType === "user") {
    const name = users?.find((u) => u.id === event.targetId)?.name
    return name ?? t("audit.target.user", { id: event.targetId })
  }
  if (event.targetType === "order") return t("audit.target.order", { id: event.targetId })
  if (event.targetType === "supplier") return t("audit.target.supplier", { id: event.targetId })
  return `${event.targetType} #${event.targetId}`
}

/** The translated reason for a refusal, e.g. "Booking rejected: more than 10 hours …". */
export const errorText = (errorCode: string) => translateApiError({ code: errorCode, message: errorCode })

const DETAIL_LABELS = {
  name: "audit.details.name",
  email: "audit.details.email",
  role: "audit.details.role",
  supplierId: "audit.details.supplierId",
  workDate: "audit.details.workDate",
  durationMinutes: "audit.details.durationMinutes",
  timeEntryId: "audit.details.timeEntryId",
} as const

/** One detail as [label, value] in the admin's language, e.g. ["Duration", "3,5 h"]. */
export function detailEntry(t: TFunction, key: string, value: string | number | boolean | null): [string, string] {
  const labelKey = DETAIL_LABELS[key as keyof typeof DETAIL_LABELS]
  const label = labelKey ? t(labelKey) : key
  if (value === null) return [label, "–"]
  if (key === "durationMinutes" && typeof value === "number") return [label, formatHours(value)]
  if (key === "workDate" && typeof value === "string") return [label, formatDate(value)]
  if (key === "role" && typeof value === "string") return [label, t(`roles.${value as Role}`)]
  return [label, String(value)]
}
