// The admin imports accounts from a CSV file, for moving from the old tool (POST /api/users/import). Each account passes
// the same rules as one made by hand; a refused line says why, and the others are created.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert, Upload } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
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
import { Textarea } from "@workspace/ui/components/textarea"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import type { UserImportResult } from "@/lib/api-types.ts"

type Props = {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export function UserImportDrawer({ open, onClose, onImported }: Props) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [csv, setCsv] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<UserImportResult | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  function close() {
    setCsv("")
    setPassword("")
    setError(null)
    setResult(null)
    onClose()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setResult(null)
    setSubmitting(true)
    try {
      const imported = await api<UserImportResult>("/users/import", { method: "POST", body: JSON.stringify({ csv, password }) })
      toast.success(t("users.importDone", { count: imported.created.length }))
      setResult(imported)
      onImported()
    } catch (caught) {
      setError(caught instanceof ApiError ? translateApiError(caught) : t("errors.INTERNAL_ERROR"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={(next) => !next && close()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("users.importTitle")}</DrawerTitle>
          <DrawerDescription>{t("users.importDescription")}</DrawerDescription>
        </DrawerHeader>
        <form id="user-import-form" onSubmit={handleSubmit} className="overflow-y-auto px-4 pb-2">
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {result && (
              <Alert variant={result.refused.length > 0 ? "destructive" : "default"} aria-live="polite">
                <Upload aria-hidden />
                <AlertTitle>{t("users.importResult", { created: result.created.length, refused: result.refused.length })}</AlertTitle>
                {result.refused.length > 0 && (
                  <AlertDescription>
                    <ul>
                      {result.refused.map((row) => (
                        <li key={row.line}>
                          {t("users.importLine", { line: row.line })}: {translateApiError(row)}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                )}
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="import-file">{t("users.importFile")}</FieldLabel>
              <Input
                id="import-file"
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) setCsv(await file.text())
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="import-csv">{t("users.importCsv")}</FieldLabel>
              <Textarea
                id="import-csv"
                required
                rows={6}
                className="font-mono text-xs"
                placeholder={"email;name;role;supplier;state\nnina@acme.example;Nina Neu;consultant;Acme Consulting GmbH;BY"}
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
              />
              <FieldDescription>{t("users.importHint")}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="import-password">{t("users.initialPassword")}</FieldLabel>
              <Input
                id="import-password"
                type="text"
                required
                minLength={10}
                maxLength={72}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldDescription>{t("users.importPasswordHint")}</FieldDescription>
            </Field>
          </FieldGroup>
        </form>
        <DrawerFooter>
          <Button type="submit" form="user-import-form" disabled={submitting}>
            <Upload aria-hidden />
            {t("users.importSubmit")}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">{t("users.cancel")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
