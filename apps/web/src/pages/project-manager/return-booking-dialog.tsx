// The project manager returns a booking to the consultant, with a reason (POST /api/time-entries/:id/return, ADR 0014).
// The dialog stays open when the server refuses, so the text is not lost.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Textarea } from "@workspace/ui/components/textarea"
import { translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import type { OrderBooking } from "@/lib/api-types.ts"

type Props = {
  booking: OrderBooking | null
  onClose: () => void
  onReturned: () => void
}

export function ReturnBookingDialog({ booking, onClose, onReturned }: Props) {
  const { t } = useTranslation()
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  function close() {
    setReason("")
    setError(null)
    onClose()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!booking) return
    setError(null)
    setSubmitting(true)
    try {
      await api(`/time-entries/${booking.id}/return`, { method: "POST", body: JSON.stringify({ reason }) })
      toast.success(t("myOrders.returned"))
      onReturned()
      close()
    } catch (caught) {
      setError(caught instanceof ApiError ? translateApiError(caught) : t("errors.INTERNAL_ERROR"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open={booking !== null} onOpenChange={(open) => !open && close()}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("myOrders.returnTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("myOrders.returnDescription", { consultant: booking?.consultantName ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Field>
            <FieldLabel htmlFor="return-reason">{t("myOrders.reason")}</FieldLabel>
            <Textarea
              id="return-reason"
              maxLength={500}
              placeholder={t("myOrders.reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">{t("myOrders.cancel")}</AlertDialogCancel>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("myOrders.returning") : t("myOrders.returnConfirm")}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
