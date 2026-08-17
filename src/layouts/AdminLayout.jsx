import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  CalendarIcon,
  ChartIcon,
  ClockIcon,
  CloseIcon,
  ListIcon,
  MedicalIcon,
  MenuIcon,
  SettingsIcon,
  UsersIcon,
} from "@/components/icons";
import LanguageSwitch from "@/components/LanguageSwitch";
import { useClinic } from "@/features/clinic";
import { useI18n } from "@/i18n";

const nav = [
  { to: "/admin", tKey: "nav.stats", icon: ChartIcon, end: true },
  { to: "/admin/clients", tKey: "nav.clients", icon: UsersIcon, end: false },
  { to: "/admin/appointments", tKey: "nav.appointments", icon: ListIcon, end: false },
  { to: "/admin/pending", tKey: "nav.pending", icon: ClockIcon, end: false },
  { to: "/admin/availability", tKey: "nav.availability", icon: CalendarIcon, end: false },
  { to: "/admin/calendar", tKey: "nav.calendar", icon: CalendarIcon, end: false },
];

const pageTitleKeys = {
  "/admin": "nav.stats",
  "/admin/clients": "nav.clients",
  "/admin/appointments": "nav.appointments",
  "/admin/pending": "nav.pending",
  "/admin/availability": "nav.availability",
  "/admin/calendar": "nav.calendar",
  "/admin/settings": "nav.settings",
};

function SidebarContent({ onNavigate }) {
  const { t } = useI18n();
  const CLINIC = useClinic();
  return (
    <>
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-5 py-5 transition-colors hover:bg-black/[0.03]"
        title={t("nav.home")}
      >
        <div className="grid size-9 place-items-center rounded-lg bg-brand-500 text-white">
          <MedicalIcon width={20} height={20} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{CLINIC.name}</div>
          <div className="text-xs text-muted">{t("common.ownerCabinet")}</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map(({ to, tKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-muted hover:bg-black/5 hover:text-ink"
              }`
            }
          >
            <Icon width={18} height={18} />
            {t(tKey)}
          </NavLink>
        ))}
      </nav>

      {/* Account — pinned at bottom */}
      <div className="border-t border-border p-3">
        <NavLink
          to="/admin/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg p-2 transition-colors ${
              isActive ? "bg-brand-50" : "hover:bg-black/5"
            }`
          }
        >
          <div className="grid size-9 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {CLINIC.initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">{CLINIC.doctorName}</div>
            <div className="truncate text-xs text-muted">{t("common.owner")}</div>
          </div>
          <SettingsIcon width={18} height={18} className="text-muted" />
        </NavLink>
      </div>
    </>
  );
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const title = t(pageTitleKeys[pathname] ?? "common.ownerCabinet");

  return (
    <div className="flex h-screen bg-bg">
      {/* Sidebar — статична на десктопі (lg+) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <SidebarContent />
      </aside>

      {/* Мобільне меню (drawer) */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-surface shadow-xl">
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-4 grid size-9 place-items-center rounded-lg text-muted hover:bg-black/5"
              aria-label={t("common.closeMenu")}
            >
              <CloseIcon width={20} height={20} />
            </button>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setMenuOpen(true)}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-black/5 lg:hidden"
              aria-label={t("common.openMenu")}
            >
              <MenuIcon width={22} height={22} />
            </button>
            <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input
              type="search"
              placeholder={t("common.search")}
              className="hidden h-9 w-40 rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-brand-500 sm:block lg:w-56"
            />
            <LanguageSwitch />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
