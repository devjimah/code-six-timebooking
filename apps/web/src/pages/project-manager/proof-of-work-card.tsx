// One month of an order: the totals per status and the CSV download (GET /api/orders/:id/proof-of-work, ADR 0018).
import { useTranslation } from "react-i18next"
import { CircleAlert, Download } from "lucide-react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { formatEuroCents, formatHours, translateApiError } from "@/i18n/format.ts"
import type { ProofOfWork } from "@/lib/api-types.ts"
import { useApi } from "@/lib/use-api.ts"

type Props = {
  orderId: string
  month: string // "YYYY-MM"
}

export function ProofOfWorkCard({ orderId, month }: Props) {
  const { t } = useTranslation()
  const proof = useApi<ProofOfWork>(`/orders/${orderId}/proof-of-work?month=${month}`)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          {t("proof.title", { month })}
          <Button size="sm" variant="outline" asChild>
            <a href={`/api/orders/${orderId}/proof-of-work.csv?month=${month}`} download>
              <Download aria-hidden />
              {t("proof.download")}
            </a>
          </Button>
        </CardTitle>
        <CardDescription>{t("proof.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {proof.error && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{translateApiError(proof.error)}</AlertDescription>
          </Alert>
        )}
        {proof.loading && <Skeleton className="h-12 w-full" />}
        {proof.data && (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {(
              [
                ["proof.approved", formatHours(proof.data.approvedHours * 60)],
                ["proof.approvedMoney", formatEuroCents(proof.data.approvedCents)],
                ["proof.open", formatHours(proof.data.openHours * 60)],
                ["proof.returned", formatHours(proof.data.returnedHours * 60)],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground text-xs">{t(label)}</dt>
                <dd className="font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
