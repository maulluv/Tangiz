// Виклики авторизації до бекенду. Повертають { token, user } (крім authMe → { user }).
import { apiGet, apiPost } from "@/lib/api";

export const authRegister = (body) => apiPost("/auth/register", body);
export const authLogin = (phone, password) => apiPost("/auth/login", { phone, password });
export const authOwnerLogin = (username, password) =>
  apiPost("/auth/owner-login", { username, password });
export const authMe = () => apiGet("/auth/me");
