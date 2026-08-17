import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { withDerived, CLINIC_BASE } from "./clinicStore";
import { getClinicProfile, saveClinicProfile } from "./clinicApi";

const ClinicContext = createContext(null);

export function ClinicProvider({ children }) {
  // До завантаження з сервера показуємо базовий профіль — тож useClinic() завжди валідний.
  const [clinic, setClinic] = useState(() => withDerived(CLINIC_BASE));

  useEffect(() => {
    getClinicProfile()
      .then((data) => setClinic(withDerived({ ...CLINIC_BASE, ...data })))
      .catch(() => {}); // немає звʼязку — лишаємо базовий профіль
  }, []);

  const value = useMemo(
    () => ({
      clinic,
      // Зберігає зміни на сервері (лише власник) і оновлює локальний стан.
      saveClinic: async (patch) => {
        const updated = await saveClinicProfile(patch);
        setClinic(withDerived({ ...CLINIC_BASE, ...updated }));
        return updated;
      },
    }),
    [clinic],
  );

  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>;
}

function useCtx() {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error("useClinic must be used within ClinicProvider");
  return ctx;
}

// Реактивний профіль клініки.
export function useClinic() {
  return useCtx().clinic;
}

// Збереження змін профілю (для Налаштувань).
export function useSaveClinic() {
  return useCtx().saveClinic;
}
