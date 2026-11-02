// Purchasing: framework agreements with what their orders take and what is left (GET /api/framework-agreements, ADR 0020).
// Sums only. The total is a hard limit: the server refuses an order beyond it.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert, Plus } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Progress } from "@workspace/ui/components/progress"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { formatDate, formatEuroCents, translateApiError } from "@/i18n/format.ts"
import type { FrameworkAgreement, Supplier } from "@/lib/api-types.ts"
import { useApi } from "@/lib/use-api.ts"
import { FrameworkAgreementDrawer } from "@/pages/purchasing/framework-agreement-drawer.tsx"

export function FrameworkAgreementsPage() {
  const { t } = useTranslation()
  const agreements = useApi<FrameworkAgreement[]>("/framework-agreements")
  const suppliers = useApi<Supplier[]>("/suppliers")
  const [editing, setEditing] = React.useState<FrameworkAgreement | "new" | null>(null)

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">{t("agreements.description")}</p>
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden />
          {t("agreements.new")}
        </Button>
      </div>

      {agreements.error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("agreements.loadFailed")}</AlertTitle>
          <AlertDescription>{translateApiError(agreements.error)}</AlertDescription>
        </Alert>
      )}
      {agreements.loading && <Skeleton className="h-32 w-full" />}
      {agreements.data?.length === 0 && <p className="text-muted-foreground text-sm">{t("agreements.empty")}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {agreements.data?.map((agreement) => (
          <Card key={agreement.id}>
            <CardHeader>
              <CardDescription className="font-mono text-xs">{agreement.code}</CardDescription>
              <CardTitle className="flex items-start justify-between gap-2 text-base">
                {agreement.title}
                <Button size="sm" variant="outline" onClick={() => setEditing(agreement)}>
                  {t("agreements.change")}
                </Button>
              </CardTitle>
              <CardDescription>
                {agreement.supplierName} · {formatDate(agreement.startDate)} – {formatDate(agreement.endDate)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Progress
                value={Math.min((agreement.orderedCents / agreement.totalBudgetCents) * 100, 100)}
                aria-label={t("agreements.free", { amount: formatEuroCents(agreement.freeCents) })}
              />
              <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {(
                  [
                    ["agreements.total", agreement.totalBudgetCents],
                    ["agreements.ordered", agreement.orderedCents],
                    ["agreements.booked", agreement.bookedCents],
                    ["agreements.left", agreement.freeCents],
                  ] as const
                ).map(([label, cents]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground text-xs">{t(label)}</dt>
                    <dd className="font-medium tabular-nums">{formatEuroCents(cents)}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-muted-foreground text-xs">{t("agreements.orderCount", { count: agreement.orderCount })}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <FrameworkAgreementDrawer
        editing={editing}
        suppliers={suppliers.data ?? []}
        onClose={() => setEditing(null)}
        onSaved={agreements.reload}
      />
    </>
  )
}
