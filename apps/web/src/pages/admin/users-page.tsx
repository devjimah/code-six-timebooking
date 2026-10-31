// Admin: all accounts (GET /api/users). Tap a name for the profile, with Edit and Deactivate / Reactivate.
// Accounts are never deleted: bookings and audit events keep pointing to the person (step 4).
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert, Pencil, UserCheck, UserPlus, UserX } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { useAuth } from "@/auth/auth-context.tsx"
import { UserDrawer } from "@/components/user-drawer.tsx"
import { translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import type { Role, Supplier, User } from "@/lib/api-types.ts"
import { initials } from "@/lib/initials.ts"
import { useApi } from "@/lib/use-api.ts"
import { UserFormDrawer } from "@/pages/admin/user-form-drawer.tsx"

const ROLE_BADGE: Record<Role, "default" | "secondary" | "outline"> = {
  admin: "default",
  project_manager: "secondary",
  purchasing: "secondary",
  consultant: "outline",
}

export function UsersPage() {
  const { t } = useTranslation()
  const { user: me } = useAuth()
  const users = useApi<User[]>("/users")
  const suppliers = useApi<Supplier[]>("/suppliers")
  const [selected, setSelected] = React.useState<User | null>(null)
  const [editing, setEditing] = React.useState<User | "new" | null>(null)

  const supplierName = (id: number | null) => suppliers.data?.find((s) => s.id === id)?.name ?? null
  const error = users.error ?? suppliers.error

  /** Deactivate or reactivate; the server checks the rules and answers with the updated account. */
  async function setActive(user: User, active: boolean) {
    try {
      const updated = await api<User>(`/users/${user.id}/${active ? "reactivate" : "deactivate"}`, { method: "POST" })
      toast.success(t(active ? "users.reactivated" : "users.deactivatedToast", { name: updated.name }))
      setSelected(updated)
      users.reload()
    } catch (caught) {
      toast.error(caught instanceof ApiError ? translateApiError(caught) : t("errors.INTERNAL_ERROR"))
    }
  }

  const isMe = selected?.id === me?.id

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">{t("users.description")}</p>
        <Button onClick={() => setEditing("new")}>
          <UserPlus aria-hidden />
          {t("users.new")}
        </Button>
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
              {users.data?.map((user) => {
                const inactive = user.deactivatedAt !== null
                return (
                  <TableRow key={user.id} className={inactive ? "text-muted-foreground" : undefined}>
                    <TableCell className="pl-4">
                      <Button
                        variant="ghost"
                        className="h-auto justify-start gap-3 px-1 py-1 text-left"
                        onClick={() => setSelected(user)}
                      >
                        <Avatar className={inactive ? "size-8 opacity-50" : "size-8"}>
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
                      <span className="flex flex-wrap gap-1">
                        <Badge variant={ROLE_BADGE[user.role]}>{t(`roles.${user.role}`)}</Badge>
                        {inactive && <Badge variant="outline">{t("users.deactivated")}</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden pr-4 md:table-cell">
                      {supplierName(user.supplierId) ?? t("users.client")}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserDrawer
        user={selected}
        supplierName={selected ? supplierName(selected.supplierId) : null}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        actions={
          selected && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(selected)
                  setSelected(null)
                }}
              >
                <Pencil aria-hidden />
                {t("users.editButton")}
              </Button>
              {selected.deactivatedAt !== null ? (
                <Button variant="outline" onClick={() => void setActive(selected, true)}>
                  <UserCheck aria-hidden />
                  {t("users.reactivate")}
                </Button>
              ) : (
                !isMe && (
                  // Deactivating is serious (the person is signed out at once), so it asks first.
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <UserX aria-hidden />
                        {t("users.deactivate")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("users.deactivateTitle", { name: selected.name })}</AlertDialogTitle>
                        <AlertDialogDescription>{t("users.deactivateDescription")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("users.cancel")}</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => void setActive(selected, false)}>
                          {t("users.deactivate")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )
              )}
            </>
          )
        }
      />

      <UserFormDrawer
        editing={editing}
        currentUserId={me?.id ?? 0}
        suppliers={suppliers.data ?? []}
        onClose={() => setEditing(null)}
        onSaved={users.reload}
      />
    </>
  )
}
