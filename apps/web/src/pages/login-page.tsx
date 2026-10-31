// Sign-in screen. There is no sign-up: admins create accounts (ADR 0004).
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert, Clock } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { LanguageSwitcher } from "@/components/language-switcher.tsx"
import { useAuth } from "@/auth/auth-context.tsx"
import { ApiError } from "@/lib/api.ts"

// Shown only in development (npm run dev), so the jury can sign in without opening the README.
const DEMO_EMAILS = ["consultant@demo.local", "pm@demo.local", "admin@demo.local"]

export function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errorCode, setErrorCode] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorCode(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "NETWORK_ERROR")
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
          <CardTitle className="text-xl">{t("login.title")}</CardTitle>
          <CardDescription>{t("login.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {errorCode && (
                <Alert variant="destructive">
                  <CircleAlert aria-hidden />
                  <AlertTitle>{t("login.failed")}</AlertTitle>
                  <AlertDescription>{t(`errors.${errorCode}`, t("errors.INTERNAL_ERROR"))}</AlertDescription>
                </Alert>
              )}
              <Field data-invalid={errorCode === "INVALID_CREDENTIALS" || undefined}>
                <FieldLabel htmlFor="email">{t("login.email")}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="name@company.com"
                  required
                  autoFocus
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={errorCode === "INVALID_CREDENTIALS" || undefined}
                />
              </Field>
              <Field data-invalid={errorCode === "INVALID_CREDENTIALS" || undefined}>
                <FieldLabel htmlFor="password">{t("login.password")}</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={errorCode === "INVALID_CREDENTIALS" || undefined}
                />
                <FieldDescription>{t("login.noAccount")}</FieldDescription>
              </Field>
              <Field>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("login.submitting") : t("login.submit")}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        {import.meta.env.DEV && (
          <CardFooter className="flex-col items-start gap-2">
            <p className="text-muted-foreground text-xs">{t("login.demoHint")}</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_EMAILS.map((demoEmail) => (
                <Button
                  key={demoEmail}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEmail(demoEmail)
                    setPassword("demo1234")
                  }}
                >
                  {demoEmail.split("@")[0]}
                </Button>
              ))}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
