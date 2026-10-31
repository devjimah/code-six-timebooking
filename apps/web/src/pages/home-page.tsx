// Placeholder after sign-in: shows who is signed in until the role screens (booking, budgets, users) exist.
import { useTranslation } from "react-i18next"
import { Clock } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { LanguageSwitcher } from "@/components/language-switcher.tsx"
import { ProfileDrawer } from "@/components/profile-drawer.tsx"
import type { CurrentUser } from "@/auth/auth-context.tsx"

export function HomePage({ user }: { user: CurrentUser }) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <div className="text-primary flex items-center gap-2 font-medium">
          <Clock className="size-5" aria-hidden />
          {t("app.title")}
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ProfileDrawer user={user} />
        </div>
      </header>
      <main className="p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t("home.welcome", { name: user.name })}</CardTitle>
            <CardDescription>
              {t("home.signedInAs", { email: user.email, role: t(`roles.${user.role}`) })}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  )
}
