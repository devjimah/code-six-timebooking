import { useTranslation } from "react-i18next"

import { Button } from "@workspace/ui/components/button"
import { LANGUAGES } from "@/i18n/index.ts"

// DE / EN toggle. The choice is remembered in localStorage by the language detector.
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <div role="group" aria-label={t("language.label")} className="flex gap-1">
      {LANGUAGES.map((lng) => {
        const active = i18n.resolvedLanguage === lng
        return (
          <Button
            key={lng}
            size="sm"
            variant={active ? "default" : "outline"}
            aria-pressed={active}
            title={t(`language.${lng}`)}
            onClick={() => void i18n.changeLanguage(lng)}
          >
            {lng.toUpperCase()}
          </Button>
        )
      })}
    </div>
  )
}
