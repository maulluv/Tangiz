import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { OWNER_CREDENTIALS } from "@/data";

const OwnerAuthContext = createContext(null);
const STORAGE_KEY = "tangiz.owner";

export function OwnerAuthProvider({ children }) {
  const [isOwner, setIsOwner] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "1",
  );

  useEffect(() => {
    if (isOwner) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  }, [isOwner]);

  const value = useMemo(
    () => ({
      isOwner,
      // Поки що — звірка з мок-кредами. Згодом замінимо на реальний бек.
      signIn: (login, password) => {
        const ok =
          login.trim() === OWNER_CREDENTIALS.login &&
          password === OWNER_CREDENTIALS.password;
        if (ok) setIsOwner(true);
        return ok;
      },
      signOut: () => setIsOwner(false),
    }),
    [isOwner],
  );

  return (
    <OwnerAuthContext.Provider value={value}>
      {children}
    </OwnerAuthContext.Provider>
  );
}

export function useOwnerAuth() {
  const ctx = useContext(OwnerAuthContext);
  if (!ctx) throw new Error("useOwnerAuth must be used within OwnerAuthProvider");
  return ctx;
}
