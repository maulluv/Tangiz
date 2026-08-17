import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/features/auth";
import { useI18n } from "@/i18n";

export default function Login() {
  const navigate = useNavigate();
  const { loginClient, loginOwner } = useAuth();
  const { t } = useI18n();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // "" | "creds" | "server"
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");

    // 1) Спершу пробуємо як власника (логін = username), потім як клієнта (логін = телефон).
    const asOwner = await loginOwner(login, password);
    if (asOwner.ok) {
      navigate("/admin", { replace: true });
      return;
    }
    const asClient = await loginClient(login, password);
    if (asClient.ok) {
      navigate("/cabinet", { replace: true });
      return;
    }
    // Обидві спроби невдалі. 0/5xx = сервер недоступний; інакше — невірні дані.
    const unreachable = [asOwner.status, asClient.status].some((s) => s === 0 || s >= 500);
    setError(unreachable ? "server" : "creds");
    setSubmitting(false);
  }

  const inputCls =
    "mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-100/70";

  return (
    <div className="mx-auto max-w-md px-6 py-16 sm:py-20">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          <span className="accent">{t("login.title")}</span>
        </h1>
        <p className="mt-2 text-muted">{t("login.subtitle")}</p>
      </div>

      <Card className="mt-8 p-6 sm:p-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted">{t("login.loginField")}</label>
            <input
              required
              autoFocus
              value={login}
              onChange={(e) => {
                setLogin(e.target.value);
                setError("");
              }}
              className={inputCls}
              placeholder="+380 67 123 45 67"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted">{t("login.password")}</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-danger">
              {error === "server" ? t("login.serverError") : t("login.error")}
            </p>
          )}

          <Button type="submit" className="w-full py-3" disabled={submitting}>
            {submitting ? t("reviews.submitting") : t("login.submit")}
          </Button>
        </form>
      </Card>

      <p className="mt-5 text-center text-sm text-muted">
        {t("login.noAccount")}{" "}
        <Link to="/booking" className="font-medium text-brand-700 hover:text-brand-600">
          {t("login.bookLink")}
        </Link>
      </p>
    </div>
  );
}
