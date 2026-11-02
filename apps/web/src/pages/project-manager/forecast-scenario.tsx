// What if another consultant joins, or the project runs longer? (GET /api/orders/:id/forecast-scenario, ticket #73)
// The server calculates it with the same forecast; nothing is saved.
import * as React from "react"
import { useTranslation } from "react-i18next"

import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { formatDate, formatHours } from "@/i18n/format.ts"
import type { BudgetForecast } from "@/lib/api-types.ts"
import { useApi } from "@/lib/use-api.ts"

const EXTRA_CONSULTANTS = ["0", "1", "2"]
const EXTRA_WEEKS = ["0", "2", "4", "8"]

function ScenarioResult({ orderId, consultants, weeks }: { orderId: string; consultants: string; weeks: string }) {
  const { t } = useTranslation()
  const { data } = useApi<BudgetForecast>(`/orders/${orderId}/forecast-scenario?extraConsultants=${consultants}&extraWeeks=${weeks}`)
  if (!data) return null
  const end = formatDate(data.orderEndDate)
  return (
    <p className="text-sm font-medium" aria-live="polite">
      {data.state === "runs_out_early" && data.runsOutOn
        ? t("forecast.scenarioShort", { date: formatDate(data.runsOutOn), hours: formatHours(data.missingHours * 60), end })
        : t("forecast.scenarioLasts", { end })}
    </p>
  )
}

export function ForecastScenarioPanel({ orderId }: { orderId: string }) {
  const { t } = useTranslation()
  const [consultants, setConsultants] = React.useState("0")
  const [weeks, setWeeks] = React.useState("0")
  const changed = consultants !== "0" || weeks !== "0"

  return (
    <div className="grid gap-3 border-t pt-4">
      <p className="text-sm font-medium">{t("forecast.whatIf")}</p>
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <Field>
          <FieldLabel htmlFor="scenario-consultants">{t("forecast.extraConsultants")}</FieldLabel>
          <Select value={consultants} onValueChange={setConsultants}>
            <SelectTrigger id="scenario-consultants" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXTRA_CONSULTANTS.map((value) => (
                <SelectItem key={value} value={value}>
                  +{value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="scenario-weeks">{t("forecast.extraWeeks")}</FieldLabel>
          <Select value={weeks} onValueChange={setWeeks}>
            <SelectTrigger id="scenario-weeks" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXTRA_WEEKS.map((value) => (
                <SelectItem key={value} value={value}>
                  +{value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      {changed && <ScenarioResult orderId={orderId} consultants={consultants} weeks={weeks} />}
    </div>
  )
}
