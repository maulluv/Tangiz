import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { CloseIcon, MedicalIcon, MenuIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import LanguageSwitch from "@/components/LanguageSwitch";
import SocialLinks from "@/components/SocialLinks";
import { useClinic } from "@/features/clinic";
import { useAuth, useOwnerAuth } from "@/features/auth";
import { useI18n } from "@/i18n";

const navItems = [
  { to: "/", end: true, tKey: "nav.home" },
  { to: "/about", end: false, tKey: "nav.about" },
  { to: "/services", end: false, tKey: "nav.services" },
  { to: "/reviews", end: false, tKey: "nav.reviews" },
];

export default function PublicLayout() {
  const { user } = useAuth();
  const { isOwner } = useOwnerAuth();
  const { t } = useI18n();
  const CLINIC = useClinic();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkCls = ({ isActive }) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-brand-50 text-brand-700"
        : "text-muted hover:bg-black/5 hover:text-ink"
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="grid size-9 place-items-center rounded-full text-muted hover:bg-black/5 md:hidden"
              aria-label={t(menuOpen ? "common.closeMenu" : "common.openMenu")}
            >
              {menuOpen ? <CloseIcon width={22} height={22} /> : <MenuIcon width={22} height={22} />}
            </button>
            <Link to="/" className="flex shrink-0 items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-brand-500 text-white shadow-[var(--shadow-brand)]">
                <MedicalIcon width={20} height={20} />
              </div>
              <span className="hidden text-[17px] font-semibold tracking-tight sm:inline">
                {CLINIC.name}
              </span>
            </Link>
          </div>

          {/* Десктоп-навігація */}
          <nav className="hidden items-center gap-1 rounded-full border border-border bg-surface/70 p-1 shadow-[var(--shadow-soft)] md:flex">
            {navItems.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>
                {t(n.tKey)}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageSwitch />
            {!isOwner && (
              <Link to="/booking">
                <Button className="px-3 sm:px-5">
                  <span className="hidden sm:inline">{t("common.bookNow")}</span>
                  <span className="sm:hidden">{t("common.book")}</span>
                </Button>
              </Link>
            )}
            {isOwner ? (
              <Link to="/admin">
                <Button className="px-3 sm:px-4">{t("nav.admin")}</Button>
              </Link>
            ) : user ? (
              <Link to="/cabinet">
                <Button variant="outline" className="px-3 sm:px-4">
                  <span className="sm:hidden">{t("common.cabinetShort")}</span>
                  <span className="hidden sm:inline">{t("common.cabinet")}</span>
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="outline" className="px-3 sm:px-4">
                  {t("common.login")}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Мобільна навігація (випадайка) */}
        {menuOpen && (
          <nav className="border-t border-border bg-surface/95 px-4 py-2 backdrop-blur-xl md:hidden">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-muted hover:bg-black/5 hover:text-ink"
                  }`
                }
              >
                {t(n.tKey)}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:py-6">
          <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
            <span className="font-medium text-ink">{CLINIC.name}</span>
            <span aria-hidden="true" className="text-border">·</span>
            <span>{CLINIC.address}</span>
            <span aria-hidden="true" className="text-border">·</span>
            <a
              href={CLINIC.botUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-brand-700"
            >
              {CLINIC.telegram}
            </a>
          </span>
          <div className="flex items-center gap-2">
            <SocialLinks />
            {isOwner && (
              <Link
                to="/admin"
                className="ml-1 rounded-lg px-2 py-1 font-medium hover:text-brand-700"
              >
                {t("nav.admin")}
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
