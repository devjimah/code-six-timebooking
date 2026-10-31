// A short list of orders with their budget bar, for the home screens of project managers and purchasing.
// Built from shadcn parts only; the full tables live on the orders pages.
import type * as React from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Badge } from "@workspace/ui/components/badge"
import { Progress } from "@workspace/ui/components/progress"
import { formatHours } from "@/i18n/format.ts"

export type OrderProgressItem = {
  orderId: number
  code: string
  title: string
  usedPercent: number
  overBudget: boolean
  remainingHours: number
}

type Props = {
  orders: OrderProgressItem[]
  /** Where a tap leads; leave out for a plain list */
  linkTo?: (order: OrderProgressItem) => string
  /** Extra line under the title, e.g. the end date */
  note?: (order: OrderProgressItem) => React.ReactNode
  empty: string
}

export function OrderProgressList({ orders, linkTo, note, empty }: Props) {
  const { t } = useTranslation()
  if (orders.length === 0) return <p className="text-muted-foreground text-sm">{empty}</p>

  return (
    <ul className="grid gap-4">
      {orders.map((order) => {
        const title = (
          <span className="min-w-0">
            <span className="text-muted-foreground block font-mono text-xs">{order.code}</span>
            <span className="block font-medium">{order.title}</span>
            {note && <span className="text-muted-foreground block text-xs">{note(order)}</span>}
          </span>
        )
        return (
          <li key={order.orderId} className="grid gap-1.5 text-sm">
            <div className="flex items-start justify-between gap-3">
              {linkTo ? (
                <Link to={linkTo(order)} className="min-w-0 hover:underline">
                  {title}
                </Link>
              ) : (
                title
              )}
              {order.overBudget ? (
                <Badge variant="destructive">{t("orders.overBudget")}</Badge>
              ) : (
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {t("orders.left", { hours: formatHours(order.remainingHours * 60) })}
                </span>
              )}
            </div>
            <Progress
              value={Math.min(order.usedPercent, 100)}
              aria-label={t("orders.usedOf", { percent: order.usedPercent, code: order.code })}
            />
          </li>
        )
      })}
    </ul>
  )
}
