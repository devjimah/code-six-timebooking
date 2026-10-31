import { useTranslation } from "react-i18next"

import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"
import { LANGUAGES } from "@/i18n/index.ts"

// DE / EN toggle. The choice is remembered in localStorage by the language detector.
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      aria-label={t("language.label")}
      value={i18n.resolvedLanguage}
      // Radix sends "" when the active item is clicked again; a language must always be selected.
      onValueChange={(lng) => lng && void i18n.changeLanguage(lng)}
    >
      {LANGUAGES.map((lng) => (
        <ToggleGroupItem key={lng} value={lng} aria-label={t(`language.${lng}`)} title={t(`language.${lng}`)}>
          {lng.toUpperCase()}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
