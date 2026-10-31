// Create a supplier (POST /api/suppliers) or rename one (PATCH /api/suppliers/:id) – purchasing only.
// The server enforces the unique name; the form shows its translated error.
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
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import type { Supplier } from "@/lib/api-types.ts"

type Props = {
  /** null = closed, "new" = create, a supplier = rename it */
  editing: Supplier | "new" | null
  onClose: () => void
  onSaved: () => void
}

export function SupplierDrawer({ editing, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const isNew = editing === "new"
  const [name, setName] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Fill the form each time the drawer opens for another supplier.
  const [openedFor, setOpenedFor] = React.useState<typeof editing>(null)
  if (editing !== openedFor) {
    setOpenedFor(editing)
    setName(editing && editing !== "new" ? editing.name : "")
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setError(null)
    setSubmitting(true)
    try {
      const saved = isNew
        ? await api<Supplier>("/suppliers", { method: "POST", body: JSON.stringify({ name }) })
        : await api<Supplier>(`/suppliers/${editing.id}`, { method: "PATCH", body: JSON.stringify({ name }) })
      toast.success(t(isNew ? "suppliers.created" : "suppliers.renamed", { name: saved.name }))
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
          <DrawerTitle>{t(isNew ? "suppliers.new" : "suppliers.rename")}</DrawerTitle>
          <DrawerDescription>{t(isNew ? "suppliers.newDescription" : "suppliers.renameDescription")}</DrawerDescription>
        </DrawerHeader>
        <form id="supplier-form" onSubmit={handleSubmit} className="overflow-y-auto px-4">
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="supplier-name">{t("suppliers.name")}</FieldLabel>
              <Input
                id="supplier-name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="organization"
                placeholder="Acme Consulting GmbH"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </form>
        <DrawerFooter>
          <Button type="submit" form="supplier-form" disabled={submitting}>
            {submitting ? t("suppliers.saving") : t(isNew ? "suppliers.create" : "suppliers.save")}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">{t("users.cancel")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
