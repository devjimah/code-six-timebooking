import { Trans, useTranslation } from "react-i18next"

import { LanguageSwitcher } from "@/components/language-switcher.tsx"
import { formatDate, formatEuroCents, formatHours } from "@/i18n/format.ts"

export function App() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-medium">{t("app.title")}</h1>
        <LanguageSwitcher />
      </header>
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <p>{t("app.tagline")}</p>
        {/* Placeholder until the booking screen exists: shows German formatting of the challenge's example hour. */}
        <p className="tabular-nums">
          {t("app.exampleBooking")}: {formatDate("2026-10-27")} · {formatHours(210)} · {formatEuroCents(36750)}
        </p>
        <div className="text-muted-foreground font-mono text-xs">
          <Trans i18nKey="app.darkModeHint" components={{ kbd: <kbd /> }} />
        </div>
      </div>
    </div>
  )
}
