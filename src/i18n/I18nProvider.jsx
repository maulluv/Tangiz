import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { translations } from "./translations";
import { setLocale } from "@/utils/format";

const I18nContext = createContext(null);
const STORAGE_KEY = "tangiz.lang";
const LOCALES = { uk: "uk-UA", en: "en-US" };

function initialLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "en" || saved === "uk" ? saved : "uk";
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(initialLang);

  // Тримаємо locale форматерів синхронним із мовою (потрібно вже на першому рендері)
  setLocale(LOCALES[lang]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key, params) => {
      let str = translations[lang]?.[key] ?? translations.uk[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(`{${k}}`, v);
        }
      }
      return str;
    },
    [lang],
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggle: () => setLang((l) => (l === "uk" ? "en" : "uk")),
      t,
    }),
    [lang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
