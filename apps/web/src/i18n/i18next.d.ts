// Makes translation keys type-checked: t("app.titel") is a compile error, t("app.title") is fine.
// German is the source of truth; en.json must have the same keys.
import "i18next"
import type de from "./locales/de.json"

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation"
    resources: { translation: typeof de }
  }
}
