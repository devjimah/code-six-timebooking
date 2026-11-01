// Place an order (POST /api/orders) or change one (PUT /api/orders/:id) – purchasing only.
// The server enforces every rule; the form only helps: it shows the money budget and locks the supplier once time is booked.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { formatEuroCents, formatHours, translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import type { OrderOverview, OrderRequest, ProjectManager, Supplier } from "@/lib/api-types.ts"

type Props = {
  /** null = closed, "new" = place an order, an order = change it */
  editing: OrderOverview | "new" | null
  suppliers: Supplier[]
  projectManagers: ProjectManager[]
  onClose: () => void
  onSaved: () => void
}

type Form = {
  code: string
  title: string
  supplierId: string
  projectManagerId: string
  budgetHours: string
  hourlyRate: string // euros as typed, "95" or "95,50"
  startDate: string
  endDate: string
}

const EMPTY: Form = {
  code: "",
  title: "",
  supplierId: "",
  projectManagerId: "",
  budgetHours: "",
  hourlyRate: "",
  startDate: "",
  endDate: "",
}

/** `decimalComma`: show "95,00" in German, "95.00" in English – the way people type it in that language. */
const toForm = (order: OrderOverview, decimalComma: boolean): Form => ({
  code: order.code,
  title: order.title,
  supplierId: String(order.supplierId),
  projectManagerId: String(order.projectManagerId),
  budgetHours: String(order.budgetHours),
  hourlyRate: (order.hourlyRateCents / 100).toFixed(2).replace(".", decimalComma ? "," : "."),
  startDate: order.startDate,
  endDate: order.endDate,
})

/** "95,50" or "95.50" → 9550 cents; NaN if it is not a number. German users type a decimal comma. */
const euroToCents = (text: string) => Math.round(Number(text.replace(",", ".")) * 100)

export function OrderDrawer({ editing, suppliers, projectManagers, onClose, onSaved }: Props) {
  const { t, i18n } = useTranslation()
  const isMobile = useIsMobile()
  const isNew = editing === "new"
  const existing = editing && editing !== "new" ? editing : null
  const hasBookings = (existing?.bookedHours ?? 0) > 0
  const [form, setForm] = React.useState<Form>(EMPTY)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Fill the form each time the drawer opens for another order.
  const [openedFor, setOpenedFor] = React.useState<typeof editing>(null)
  if (editing !== openedFor) {
    setOpenedFor(editing)
    setForm(existing ? toForm(existing, i18n.resolvedLanguage === "de") : EMPTY)
    setError(null)
  }

  const update = (changes: Partial<Form>) => setForm((current) => ({ ...current, ...changes }))

  const rateCents = euroToCents(form.hourlyRate)
  const hours = Number(form.budgetHours)
  const budgetPreview = Number.isFinite(rateCents) && hours > 0 && rateCents > 0 ? formatEuroCents(hours * rateCents) : null

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setError(null)
    setSubmitting(true)
    const body: OrderRequest = {
      code: form.code,
      title: form.title,
      supplierId: Number(form.supplierId),
      projectManagerId: Number(form.projectManagerId),
      budgetHours: hours,
      hourlyRateCents: rateCents,
      startDate: form.startDate,
      endDate: form.endDate,
    }
    try {
      const saved = existing
        ? await api<{ code: string }>(`/orders/${existing.orderId}`, { method: "PUT", body: JSON.stringify(body) })
        : await api<{ code: string }>("/orders", { method: "POST", body: JSON.stringify(body) })
      toast.success(t(isNew ? "orders.created" : "orders.saved", { code: saved.code }))
      onSaved()
      onClose()
    } catch (caught) {
      setError(caught instanceof ApiError ? translateApiError(caught) : t("errors.INTERNAL_ERROR"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={editing !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{existing ? t("orders.edit", { code: existing.code }) : t("orders.new")}</DrawerTitle>
          <DrawerDescription>
            {existing && hasBookings
              ? t("orders.editBooked", { hours: formatHours(existing.bookedHours * 60) })
              : t("orders.newDescription")}
          </DrawerDescription>
        </DrawerHeader>
        {/* The form scrolls on small phones; the footer buttons stay visible below it. */}
        <form id="order-form" onSubmit={handleSubmit} className="overflow-y-auto px-4 pb-2">
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Field>
                <FieldLabel htmlFor="order-code">{t("orders.code")}</FieldLabel>
                <Input
                  id="order-code"
                  required
                  minLength={3}
                  maxLength={40}
                  placeholder="PO-2026-004"
                  autoComplete="off"
                  value={form.code}
                  onChange={(e) => update({ code: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="order-title">{t("orders.title")}</FieldLabel>
                <Input
                  id="order-title"
                  required
                  minLength={3}
                  maxLength={200}
                  autoComplete="off"
                  value={form.title}
                  onChange={(e) => update({ title: e.target.value })}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="order-supplier">{t("orders.supplier")}</FieldLabel>
              <Select value={form.supplierId} onValueChange={(supplierId) => update({ supplierId })} disabled={hasBookings}>
                <SelectTrigger id="order-supplier" className="w-full">
                  <SelectValue placeholder={t("users.chooseSupplier")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasBookings && <FieldDescription>{t("orders.supplierLocked")}</FieldDescription>}
            </Field>
            <Field>
              <FieldLabel htmlFor="order-pm">{t("orders.projectManager")}</FieldLabel>
              <Select value={form.projectManagerId} onValueChange={(projectManagerId) => update({ projectManagerId })}>
                <SelectTrigger id="order-pm" className="w-full">
                  <SelectValue placeholder={t("orders.choosePm")} />
                </SelectTrigger>
                <SelectContent>
                  {projectManagers.map((pm) => (
                    <SelectItem key={pm.id} value={String(pm.id)}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="order-hours">{t("orders.budgetHours")}</FieldLabel>
                <Input
                  id="order-hours"
                  type="number"
                  inputMode="numeric"
                  required
                  min={existing ? Math.max(1, Math.ceil(existing.bookedHours)) : 1}
                  step={1}
                  value={form.budgetHours}
                  onChange={(e) => update({ budgetHours: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="order-rate">{t("orders.hourlyRate")}</FieldLabel>
                <Input
                  id="order-rate"
                  inputMode="decimal"
                  required
                  pattern="[0-9]+([.,][0-9]{1,2})?"
                  placeholder="95,00"
                  value={form.hourlyRate}
                  onChange={(e) => update({ hourlyRate: e.target.value })}
                />
              </Field>
            </div>
            {budgetPreview && <FieldDescription>{t("orders.budgetPreview", { amount: budgetPreview })}</FieldDescription>}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="order-start">{t("orders.startDate")}</FieldLabel>
                <Input
                  id="order-start"
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="order-end">{t("orders.endDate")}</FieldLabel>
                <Input
                  id="order-end"
                  type="date"
                  required
                  min={form.startDate || undefined}
                  value={form.endDate}
                  onChange={(e) => update({ endDate: e.target.value })}
                />
              </Field>
            </div>
          </FieldGroup>
        </form>
        <DrawerFooter>
          <Button type="submit" form="order-form" disabled={submitting}>
            {submitting ? t("suppliers.saving") : t(isNew ? "orders.create" : "suppliers.save")}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">{t("users.cancel")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
