// Project manager: the orders you are responsible for, with their budget (GET /api/orders/managed).
// Tap an order to see its budget in detail and check the work booked on it.
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router"
import { ChevronRight, CircleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Progress } from "@workspace/ui/components/progress"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { formatEuroCents, formatHours, translateApiError } from "@/i18n/format.ts"
import type { OrderBudget } from "@/lib/api-types.ts"
import { useApi } from "@/lib/use-api.ts"

export function MyOrdersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const orders = useApi<OrderBudget[]>("/orders/managed")

  return (
    <>
      <p className="text-muted-foreground text-sm">{t("myOrders.description")}</p>

      {orders.error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("orders.loadFailed")}</AlertTitle>
          <AlertDescription>{translateApiError(orders.error)}</AlertDescription>
        </Alert>
      )}

      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("orders.order")}</TableHead>
                <TableHead className="w-32 sm:w-48">{t("orders.used")}</TableHead>
                <TableHead className="hidden text-right md:table-cell">{t("orders.totalRemaining")}</TableHead>
                <TableHead className="w-0 pr-4">
                  <span className="sr-only">{t("myOrders.open")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.loading &&
                Array.from({ length: 3 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4" colSpan={4}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {orders.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                    {t("myOrders.empty")}
                  </TableCell>
                </TableRow>
              )}
              {orders.data?.map((order) => (
                <TableRow
                  key={order.orderId}
                  className="cursor-pointer"
                  onClick={() => void navigate(`/orders/${order.orderId}`)}
                >
                  <TableCell className="pl-4 whitespace-normal">
                    <span className="block font-mono text-xs">{order.code}</span>
                    <span className="block font-medium">{order.title}</span>
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
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {formatEuroCents(order.remainingCents)}
                  </TableCell>
                  <TableCell className="pr-4">
                    {/* The real link for keyboard and screen reader users; the row click is a shortcut. */}
                    <Button variant="ghost" size="icon" asChild>
                      <Link
                        to={`/orders/${order.orderId}`}
                        aria-label={t("myOrders.openNamed", { code: order.code })}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ChevronRight aria-hidden />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
