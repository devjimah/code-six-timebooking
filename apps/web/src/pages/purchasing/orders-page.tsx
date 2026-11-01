// Purchasing: every order with its budget (GET /api/orders) – sums only, no single bookings
// (docs/roles-and-privacy.md). Tap an order to change it; "New order" places one.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { ChevronRight, CircleAlert, Plus } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Progress } from "@workspace/ui/components/progress"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { formatDate, formatEuroCents, formatHours, translateApiError } from "@/i18n/format.ts"
import type { OrderOverview, ProjectManager, Supplier } from "@/lib/api-types.ts"
import { useApi } from "@/lib/use-api.ts"
import { OrderDrawer } from "@/pages/purchasing/order-drawer.tsx"

export function OrdersPage() {
  const { t } = useTranslation()
  const orders = useApi<OrderOverview[]>("/orders")
  const suppliers = useApi<Supplier[]>("/suppliers")
  const projectManagers = useApi<ProjectManager[]>("/project-managers")
  const [editing, setEditing] = React.useState<OrderOverview | "new" | null>(null)

  const totals = (orders.data ?? []).reduce(
    (sum, o) => ({
      budget: sum.budget + o.budgetCents,
      booked: sum.booked + o.bookedCents,
      remaining: sum.remaining + o.remainingCents,
    }),
    { budget: 0, booked: 0, remaining: 0 },
  )
  const period = (o: OrderOverview) => `${formatDate(o.startDate)} – ${formatDate(o.endDate)}`
  const error = orders.error ?? suppliers.error ?? projectManagers.error

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">{t("orders.description")}</p>
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden />
          {t("orders.new")}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("orders.loadFailed")}</AlertTitle>
          <AlertDescription>{translateApiError(error)}</AlertDescription>
        </Alert>
      )}

      {/* Σ over all orders: what purchasing has bought, what is used, what is still free. */}
      {/* One row on every screen size; smaller figures on phones so three amounts fit side by side. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {(
          [
            ["orders.totalOrdered", totals.budget],
            ["orders.totalBooked", totals.booked],
            ["orders.totalRemaining", totals.remaining],
          ] as const
        ).map(([label, cents]) => (
          <Card key={label} className="gap-1 py-3 sm:py-4">
            <CardHeader className="px-3 sm:px-4">
              <CardDescription className="text-xs sm:text-sm">{t(label)}</CardDescription>
              <CardTitle className="text-sm tabular-nums sm:text-xl">
                {orders.loading ? <Skeleton className="h-7 w-28" /> : formatEuroCents(cents)}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("orders.order")}</TableHead>
                {/* On phones, supplier and period move under the order, so the budget stays visible. */}
                <TableHead className="hidden md:table-cell">{t("orders.supplier")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("orders.projectManager")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("orders.period")}</TableHead>
                <TableHead className="w-32 sm:w-48">{t("orders.used")}</TableHead>
                <TableHead className="w-0 pr-4">
                  <span className="sr-only">{t("orders.change")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.loading &&
                Array.from({ length: 3 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4" colSpan={6}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {orders.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    {t("orders.empty")}
                  </TableCell>
                </TableRow>
              )}
              {orders.data?.map((order) => (
                <TableRow key={order.orderId} className="cursor-pointer" onClick={() => setEditing(order)}>
                  <TableCell className="pl-4 whitespace-normal">
                    <span className="block font-mono text-xs">{order.code}</span>
                    <span className="block font-medium">{order.title}</span>
                    <span className="text-muted-foreground block text-xs md:hidden">
                      {order.supplierName} · {period(order)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{order.supplierName}</TableCell>
                  <TableCell className="hidden lg:table-cell">{order.projectManagerName}</TableCell>
                  <TableCell className="text-muted-foreground hidden whitespace-nowrap tabular-nums xl:table-cell">
                    {period(order)}
                  </TableCell>
                  <TableCell>
                    <div className="grid gap-1.5">
                      <Progress
                        value={Math.min(order.usedPercent, 100)}
                        aria-label={t("orders.usedOf", { percent: order.usedPercent, code: order.code })}
                      />
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {order.overBudget ? (
                          <Badge variant="destructive">{t("orders.overBudget")}</Badge>
                        ) : (
                          t("orders.left", { hours: formatHours(order.remainingHours * 60) })
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-4">
                    {/* The real control for keyboard and screen reader users; the row click is a shortcut. */}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("orders.edit", { code: order.code })}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditing(order)
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

      <OrderDrawer
        editing={editing}
        suppliers={suppliers.data ?? []}
        projectManagers={projectManagers.data ?? []}
        onClose={() => setEditing(null)}
        onSaved={orders.reload}
      />
    </>
  )
}
