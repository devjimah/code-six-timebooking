// Admin: who did what, on what, when, and why it failed (GET /api/audit-events, ADR 0012). Newest first.
// Tap a row for everything recorded about the event.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { ChevronRight, CircleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { formatDateTime, translateApiError } from "@/i18n/format.ts"
import { AUDIT_OUTCOMES, type AuditEvent, type User } from "@/lib/api-types.ts"
import { useApi } from "@/lib/use-api.ts"
import { AuditEventDrawer } from "@/pages/admin/audit-event-drawer.tsx"
import { ACTION_LABELS, actionLabel, targetLabel, type KnownAction } from "@/pages/admin/audit-labels.ts"
import { OUTCOME_BADGE } from "@/pages/admin/audit-outcome.ts"

const ALL = "all"

export function AuditPage() {
  const { t } = useTranslation()
  const [userId, setUserId] = React.useState(ALL)
  const [outcome, setOutcome] = React.useState(ALL)
  const [action, setAction] = React.useState(ALL)
  const [selected, setSelected] = React.useState<AuditEvent | null>(null)

  const query = new URLSearchParams({ limit: "100" })
  if (userId !== ALL) query.set("userId", userId)
  if (outcome !== ALL) query.set("outcome", outcome)
  if (action !== ALL) query.set("action", action)
  const events = useApi<AuditEvent[]>(`/audit-events?${query}`)
  const users = useApi<User[]>("/users")

  const userName = (id: number | null) =>
    id === null ? t("audit.anonymous") : (users.data?.find((u) => u.id === id)?.name ?? `#${id}`)

  return (
    <>
      <p className="text-muted-foreground text-sm">{t("audit.description")}</p>

      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="w-full" aria-label={t("audit.filterByUser")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("audit.allUsers")}</SelectItem>
            {users.data?.map((user) => (
              <SelectItem key={user.id} value={String(user.id)}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger className="w-full" aria-label={t("audit.filterByResult")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("audit.allResults")}</SelectItem>
            {AUDIT_OUTCOMES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`audit.outcome.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-full" aria-label={t("audit.filterByAction")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("audit.allActions")}</SelectItem>
            {(Object.keys(ACTION_LABELS) as KnownAction[]).map((value) => (
              <SelectItem key={value} value={value}>
                {t(ACTION_LABELS[value])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {events.error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("audit.loadFailed")}</AlertTitle>
          <AlertDescription>{translateApiError(events.error)}</AlertDescription>
        </Alert>
      )}

      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("audit.when")}</TableHead>
                {/* On phones, who and what are shown under the time, so the result stays visible without scrolling. */}
                <TableHead className="hidden md:table-cell">{t("audit.who")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("audit.action")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("audit.targetLabel")}</TableHead>
                <TableHead>{t("audit.result")}</TableHead>
                <TableHead className="w-0 pr-4">
                  <span className="sr-only">{t("audit.showDetails")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.loading &&
                Array.from({ length: 6 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4" colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {events.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    {t("audit.empty")}
                  </TableCell>
                </TableRow>
              )}
              {events.data?.map((event) => (
                <TableRow key={event.id} className="cursor-pointer" onClick={() => setSelected(event)}>
                  <TableCell className="pl-4 whitespace-normal md:whitespace-nowrap">
                    <span className="tabular-nums">{formatDateTime(event.occurredAt)}</span>
                    <span className="mt-1 grid gap-0.5 md:hidden">
                      <span>{userName(event.actorUserId)}</span>
                      <span className="text-muted-foreground text-xs">
                        {actionLabel(t, event)}
                        {targetLabel(t, event, users.data) && ` · ${targetLabel(t, event, users.data)}`}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap md:table-cell">{userName(event.actorUserId)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="block">{actionLabel(t, event)}</span>
                    {event.errorCode && (
                      <span className="text-muted-foreground font-mono text-xs">{event.errorCode}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden whitespace-nowrap lg:table-cell">
                    {targetLabel(t, event, users.data) ?? "–"}
                  </TableCell>
                  <TableCell className="align-top md:align-middle">
                    <Badge variant={OUTCOME_BADGE[event.outcome]}>{t(`audit.outcome.${event.outcome}`)}</Badge>
                  </TableCell>
                  <TableCell className="pr-4 align-top md:align-middle">
                    {/* The real control for keyboard and screen reader users; the row click is a shortcut. */}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("audit.showDetails")}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelected(event)
                      }}
                    >
                      <ChevronRight aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AuditEventDrawer event={selected} users={users.data} onOpenChange={(open) => !open && setSelected(null)} />
    </>
  )
}
