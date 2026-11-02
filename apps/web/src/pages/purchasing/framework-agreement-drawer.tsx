// Create or change a framework agreement (POST and PUT /api/framework-agreements, ADR 0020). The server enforces the rules.
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
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import type { FrameworkAgreement, Supplier } from "@/lib/api-types.ts"
import { euroToCents } from "@/lib/money.ts"

type Props = {
  /** null = closed, "new" = create one, an agreement = change it */
  editing: FrameworkAgreement | "new" | null
  suppliers: Supplier[]
  onClose: () => void
  onSaved: () => void
}

const EMPTY = { code: "", title: "", supplierId: "", total: "", startDate: "", endDate: "" }

export function FrameworkAgreementDrawer({ editing, suppliers, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const existing = editing && editing !== "new" ? editing : null
  const [form, setForm] = React.useState(EMPTY)
  const [error, setError] = React.useState<string | null>(null)

  // Fill the form each time the drawer opens for another agreement.
  const [openedFor, setOpenedFor] = React.useState<typeof editing>(null)
  if (editing !== openedFor) {
    setOpenedFor(editing)
    setForm(
      existing
        ? {
            code: existing.code,
            title: existing.title,
            supplierId: String(existing.supplierId),
            total: String(existing.totalBudgetCents / 100),
            startDate: existing.startDate,
            endDate: existing.endDate,
          }
        : EMPTY,
    )
    setError(null)
  }
  const update = (changes: Partial<typeof EMPTY>) => setForm((current) => ({ ...current, ...changes }))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const body = {
      code: form.code,
      title: form.title,
      supplierId: Number(form.supplierId),
      totalBudgetCents: euroToCents(form.total),
      startDate: form.startDate,
      endDate: form.endDate,
    }
    try {
      await api(existing ? `/framework-agreements/${existing.id}` : "/framework-agreements", {
        method: existing ? "PUT" : "POST",
        body: JSON.stringify(body),
      })
      toast.success(t("agreements.saved", { code: form.code }))
      onSaved()
      onClose()
    } catch (caught) {
      setError(caught instanceof ApiError ? translateApiError(caught) : t("errors.INTERNAL_ERROR"))
    }
  }

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={editing !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{existing ? t("agreements.changeNamed", { code: existing.code }) : t("agreements.new")}</DrawerTitle>
          <DrawerDescription>{t("agreements.formDescription")}</DrawerDescription>
        </DrawerHeader>
        <form id="agreement-form" onSubmit={handleSubmit} className="overflow-y-auto px-4 pb-2">
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Field>
                <FieldLabel htmlFor="agreement-code">{t("orders.code")}</FieldLabel>
                <Input id="agreement-code" required minLength={3} maxLength={40} autoComplete="off" value={form.code} onChange={(e) => update({ code: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="agreement-title">{t("agreements.title")}</FieldLabel>
                <Input id="agreement-title" required minLength={3} maxLength={200} autoComplete="off" value={form.title} onChange={(e) => update({ title: e.target.value })} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="agreement-supplier">{t("orders.supplier")}</FieldLabel>
              <Select value={form.supplierId} onValueChange={(supplierId) => update({ supplierId })}>
                <SelectTrigger id="agreement-supplier" className="w-full">
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
            </Field>
            <Field>
              <FieldLabel htmlFor="agreement-total">{t("agreements.totalField")}</FieldLabel>
              <Input id="agreement-total" inputMode="decimal" required pattern="[0-9]+([.,][0-9]{1,2})?" value={form.total} onChange={(e) => update({ total: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="agreement-start">{t("orders.startDate")}</FieldLabel>
                <Input id="agreement-start" type="date" required value={form.startDate} onChange={(e) => update({ startDate: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="agreement-end">{t("orders.endDate")}</FieldLabel>
                <Input id="agreement-end" type="date" required min={form.startDate || undefined} value={form.endDate} onChange={(e) => update({ endDate: e.target.value })} />
              </Field>
            </div>
          </FieldGroup>
        </form>
        <DrawerFooter>
          <Button type="submit" form="agreement-form">
            {t("suppliers.save")}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">{t("users.cancel")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
