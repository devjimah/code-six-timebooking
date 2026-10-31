// Internationalisation setup (ADR 0011). Imported once in main.tsx, before the app renders.
// German is the default and the fallback: if a key is missing in English, the German text is shown.
import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import de from "./locales/de.json"
import en from "./locales/en.json"

export const LANGUAGES = ["de", "en"] as const
export type Language = (typeof LANGUAGES)[number]

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { de: { translation: de }, en: { translation: en } },
    supportedLngs: LANGUAGES,
    // Accept "de-AT" or "en-US" from the browser and map them to "de" / "en".
    nonExplicitSupportedLngs: true,
    fallbackLng: "de",
    detection: {
      // A language the user picked wins over the browser setting. Stored as "i18nextLng".
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false, // React already escapes output
    },
  })

// Screen readers and the browser's spell checker read the page language from <html lang>.
const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng
}
syncHtmlLang(i18n.resolvedLanguage ?? "de")
i18n.on("languageChanged", () => syncHtmlLang(i18n.resolvedLanguage ?? "de"))

export default i18n
