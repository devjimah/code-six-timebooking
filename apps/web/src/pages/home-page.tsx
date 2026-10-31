// Placeholder start screen for project managers and consultants until their screens exist.
import { useTranslation } from "react-i18next"

import { Card, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { useAuth } from "@/auth/auth-context.tsx"

export function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  if (!user) return null

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{t("home.welcome", { name: user.name })}</CardTitle>
        <CardDescription>{t("home.signedInAs", { email: user.email, role: t(`roles.${user.role}`) })}</CardDescription>
      </CardHeader>
    </Card>
  )
}
