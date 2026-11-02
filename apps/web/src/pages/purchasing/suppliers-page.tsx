// Purchasing: the supplier companies orders are placed with (GET /api/suppliers). Tap one to rename it.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { Building2, ChevronRight, CircleAlert, Plus } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Progress } from "@workspace/ui/components/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { formatEuroCents, translateApiError } from "@/i18n/format.ts"
import type { Supplier, SupplierOverview } from "@/lib/api-types.ts"
import { useApi } from "@/lib/use-api.ts"
import { SupplierDrawer } from "@/pages/purchasing/supplier-drawer.tsx"

export function SuppliersPage() {
  const { t } = useTranslation()
  const suppliers = useApi<Supplier[]>("/suppliers")
  const overview = useApi<SupplierOverview[]>("/suppliers/overview")
  const shareOf = (id: number) => overview.data?.find((row) => row.supplierId === id)
  const [editing, setEditing] = React.useState<Supplier | "new" | null>(null)

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">{t("suppliers.description")}</p>
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden />
          {t("suppliers.new")}
        </Button>
      </div>

      {suppliers.error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("suppliers.loadFailed")}</AlertTitle>
          <AlertDescription>{translateApiError(suppliers.error)}</AlertDescription>
        </Alert>
      )}

      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("suppliers.name")}</TableHead>
                <TableHead className="hidden text-right md:table-cell">{t("suppliers.orders")}</TableHead>
                <TableHead className="hidden text-right md:table-cell">{t("suppliers.ordered")}</TableHead>
                <TableHead className="hidden text-right md:table-cell">{t("suppliers.booked")}</TableHead>
                <TableHead className="w-32 sm:w-48">{t("suppliers.share")}</TableHead>
                <TableHead className="w-0 pr-4">
                  <span className="sr-only">{t("suppliers.rename")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.loading &&
                Array.from({ length: 3 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4" colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {suppliers.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    {t("suppliers.empty")}
                  </TableCell>
                </TableRow>
              )}
              {suppliers.data?.map((supplier) => (
                <TableRow key={supplier.id} className="cursor-pointer" onClick={() => setEditing(supplier)}>
                  <TableCell className="pl-4">
                    <span className="flex items-center gap-3">
                      <Building2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
                      <span className="font-medium">{supplier.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">{shareOf(supplier.id)?.orderCount}</TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {formatEuroCents(shareOf(supplier.id)?.budgetCents ?? 0)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {formatEuroCents(shareOf(supplier.id)?.bookedCents ?? 0)}
                  </TableCell>
                  <TableCell>
                    <div className="grid gap-1">
                      <Progress
                        value={shareOf(supplier.id)?.sharePercent ?? 0}
                        aria-label={t("suppliers.shareOf", { percent: shareOf(supplier.id)?.sharePercent ?? 0, name: supplier.name })}
                      />
                      <span className="text-muted-foreground text-xs tabular-nums">{shareOf(supplier.id)?.sharePercent ?? 0} %</span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-4">
                    {/* The real control for keyboard and screen reader users; the row click is a shortcut. */}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("suppliers.renameNamed", { name: supplier.name })}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditing(supplier)
                      }}
                    >
                      <ChevronRight aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SupplierDrawer
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          suppliers.reload()
          overview.reload()
        }}
      />
    </>
  )
}
