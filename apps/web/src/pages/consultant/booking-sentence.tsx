// Type a sentence, get the form filled in (POST /api/time-entries/parse-sentence, ticket #79, ADR 0022). This only proposes:
// the consultant checks the form and books, and the booking rules run as usual. Rule-based, and no data leaves the system.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert, Sparkles } from "lucide-react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldDescription, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import type { SentenceProposal } from "@/lib/api-types.ts"

export function BookingSentence({ onProposal }: { onProposal: (proposal: SentenceProposal) => void }) {
  const { t } = useTranslation()
  const [sentence, setSentence] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [missing, setMissing] = React.useState<boolean | null>(null)

  async function propose() {
    setError(null)
    try {
      const proposal = await api<SentenceProposal>("/time-entries/parse-sentence", {
        method: "POST",
        body: JSON.stringify({ sentence }),
      })
      onProposal(proposal)
      setMissing(Object.values(proposal).some((value) => value === null))
    } catch (caught) {
      setError(caught instanceof ApiError ? translateApiError(caught) : t("errors.INTERNAL_ERROR"))
    }
  }

  return (
    <div className="bg-muted/50 mb-4 grid gap-2 rounded-lg border p-3">
      <Field>
        <FieldLabel htmlFor="booking-sentence">{t("sentence.label")}</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="booking-sentence"
            maxLength={300}
            autoComplete="off"
            placeholder={t("sentence.placeholder")}
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                if (sentence.trim()) void propose()
              }
            }}
          />
          <Button type="button" variant="outline" disabled={!sentence.trim()} onClick={propose}>
            <Sparkles aria-hidden />
            {t("sentence.fill")}
          </Button>
        </div>
        <FieldDescription aria-live="polite">
          {missing === null ? t("sentence.hint") : missing ? t("sentence.partly") : t("sentence.filled")}
        </FieldDescription>
      </Field>
      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
