// How long the budget lasts at the current pace, and when to order more (ticket #51, ADR 0015).
// The server calculates everything; this only words it.
import { useTranslation } from "react-i18next"
import { TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { formatDate, formatHours, formatNumber } from "@/i18n/format.ts"
import type { BudgetForecast } from "@/lib/api-types.ts"
import { calendarWeek, todayInCompanyTimeZone } from "@/lib/dates.ts"

type Props = {
  forecast: BudgetForecast
  endDate: string
}

export function BudgetForecastCard({ forecast, endDate }: Props) {
  const { t } = useTranslation()
  const end = formatDate(endDate)
  const late = forecast.orderMoreBy !== null && forecast.orderMoreBy <= todayInCompanyTimeZone()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("forecast.title")}</CardTitle>
        <CardDescription className="tabular-nums">
          {t("forecast.pace", {
            hours: formatHours(forecast.paceHoursPerWeek * 60),
            days: formatNumber(forecast.pacePersonDaysPerWeek),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {forecast.state === "runs_out_early" && forecast.runsOutOn ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertTitle>{t("forecast.runsOut", { date: formatDate(forecast.runsOutOn), week: calendarWeek(forecast.runsOutOn), end })}</AlertTitle>
            <AlertDescription>
              <p>
                {t("forecast.missing", {
                  hours: formatHours(forecast.missingHours * 60),
                  days: formatNumber(forecast.missingPersonDays),
                })}
              </p>
              {forecast.orderMoreBy && (
                <p>
                  {late
                    ? t("forecast.orderNow", { weeks: forecast.leadTimeWeeks })
                    : t("forecast.orderBy", {
                        date: formatDate(forecast.orderMoreBy),
                        week: calendarWeek(forecast.orderMoreBy),
                        weeks: forecast.leadTimeWeeks,
                      })}
                </p>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-muted-foreground text-sm">
            {forecast.state === "lasts" && t("forecast.lasts", { end })}
            {forecast.state === "no_pace" && t("forecast.noPace")}
            {forecast.state === "ended" && t("forecast.ended", { end })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
