// Admin resets someone's password (POST /api/users/:id/password, step 5). The admin types the new password and
// hands it over; the person is signed out everywhere and must choose their own at the next sign-in.
// The server refuses a reset of the admin's own password – they use "Change password" in their profile.
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
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import type { User } from "@/lib/api-types.ts"

type Props = {
  /** null = closed */
  user: User | null
  onClose: () => void
  onSaved: () => void
}

export function ResetPasswordDrawer({ user, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Start empty each time the drawer opens for another account.
  const [openedFor, setOpenedFor] = React.useState<User | null>(null)
  if (user !== openedFor) {
    setOpenedFor(user)
    setPassword("")
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    setError(null)
    setSubmitting(true)
    try {
      await api<User>(`/users/${user.id}/password`, { method: "POST", body: JSON.stringify({ password }) })
      toast.success(t("users.passwordReset", { name: user.name }))
      onSaved()
      onClose()
    } catch (caught) {
      setError(caught instanceof ApiError ? translateApiError(caught) : t("errors.INTERNAL_ERROR"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={user !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{user && t("users.resetTitle", { name: user.name })}</DrawerTitle>
          <DrawerDescription>{t("users.resetDescription")}</DrawerDescription>
        </DrawerHeader>
        <form id="reset-password-form" onSubmit={handleSubmit} className="overflow-y-auto px-4">
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="reset-password">{t("users.newPassword")}</FieldLabel>
              {/* Visible text, like the initial password: the admin has to read it out or write it down. */}
              <Input
                id="reset-password"
                type="text"
                required
                minLength={10}
                maxLength={72}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldDescription>{t("users.resetHint")}</FieldDescription>
            </Field>
          </FieldGroup>
        </form>
        <DrawerFooter>
          <Button type="submit" form="reset-password-form" disabled={submitting}>
            {submitting ? t("suppliers.saving") : t("users.resetButton")}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">{t("users.cancel")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
