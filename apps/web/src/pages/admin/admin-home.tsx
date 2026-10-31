// Admin home: the state of the accounts and what happened in the last 24 hours that may need a look
// (failed sign-ins, refused requests, errors). No business data – admins see no bookings, budgets or prices.
// Data: GET /api/users and GET /api/audit-events.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { ArrowRight, CircleAlert, ScrollText, Users } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useAuth } from "@/auth/auth-context.tsx"
import { formatDateTime, translateApiError } from "@/i18n/format.ts"
import { ROLES, type AuditEvent, type User } from "@/lib/api-types.ts"
import { useApi } from "@/lib/use-api.ts"
import { actionLabel } from "@/pages/admin/audit-labels.ts"
import { OUTCOME_BADGE } from "@/pages/admin/audit-outcome.ts"

const DAY_MS = 24 * 60 * 60 * 1000
// Asking "who is signed in?" without a session is normal for every visitor of the sign-in page – not worth a look.
const ROUTINE_ACTIONS = new Set(["auth.session"])

export function AdminHome() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const users = useApi<User[]>("/users")
  const events = useApi<AuditEvent[]>("/audit-events?limit=500")

  const accounts = users.data ?? []
  const active = accounts.filter((u) => u.deactivatedAt === null)
  const stats = [
    ["home.admin.active", active.length],
    ["home.admin.waiting", active.filter((u) => u.mustChangePassword).length],
    ["home.admin.deactivated", accounts.length - active.length],
  ] as const

  // The 24-hour window is fixed when the screen opens, so it does not move on every re-render.
  const [since] = React.useState(() => Date.now() - DAY_MS)
  const lastDay = (events.data ?? []).filter(
    (e) => Date.parse(e.occurredAt) >= since && !(e.action && ROUTINE_ACTIONS.has(e.action)),
  )
  const security = [
    ["home.admin.signIns", lastDay.filter((e) => e.action === "auth.login" && e.outcome === "success").length],
    ["home.admin.failedSignIns", lastDay.filter((e) => e.action === "auth.login" && e.outcome === "denied").length],
    ["home.admin.refused", lastDay.filter((e) => e.action !== "auth.login" && e.outcome === "denied").length],
    ["home.admin.errors", lastDay.filter((e) => e.outcome === "error").length],
  ] as const
  const notable = lastDay.filter((e) => e.outcome === "denied" || e.outcome === "error").slice(0, 5)

  const error = users.error ?? events.error

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("home.welcome", { name: user?.name })}</h2>
          <p className="text-muted-foreground text-sm">{t("home.admin.intro")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/admin/users">
              <Users aria-hidden />
              {t("nav.users")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/audit">
              <ScrollText aria-hidden />
              {t("nav.audit")}
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("home.loadFailed")}</AlertTitle>
          <AlertDescription>{translateApiError(error)}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map(([label, count]) => (
          <Card key={label} className="gap-1 py-3 sm:py-4">
            <CardHeader className="px-3 sm:px-4">
              <CardDescription className="text-xs sm:text-sm">{t(label)}</CardDescription>
              <CardTitle className="text-sm tabular-nums sm:text-xl">
                {users.loading ? <Skeleton className="h-7 w-10" /> : count}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("home.admin.lastDay")}</CardTitle>
            <CardDescription>{t("home.admin.lastDayDescription")}</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/audit">
                  {t("home.all")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4">
            {events.loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                  {security.map(([label, count]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground text-xs">{t(label)}</dt>
                      <dd className="text-lg font-semibold tabular-nums">{count}</dd>
                    </div>
                  ))}
                </dl>
                <Separator />
                {notable.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("home.admin.nothingNotable")}</p>
                ) : (
                  <ul className="grid gap-3">
                    {notable.map((event) => (
                      <li key={event.id} className="flex items-start justify-between gap-3 text-sm">
                        <span className="min-w-0">
                          <span className="block">{actionLabel(t, event)}</span>
                          <span className="text-muted-foreground block text-xs">
                            {formatDateTime(event.occurredAt)}
                            {event.actorRole && ` · ${t(`roles.${event.actorRole}`)}`}
                          </span>
                        </span>
                        <Badge variant={OUTCOME_BADGE[event.outcome]}>{t(`audit.outcome.${event.outcome}`)}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("home.admin.byRole")}</CardTitle>
            <CardDescription>{t("home.admin.byRoleDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {users.loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ul className="grid gap-2 text-sm">
                {ROLES.map((role) => (
                  <li key={role} className="flex items-center justify-between gap-3">
                    <span>{t(`roles.${role}`)}</span>
                    <Badge variant="secondary" className="tabular-nums">
                      {active.filter((u) => u.role === role).length}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
