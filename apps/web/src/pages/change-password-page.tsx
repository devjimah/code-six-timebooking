// "Choose your own password" (step 5). Two ways in: after an admin chose the password (new account or reset) the
// guards send the person here and nothing else opens until they are done; anyone can also come here from their
// profile. The server checks the current password and that the new one differs (domain/rules/password-change.ts).
import * as React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { CircleAlert, Clock, KeyRound } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { useAuth } from "@/auth/auth-context.tsx"
import { LanguageSwitcher } from "@/components/language-switcher.tsx"
import { translateApiError } from "@/i18n/format.ts"
import { ApiError } from "@/lib/api.ts"

export function ChangePasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, changePassword, logout } = useAuth()
  const [form, setForm] = React.useState({ current: "", next: "", repeat: "" })
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  if (!user) return null // RequireSession makes sure this does not happen
  const forced = user.mustChangePassword
  // Typing the new password twice catches typos; this is a convenience check, the real rules run on the server.
  const mismatch = form.repeat !== "" && form.repeat !== form.next

  const update = (changes: Partial<typeof form>) => setForm((current) => ({ ...current, ...changes }))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mismatch) return
    setError(null)
    setSubmitting(true)
    try {
      await changePassword(form.current, form.next)
      toast.success(t("password.changed"))
      navigate("/", { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? translateApiError(caught) : t("errors.INTERNAL_ERROR"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="text-primary flex items-center gap-2 font-medium">
          <Clock className="size-5" aria-hidden />
          {t("app.title")}
        </div>
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t(forced ? "password.titleForced" : "password.title")}</CardTitle>
          <CardDescription>{t(forced ? "password.descriptionForced" : "password.description", { name: user.name })}</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="password-form" onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <Alert variant="destructive">
                  <CircleAlert aria-hidden />
                  <AlertTitle>{t("password.failed")}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Field>
                <FieldLabel htmlFor="current-password">
                  {t(forced ? "password.currentForced" : "password.current")}
                </FieldLabel>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  autoFocus
                  value={form.current}
                  onChange={(e) => update({ current: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-password">{t("password.new")}</FieldLabel>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={72}
                  value={form.next}
                  onChange={(e) => update({ next: e.target.value })}
                />
                <FieldDescription>{t("password.hint")}</FieldDescription>
              </Field>
              <Field data-invalid={mismatch || undefined}>
                <FieldLabel htmlFor="repeat-password">{t("password.repeat")}</FieldLabel>
                <Input
                  id="repeat-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.repeat}
                  onChange={(e) => update({ repeat: e.target.value })}
                  aria-invalid={mismatch || undefined}
                />
                {mismatch && <FieldError>{t("password.mismatch")}</FieldError>}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" form="password-form" className="w-full" disabled={submitting || mismatch}>
            <KeyRound aria-hidden />
            {submitting ? t("password.saving") : t("password.save")}
          </Button>
          {/* Forced: the only other way out is signing out. Otherwise back to the start screen. */}
          {forced ? (
            <Button variant="outline" className="w-full" onClick={() => void logout()}>
              {t("logout")}
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              {t("users.cancel")}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
