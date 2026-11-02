// Purchasing: compare an invoice with the approved hours of a month (GET /api/orders/:id/invoice-check, ADR 0018).
// Sums only, no single bookings. Nothing is saved: the amount is only used for this comparison.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { formatEuroCents, formatHours, translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import type { InvoiceCheck, OrderOverview } from "@/lib/api-types.ts"
import { euroToCents } from "@/lib/money.ts"
import { useApi } from "@/lib/use-api.ts"

export function InvoiceCheckPage() {
  const { t } = useTranslation()
  const orders = useApi<OrderOverview[]>("/orders")
  const [form, setForm] = React.useState({ orderId: "", month: "", amount: "" })
  const [result, setResult] = React.useState<InvoiceCheck | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const update = (changes: Partial<typeof form>) => {
    setForm((current) => ({ ...current, ...changes }))
    setResult(null)
    setError(null)
  }

  const invoicedCents = euroToCents(form.amount)
  const valid = form.orderId !== "" && form.month !== "" && Number.isInteger(invoicedCents) && invoicedCents >= 0

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      const query = new URLSearchParams({ month: form.month, invoicedCents: String(invoicedCents) })
      setResult(await api<InvoiceCheck>(`/orders/${form.orderId}/invoice-check?${query}`))
    } catch (caught) {
      setError(caught instanceof ApiError ? translateApiError(caught) : t("errors.INTERNAL_ERROR"))
    }
  }

  return (
    <div className="grid max-w-xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("invoice.title")}</CardTitle>
          <CardDescription>{t("invoice.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <Alert variant="destructive">
                  <CircleAlert aria-hidden />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Field>
                <FieldLabel htmlFor="invoice-order">{t("orders.order")}</FieldLabel>
                <Select value={form.orderId} onValueChange={(orderId) => update({ orderId })}>
                  <SelectTrigger id="invoice-order" className="w-full">
                    <SelectValue placeholder={t("booking.chooseOrder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.data?.map((order) => (
                      <SelectItem key={order.orderId} value={String(order.orderId)}>
                        <span className="font-mono text-xs">{order.code}</span> {order.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="invoice-month">{t("invoice.month")}</FieldLabel>
                  <Input id="invoice-month" type="month" required value={form.month} onChange={(e) => update({ month: e.target.value })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="invoice-amount">{t("invoice.amount")}</FieldLabel>
                  <Input
                    id="invoice-amount"
                    inputMode="decimal"
                    required
                    autoComplete="off"
                    value={form.amount}
                    onChange={(e) => update({ amount: e.target.value })}
                  />
                  <FieldDescription>{t("invoice.notSaved")}</FieldDescription>
                </Field>
              </div>
              <Button type="submit" disabled={!valid}>
                {t("invoice.check")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Alert variant={result.result === "invoice_higher" ? "destructive" : "default"}>
          {result.result === "matches" ? <CircleCheck aria-hidden /> : <TriangleAlert aria-hidden />}
          <AlertTitle>
            {t(`invoice.result.${result.result}`, { difference: formatEuroCents(Math.abs(result.differenceCents)) })}
          </AlertTitle>
          <AlertDescription>
            <p>
              {t("invoice.approved", {
                hours: formatHours(result.approvedHours * 60),
                amount: formatEuroCents(result.approvedCents),
                invoiced: formatEuroCents(result.invoicedCents),
              })}
            </p>
            {result.notApprovedHours > 0 && (
              <p>{t("invoice.notApproved", { hours: formatHours(result.notApprovedHours * 60) })}</p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
