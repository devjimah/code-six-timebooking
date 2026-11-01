// The consultant marks days on which they are not available, never why (GET, PUT, DELETE /api/unavailable-days,
// ticket #10, ADR 0016). The project manager can then plan without asking, and the forecast counts the absence.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert, Plus, X } from "lucide-react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { formatWeekday, translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import type { UnavailableDay } from "@/lib/api-types.ts"

type Props = {
  days: UnavailableDay[]
  onChange: () => void
}

export function UnavailableDaysCard({ days, onChange }: Props) {
  const { t } = useTranslation()
  const [date, setDate] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  async function change(method: "PUT" | "DELETE", day: string) {
    setError(null)
    try {
      await api(`/unavailable-days/${day}`, { method })
      if (method === "PUT") setDate("")
      onChange()
    } catch (caught) {
      setError(caught instanceof ApiError ? translateApiError(caught) : t("errors.INTERNAL_ERROR"))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("unavailable.title")}</CardTitle>
        <CardDescription>{t("unavailable.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (date) void change("PUT", date)
          }}
        >
          <Field>
            <FieldLabel htmlFor="unavailable-date">{t("unavailable.date")}</FieldLabel>
            <Input id="unavailable-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Button type="submit" variant="outline">
            <Plus aria-hidden />
            {t("unavailable.mark")}
          </Button>
        </form>
        {days.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("unavailable.none")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {days.map((day) => (
              <li key={day.date}>
                <Badge variant="secondary" className="gap-1 pr-1">
                  {formatWeekday(day.date)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5"
                    aria-label={t("unavailable.remove", { date: formatWeekday(day.date) })}
                    onClick={() => void change("DELETE", day.date)}
                  >
                    <X aria-hidden />
                  </Button>
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
