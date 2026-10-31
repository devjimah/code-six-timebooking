// Admin creates an account (POST /api/users) or changes one (PUT /api/users/:id). One form for both: editing has
// no password field. The server enforces the rules (company only for consultants, unique email, role changes only
// while nothing depends on the old role, not your own role); the form only helps to get them right first time.
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
import { translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import { ROLES, type Role, type Supplier, type User } from "@/lib/api-types.ts"

type Props = {
  /** null = closed, "new" = create an account, a user = change that account */
  editing: User | "new" | null
  /** The signed-in admin – their own role cannot be changed */
  currentUserId: number
  suppliers: Supplier[]
  onClose: () => void
  onSaved: () => void
}

const EMPTY_FORM = { name: "", email: "", role: "consultant" as Role, supplierId: "", password: "" }

export function UserFormDrawer({ editing, currentUserId, suppliers, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const existing = editing && editing !== "new" ? editing : null
  const isOwnAccount = existing?.id === currentUserId
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Fill the form each time the drawer opens for another account.
  const [openedFor, setOpenedFor] = React.useState<typeof editing>(null)
  if (editing !== openedFor) {
    setOpenedFor(editing)
    setForm(
      existing
        ? { name: existing.name, email: existing.email, role: existing.role, supplierId: String(existing.supplierId ?? ""), password: "" }
        : EMPTY_FORM,
    )
    setError(null)
  }

  const update = (changes: Partial<typeof EMPTY_FORM>) => setForm((current) => ({ ...current, ...changes }))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setError(null)
    setSubmitting(true)
    const account = {
      name: form.name,
      email: form.email,
      role: form.role,
      supplierId: form.role === "consultant" && form.supplierId ? Number(form.supplierId) : null,
    }
    try {
      const saved = existing
        ? await api<User>(`/users/${existing.id}`, { method: "PUT", body: JSON.stringify(account) })
        : await api<User>("/users", { method: "POST", body: JSON.stringify({ ...account, password: form.password }) })
      toast.success(t(existing ? "users.saved" : "users.created", { name: saved.name }))
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
          <DrawerTitle>{existing ? t("users.edit", { name: existing.name }) : t("users.new")}</DrawerTitle>
          <DrawerDescription>{existing ? t("users.editDescription") : t("users.newDescription")}</DrawerDescription>
        </DrawerHeader>
        {/* The form scrolls on small phones; the footer buttons stay visible below it. */}
        <form id="user-form" onSubmit={handleSubmit} className="overflow-y-auto px-4">
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="user-name">{t("users.name")}</FieldLabel>
              <Input
                id="user-name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="off"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="user-email">{t("login.email")}</FieldLabel>
              <Input
                id="user-email"
                type="email"
                required
                autoComplete="off"
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="user-role">{t("profile.role")}</FieldLabel>
              <Select
                value={form.role}
                disabled={isOwnAccount}
                // Only consultants belong to a supplier, so forget the supplier when the role changes.
                onValueChange={(role) => update({ role: role as Role, supplierId: "" })}
              >
                <SelectTrigger id="user-role" className="w-full">
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
              {isOwnAccount ? (
                <FieldDescription>{t("users.ownRoleHint")}</FieldDescription>
              ) : (
                existing && <FieldDescription>{t("users.roleChangeHint")}</FieldDescription>
              )}
            </Field>
            {form.role === "consultant" && (
              <Field>
                <FieldLabel htmlFor="user-supplier">{t("profile.company")}</FieldLabel>
                <Select value={form.supplierId} onValueChange={(supplierId) => update({ supplierId })}>
                  <SelectTrigger id="user-supplier" className="w-full">
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
            {!existing && (
              <Field>
                <FieldLabel htmlFor="user-password">{t("users.initialPassword")}</FieldLabel>
                <Input
                  id="user-password"
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
            )}
          </FieldGroup>
        </form>
        <DrawerFooter>
          <Button type="submit" form="user-form" disabled={submitting}>
            {submitting ? t("suppliers.saving") : existing ? t("suppliers.save") : t("users.create")}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">{t("users.cancel")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
