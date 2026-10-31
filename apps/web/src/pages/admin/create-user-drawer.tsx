// Admin creates an account (POST /api/users). The server enforces the rules (consultant needs a supplier,
// unique email, password length); the form only helps to get them right first time.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert, UserPlus } from "lucide-react"
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
  DrawerTrigger,
} from "@workspace/ui/components/drawer"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import { ROLES, type CreateUserRequest, type Role, type Supplier, type User } from "@/lib/api-types.ts"

const EMPTY_FORM = { name: "", email: "", role: "consultant" as Role, supplierId: "", password: "" }

export function CreateUserDrawer({ suppliers, onCreated }: { suppliers: Supplier[]; onCreated: () => void }) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const update = (changes: Partial<typeof EMPTY_FORM>) => setForm((current) => ({ ...current, ...changes }))

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setForm(EMPTY_FORM)
      setError(null)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const body: CreateUserRequest = {
      name: form.name,
      email: form.email,
      role: form.role,
      supplierId: form.role === "consultant" && form.supplierId ? Number(form.supplierId) : null,
      password: form.password,
    }
    try {
      const created = await api<User>("/users", { method: "POST", body: JSON.stringify(body) })
      toast.success(t("users.created", { name: created.name }))
      handleOpenChange(false)
      onCreated()
    } catch (caught) {
      setError(caught instanceof ApiError ? translateApiError(caught) : t("errors.INTERNAL_ERROR"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button>
          <UserPlus aria-hidden />
          {t("users.new")}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("users.new")}</DrawerTitle>
          <DrawerDescription>{t("users.newDescription")}</DrawerDescription>
        </DrawerHeader>
        {/* The form scrolls on small phones; the footer buttons stay visible below it. */}
        <form id="create-user" onSubmit={handleSubmit} className="overflow-y-auto px-4">
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="new-name">{t("users.name")}</FieldLabel>
              <Input
                id="new-name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="off"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-email">{t("login.email")}</FieldLabel>
              <Input
                id="new-email"
                type="email"
                required
                autoComplete="off"
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-role">{t("profile.role")}</FieldLabel>
              <Select
                value={form.role}
                // Only consultants belong to a supplier, so forget the supplier when the role changes.
                onValueChange={(role) => update({ role: role as Role, supplierId: "" })}
              >
                <SelectTrigger id="new-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(`roles.${role}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {form.role === "consultant" && (
              <Field>
                <FieldLabel htmlFor="new-supplier">{t("profile.company")}</FieldLabel>
                <Select value={form.supplierId} onValueChange={(supplierId) => update({ supplierId })}>
                  <SelectTrigger id="new-supplier" className="w-full">
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
                <FieldDescription>{t("users.supplierHint")}</FieldDescription>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="new-password">{t("users.initialPassword")}</FieldLabel>
              <Input
                id="new-password"
                type="text"
                required
                minLength={10}
                maxLength={72}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update({ password: e.target.value })}
              />
              <FieldDescription>{t("users.passwordHint")}</FieldDescription>
            </Field>
          </FieldGroup>
        </form>
        <DrawerFooter>
          <Button type="submit" form="create-user" disabled={submitting}>
            {submitting ? t("users.creating") : t("users.create")}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">{t("users.cancel")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
