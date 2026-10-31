// Admin: all accounts (GET /api/users). Tap a name to see the profile; "New user" opens the create form.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { UserDrawer } from "@/components/user-drawer.tsx"
import { translateApiError } from "@/i18n/format.ts"
import type { Role, Supplier, User } from "@/lib/api-types.ts"
import { initials } from "@/lib/initials.ts"
import { useApi } from "@/lib/use-api.ts"
import { CreateUserDrawer } from "@/pages/admin/create-user-drawer.tsx"

const ROLE_BADGE: Record<Role, "default" | "secondary" | "outline"> = {
  admin: "default",
  project_manager: "secondary",
  purchasing: "secondary",
  consultant: "outline",
}

export function UsersPage() {
  const { t } = useTranslation()
  const users = useApi<User[]>("/users")
  const suppliers = useApi<Supplier[]>("/suppliers")
  const [selected, setSelected] = React.useState<User | null>(null)

  const supplierName = (id: number | null) => suppliers.data?.find((s) => s.id === id)?.name ?? null
  const error = users.error ?? suppliers.error

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">{t("users.description")}</p>
        <CreateUserDrawer suppliers={suppliers.data ?? []} onCreated={users.reload} />
      </div>

      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("users.loadFailed")}</AlertTitle>
          <AlertDescription>{translateApiError(error)}</AlertDescription>
        </Alert>
      )}

      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("users.name")}</TableHead>
                {/* On phones, email and company move under the name to avoid sideways scrolling. */}
                <TableHead className="hidden md:table-cell">{t("profile.email")}</TableHead>
                <TableHead>{t("profile.role")}</TableHead>
                <TableHead className="hidden pr-4 md:table-cell">{t("profile.company")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.loading &&
                Array.from({ length: 4 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4" colSpan={4}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {users.data?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="pl-4">
                    <Button
                      variant="ghost"
                      className="h-auto justify-start gap-3 px-1 py-1 text-left"
                      onClick={() => setSelected(user)}
                    >
                      <Avatar className="size-8">
                        <AvatarFallback>{initials(user.name)}</AvatarFallback>
                      </Avatar>
                      <span className="grid min-w-0">
                        <span className="truncate font-medium">{user.name}</span>
                        <span className="text-muted-foreground truncate text-xs md:hidden">
                          {user.email}
                          {user.supplierId !== null && ` · ${supplierName(user.supplierId) ?? ""}`}
                        </span>
                      </span>
                    </Button>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                  <TableCell className="pr-4 md:pr-2">
                    <Badge variant={ROLE_BADGE[user.role]}>{t(`roles.${user.role}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden pr-4 md:table-cell">
                    {supplierName(user.supplierId) ?? t("users.client")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserDrawer
        user={selected}
        supplierName={selected ? supplierName(selected.supplierId) : null}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  )
}
