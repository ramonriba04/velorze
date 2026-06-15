import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import es from "./locales/es.json";
import en from "./locales/en.json";

// SSR-safe: always initialize with "es" so server and client first render match.
// Switch to the user's preferred language after hydration to avoid mismatches.
function detectClientLanguage(): "es" | "en" {
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
    lng: "es",
    fallbackLng: "es",
    supportedLngs: ["es", "en"],
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    react: { useSuspense: false },
  });

  if (typeof window !== "undefined") {
    // Defer language switch until after hydration to keep SSR markup stable.
    setTimeout(() => {
      const lng = detectClientLanguage();
      if (lng !== i18n.language) i18n.changeLanguage(lng);
    }, 0);
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
