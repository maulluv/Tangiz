import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TOKEN_KEY } from "@/lib/api";
import { authRegister, authLogin, authOwnerLogin, authMe } from "./authApi";

// Єдиний провайдер авторизації для клієнта І власника (розрізняємо за user.role).
// Сесія = JWT-токен (у localStorage) + об'єкт користувача.
const AuthContext = createContext(null);
const USER_KEY = "tangiz.session";

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  // Зберегти сесію після успішного логіну/реєстрації.
  function setSession({ token, user: u }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
    return u;
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  // Після перезавантаження: якщо є токен — звіряємо його з сервером і оновлюємо дані.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    authMe()
      .then(({ user: u }) => {
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        setUser(u);
      })
      .catch(() => signOut()); // токен протух/недійсний — виходимо
  }, []);

  const value = useMemo(() => {
    // Обгортка: викликає API, зберігає сесію, повертає { ok, error }.
    const attempt = (fn) => async (...args) => {
      try {
        setSession(await fn(...args));
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    };

    return {
      user,
      isOwner: user?.role === "owner",
      setSession,
      signOut,
      loginClient: attempt((phone, password) => authLogin(phone, password)),
      loginOwner: attempt((username, password) => authOwnerLogin(username, password)),
      registerClient: attempt((body) => authRegister(body)),
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Сумісний хук для адмін-частини (isOwner + вихід) — над тим самим контекстом.
export function useOwnerAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useOwnerAuth must be used within AuthProvider");
  return { isOwner: ctx.isOwner, signOut: ctx.signOut };
}
