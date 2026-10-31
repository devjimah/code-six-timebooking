// Everything recorded about one audit event, opened by tapping a row in the audit log.
import { useTranslation } from "react-i18next"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import { Separator } from "@workspace/ui/components/separator"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { formatDateTime } from "@/i18n/format.ts"
import type { AuditEvent, User } from "@/lib/api-types.ts"
import { OUTCOME_BADGE } from "@/pages/admin/audit-outcome.ts"
import { actionLabel, detailEntry, errorText, targetLabel } from "@/pages/admin/audit-labels.ts"

type Props = {
  event: AuditEvent | null
  users: User[] | undefined
  onOpenChange: (open: boolean) => void
}

export function AuditEventDrawer({ event, users, onOpenChange }: Props) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  const actor = (id: number | null) =>
    id === null ? t("audit.anonymous") : (users?.find((u) => u.id === id)?.name ?? `#${id}`)

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={event !== null} onOpenChange={onOpenChange}>
      <DrawerContent>
        {event && (
          <>
            <DrawerHeader>
              <div className="flex items-center justify-center gap-2 md:justify-start">
                <DrawerTitle>{actionLabel(t, event)}</DrawerTitle>
                <Badge variant={OUTCOME_BADGE[event.outcome]}>{t(`audit.outcome.${event.outcome}`)}</Badge>
              </div>
              <DrawerDescription>{formatDateTime(event.occurredAt)}</DrawerDescription>
            </DrawerHeader>
            <Separator />
            {/* Scrolls on small phones; the Close button stays visible below. */}
            <div className="overflow-y-auto p-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">{t("audit.who")}</dt>
                <dd>
                  {actor(event.actorUserId)}
                  {event.actorRole && <span className="text-muted-foreground"> · {t(`roles.${event.actorRole}`)}</span>}
                </dd>
                {targetLabel(t, event, users) && (
                  <>
                    <dt className="text-muted-foreground">{t("audit.targetLabel")}</dt>
                    <dd>{targetLabel(t, event, users)}</dd>
                  </>
                )}
                {event.errorCode && (
                  <>
                    <dt className="text-muted-foreground">{t("audit.reason")}</dt>
                    <dd>
                      {errorText(event.errorCode)}
                      <span className="text-muted-foreground block font-mono text-xs">{event.errorCode}</span>
                    </dd>
                  </>
                )}
                {Object.entries(event.details ?? {}).map(([key, value]) => {
                  const [label, text] = detailEntry(t, key, value)
                  return (
                    <div key={key} className="contents">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="break-all">{text}</dd>
                    </div>
                  )
                })}
              </dl>

              <Separator className="my-4" />

              <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-xs">
                <dt>{t("audit.request")}</dt>
                <dd className="font-mono break-all">
                  {event.method} {event.path}
                </dd>
                <dt>{t("audit.status")}</dt>
                <dd className="tabular-nums">
                  {event.statusCode} · {Math.round(event.durationMs)} ms
                </dd>
                <dt>{t("audit.ipAddress")}</dt>
                <dd className="font-mono">{event.ipAddress ?? "–"}</dd>
                <dt>{t("audit.userAgent")}</dt>
                <dd className="break-all">{event.userAgent ?? "–"}</dd>
                <dt>{t("audit.eventId")}</dt>
                <dd className="tabular-nums">#{event.id}</dd>
              </dl>
            </div>
          </>
        )}
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">{t("profile.close")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
