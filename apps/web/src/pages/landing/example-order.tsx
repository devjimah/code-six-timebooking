// Demo: book time on an example order, watch the budget move, and get refused when it runs out.
// Only an illustration: nothing is saved. The real rule lives in the API (domain/rules/order-budget.ts).
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert } from "lucide-react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardFooter, CardHeader } from "@workspace/ui/components/card"
import { Progress } from "@workspace/ui/components/progress"
import { formatEuroCents, formatHours } from "@/i18n/format.ts"

const ORDER_CODE = "PO-2026-014"
const BUDGET_HOURS = 40
const START_HOURS = 30
const BOOKING_HOURS = 4
const HOURLY_RATE_CENTS = 9500
const ATTENTION_PERCENT = 80 // the same line as on the project manager's home page

export function ExampleOrder() {
  const { t } = useTranslation()
  const [bookedHours, setBookedHours] = React.useState(START_HOURS)
  const [refused, setRefused] = React.useState(false)

  const usedPercent = Math.round((bookedHours / BUDGET_HOURS) * 100)
  const remainingHours = BUDGET_HOURS - bookedHours

  function book() {
    if (bookedHours + BOOKING_HOURS > BUDGET_HOURS) setRefused(true)
    else setBookedHours(bookedHours + BOOKING_HOURS)
  }

  function startOver() {
    setBookedHours(START_HOURS)
    setRefused(false)
  }

  return (
    <Card className="w-full max-w-md lg:justify-self-end">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 text-sm">
          <div className="min-w-0">
            <span className="text-muted-foreground block font-mono text-xs">{ORDER_CODE}</span>
            <span className="block font-medium">{t("landing.example.title")}</span>
          </div>
          {usedPercent >= ATTENTION_PERCENT && <Badge variant="secondary">{t("home.attention")}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-3xl font-medium tabular-nums">
          {t("orders.left", { hours: formatHours(remainingHours * 60) })}
        </p>
        <Progress value={usedPercent} aria-label={t("orders.usedOf", { percent: usedPercent, code: ORDER_CODE })} />
        <p className="text-muted-foreground flex justify-between text-xs tabular-nums">
          <span>{t("landing.example.booked", { booked: bookedHours, budget: formatHours(BUDGET_HOURS * 60) })}</span>
          <span>{formatEuroCents(remainingHours * HOURLY_RATE_CENTS)}</span>
        </p>
        {refused && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{t("errors.BUDGET_EXCEEDED")}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        {refused ? (
          <Button variant="outline" onClick={startOver}>
            {t("landing.example.startOver")}
          </Button>
        ) : (
          <Button variant="outline" onClick={book}>
            {t("landing.example.book", { hours: formatHours(BOOKING_HOURS * 60) })}
          </Button>
        )}
        <p className="text-muted-foreground text-center text-xs">{t("landing.example.hint")}</p>
      </CardFooter>
    </Card>
  )
}
