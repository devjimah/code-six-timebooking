// Demo: change the pace and see whether the budget lasts until the order ends, and when to order more.
// Simplified to whole weeks. The real forecast is calculated by the API (domain/forecast.ts, ADR 0015).
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleCheck, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Progress } from "@workspace/ui/components/progress"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"
import { formatHours } from "@/i18n/format.ts"

const REMAINING_HOURS = 60
const WEEKS_UNTIL_ORDER_ENDS = 8
const LEAD_TIME_WEEKS = 4 // the default of PURCHASING_LEAD_TIME_WEEKS in the API
const PACES = [5, 10, 20]

export function BudgetLookahead() {
  const { t } = useTranslation()
  const [pace, setPace] = React.useState(10)

  const weeksLeft = REMAINING_HOURS / pace
  const weeksShort = WEEKS_UNTIL_ORDER_ENDS - weeksLeft
  const orderMoreIn = weeksLeft - LEAD_TIME_WEEKS

  return (
    <Card className="w-full max-w-md lg:justify-self-end">
      <CardHeader>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={1}
          className="flex-wrap"
          aria-label={t("landing.ahead.label")}
          value={String(pace)}
          onValueChange={(next) => next && setPace(Number(next))}
        >
          {PACES.map((candidate) => (
            <ToggleGroupItem key={candidate} value={String(candidate)}>
              {t("landing.ahead.pace", { hours: formatHours(candidate * 60) })}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-3xl font-medium tabular-nums">{t("landing.ahead.lasts", { weeks: weeksLeft })}</p>
        <Progress
          value={Math.min((weeksLeft / WEEKS_UNTIL_ORDER_ENDS) * 100, 100)}
          aria-label={t("landing.ahead.lasts", { weeks: weeksLeft })}
        />
        <p className="text-muted-foreground flex justify-between text-xs tabular-nums">
          <span>{t("landing.ahead.remaining", { hours: formatHours(REMAINING_HOURS * 60) })}</span>
          <span>{t("landing.ahead.orderEnds", { weeks: WEEKS_UNTIL_ORDER_ENDS })}</span>
        </p>
        {weeksShort > 0 ? (
          <Alert variant="destructive" aria-live="polite">
            <TriangleAlert aria-hidden />
            <AlertTitle>{t("landing.ahead.short", { weeks: weeksShort })}</AlertTitle>
            <AlertDescription>
              {orderMoreIn > 0
                ? t("landing.ahead.orderIn", { weeks: orderMoreIn, lead: LEAD_TIME_WEEKS })
                : t("landing.ahead.orderNow", { lead: LEAD_TIME_WEEKS })}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert aria-live="polite">
            <CircleCheck aria-hidden />
            <AlertTitle>{t("landing.ahead.enough")}</AlertTitle>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
