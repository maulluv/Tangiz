import { createContext, useContext, useMemo, useState } from "react";
import { getClinic, saveClinic as persist } from "./clinicStore";

const ClinicContext = createContext(null);

export function ClinicProvider({ children }) {
  const [clinic, setClinic] = useState(getClinic);

  const value = useMemo(
    () => ({
      clinic,
      saveClinic: (patch) => setClinic(persist(patch)),
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
