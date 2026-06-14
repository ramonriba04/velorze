import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import es from "./locales/es.json";
import en from "./locales/en.json";

// SSR-safe: do NOT use i18next-browser-languagedetector (it touches window/document at module scope).
function detectInitialLanguage(): "es" | "en" {
  if (typeof window === "undefined") return "es";
  try {
    const stored = window.localStorage.getItem("capora_lang");
    if (stored === "es" || stored === "en") return stored;
  } catch {
    // ignore
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "";
  return nav.toLowerCase().startsWith("en") ? "en" : "es";
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    lng: detectInitialLanguage(),
    fallbackLng: "es",
    supportedLngs: ["es", "en"],
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    react: { useSuspense: false },
  });

  // Persist language changes on the client
  if (typeof window !== "undefined") {
    i18n.on("languageChanged", (lng) => {
      try {
        window.localStorage.setItem("capora_lang", lng);
      } catch {
        // ignore
      }
    });
  }
}

export default i18n;
