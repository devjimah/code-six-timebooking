// Admin: who did what, when (GET /api/audit-events, ADR 0012). Filter by user; newest first.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { formatDateTime, translateApiError } from "@/i18n/format.ts"
import type { AuditEvent, AuditOutcome, User } from "@/lib/api-types.ts"
import { useApi } from "@/lib/use-api.ts"

const OUTCOME_BADGE: Record<AuditOutcome, "secondary" | "outline" | "destructive"> = {
  success: "secondary",
  rejected: "outline", // a business rule said no – expected, not alarming
  denied: "destructive", // someone tried something they may not do
  error: "destructive",
}

const ALL = "all"

export function AuditPage() {
  const { t } = useTranslation()
  const [userId, setUserId] = React.useState(ALL)
  const events = useApi<AuditEvent[]>(userId === ALL ? "/audit-events?limit=100" : `/audit-events?limit=100&userId=${userId}`)
  const users = useApi<User[]>("/users")

  const userName = (id: number | null) =>
    id === null ? t("audit.anonymous") : (users.data?.find((u) => u.id === id)?.name ?? `#${id}`)

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">{t("audit.description")}</p>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="w-full sm:w-56" aria-label={t("audit.filterByUser")}>
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
                {/* On phones, who and action are shown under the time, so the result stays visible without scrolling. */}
                <TableHead className="hidden md:table-cell">{t("audit.who")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("audit.action")}</TableHead>
                <TableHead>{t("audit.result")}</TableHead>
                <TableHead className="hidden text-right lg:table-cell">{t("audit.status")}</TableHead>
                <TableHead className="hidden pr-4 text-right lg:table-cell">{t("audit.duration")}</TableHead>
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
                <TableRow key={event.id}>
                  <TableCell className="pl-4 whitespace-normal md:whitespace-nowrap">
                    <span className="tabular-nums">{formatDateTime(event.occurredAt)}</span>
                    <span className="mt-1 grid gap-0.5 md:hidden">
                      <span>{userName(event.actorUserId)}</span>
                      <span className="text-muted-foreground font-mono text-xs break-all">
                        {event.method} {event.route}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap md:table-cell">{userName(event.actorUserId)}</TableCell>
                  <TableCell className="hidden font-mono text-xs whitespace-nowrap md:table-cell">
                    {event.method} {event.route}
                  </TableCell>
                  <TableCell className="pr-4 align-top md:pr-2 md:align-middle">
                    <Badge variant={OUTCOME_BADGE[event.outcome]}>{t(`audit.outcome.${event.outcome}`)}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">{event.statusCode}</TableCell>
                  <TableCell className="text-muted-foreground hidden pr-4 text-right tabular-nums lg:table-cell">
                    {Math.round(event.durationMs)} ms
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
