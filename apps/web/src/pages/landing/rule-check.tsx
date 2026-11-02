// Demo: pick a booking that breaks a rule and read the refusal a consultant would get.
// The texts are the app's real error messages; the checks themselves live in the API (application/book-time.ts).
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Card, CardContent } from "@workspace/ui/components/card"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"

const SCENARIOS = [
  { key: "longDay", error: "DAILY_LIMIT_EXCEEDED" },
  { key: "sunday", error: "SUNDAY_OR_HOLIDAY" },
  { key: "shortRest", error: "REST_PERIOD_TOO_SHORT" },
  { key: "future", error: "DATE_IN_FUTURE" },
  { key: "overlap", error: "BOOKING_OVERLAP" },
  { key: "otherCompany", error: "ORDER_NOT_ASSIGNED" },
] as const

export function RuleCheck() {
  const { t } = useTranslation()
  const [selected, setSelected] = React.useState<(typeof SCENARIOS)[number]>(SCENARIOS[0])

  return (
    <Card className="w-full max-w-md lg:justify-self-end">
      <CardContent className="grid gap-4">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={1}
          className="flex-wrap"
          aria-label={t("landing.rules.label")}
          value={selected.key}
          onValueChange={(key) => {
            const scenario = SCENARIOS.find((candidate) => candidate.key === key)
            if (scenario) setSelected(scenario)
          }}
        >
          {SCENARIOS.map((scenario) => (
            <ToggleGroupItem key={scenario.key} value={scenario.key}>
              {t(`landing.rules.scenarios.${scenario.key}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Alert variant="destructive" aria-live="polite">
          <CircleAlert aria-hidden />
          <AlertTitle>{t(`landing.rules.scenarios.${selected.key}`)}</AlertTitle>
          <AlertDescription>{t(`errors.${selected.error}`)}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
