import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card } from "@/components/ui";
import { useAuth, useOwnerAuth, normalizeTg, verifyUser } from "@/features/auth";
import { useI18n } from "@/i18n";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { signIn: ownerSignIn } = useOwnerAuth();
  const { t } = useI18n();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // 1) Спершу пробуємо як власника
    if (ownerSignIn(login, password)) {
      navigate("/admin", { replace: true });
      return;
    }
    // 2) Інакше — клієнт за Telegram-ніком + паролем
    const u = verifyUser(login, password);
    if (u) {
      signIn({
        id: normalizeTg(u.telegram),
        name: u.name,
        phone: u.phone,
        telegram: u.telegram,
      });
      navigate("/cabinet", { replace: true });
      return;
    }
    setError(true);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">{t("login.title")}</h1>
      <p className="mt-2 text-muted">{t("login.subtitle")}</p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted">{t("login.loginField")}</label>
            <input
              required
              autoFocus
              value={login}
              onChange={(e) => {
                setLogin(e.target.value);
                setError(false);
              }}
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-brand-500"
              placeholder="@username"
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
                setError(false);
              }}
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-brand-500"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-danger">{t("login.error")}</p>
          )}

          <Button type="submit" className="w-full">
            {t("login.submit")}
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-sm text-muted">
        {t("login.noAccount")}{" "}
        <Link to="/booking" className="font-medium text-brand-700">
          {t("login.bookLink")}
        </Link>
      </p>
    </div>
  );
}
