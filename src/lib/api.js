// Тонкий клієнт до бекенду. Усі запити йдуть на /api (у dev проксіюється Vite'ом
// до localhost:4000). Для прод-збірки можна перевизначити базу через VITE_API_URL.
const BASE = import.meta.env.VITE_API_URL || "/api";

// Ключ, під яким AuthProvider зберігає JWT (тримаємо тут, щоб не було циклічних імпортів).
export const TOKEN_KEY = "tangiz.token";

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    // Сервер віддає помилки як { error: "…" } — дістаємо повідомлення, якщо є.
    let message = `Помилка ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* тіло не JSON — лишаємо загальне повідомлення */
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const apiGet = (path) => request(path, { method: "GET" });
export const apiPost = (path, body) =>
  request(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiPatch = (path, body) =>
  request(path, { method: "PATCH", body: JSON.stringify(body) });
