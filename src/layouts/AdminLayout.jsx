import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarIcon,
  ChartIcon,
  ClockIcon,
  CloseIcon,
  InboxIcon,
  ListIcon,
  MedicalIcon,
  MenuIcon,
  ReviewIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
} from "@/components/icons";
import LanguageSwitch from "@/components/LanguageSwitch";
import { useClinic } from "@/features/clinic";
import { getAppointments, APPTS_CHANGED } from "@/features/admin";
import { useI18n } from "@/i18n";

// badge: "pending" — біля пункту показуємо кількість записів, що чекають лікаря.
const nav = [
  { to: "/admin", tKey: "nav.stats", icon: ChartIcon, end: true },
  { to: "/admin/pending", tKey: "nav.pending", icon: InboxIcon, end: false, badge: "pending" },
  { to: "/admin/appointments", tKey: "nav.appointments", icon: ListIcon, end: false },
  { to: "/admin/calendar", tKey: "nav.calendar", icon: CalendarIcon, end: false },
  { to: "/admin/availability", tKey: "nav.availability", icon: ClockIcon, end: false },
  { to: "/admin/clients", tKey: "nav.clients", icon: UsersIcon, end: false },
  { to: "/admin/reviews", tKey: "nav.reviews", icon: ReviewIcon, end: false },
];

// Як часто оновлюємо лічильник «Очікують» (нові записи приходять і з сайту, і з бота).
const BADGE_REFRESH_MS = 60_000;

const pageTitleKeys = {
  "/admin": "nav.stats",
  "/admin/clients": "nav.clients",
  "/admin/appointments": "nav.appointments",
  "/admin/pending": "nav.pending",
  "/admin/availability": "nav.availability",
  "/admin/calendar": "nav.calendar",
  "/admin/reviews": "nav.reviews",
  "/admin/settings": "nav.settings",
};

function SidebarContent({ onNavigate, badges = {} }) {
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
        {nav.map(({ to, tKey, icon: Icon, end, badge }) => (
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
            <span className="flex-1">{t(tKey)}</span>
            {badge && badges[badge] > 0 && (
              <span className="min-w-5 rounded-full bg-amber-500 px-1.5 text-center text-xs font-semibold leading-5 text-white">
                {badges[badge]}
              </span>
            )}
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
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Телефон: поле пошуку ховається за лупою й розгортається на всю шапку.
  const [searchOpen, setSearchOpen] = useState(false);
  const [badges, setBadges] = useState({});
  const title = t(pageTitleKeys[pathname] ?? "common.ownerCabinet");

  // Лічильник «Очікують»: при переході, одразу після зміни статусу
  // і раз на хвилину — нові записи приходять у будь-який момент.
  useEffect(() => {
    let alive = true;
    const load = () =>
      getAppointments()
        .then((list) => alive && setBadges({ pending: list.filter((a) => a.status === "pending").length }))
        .catch(() => {});
    load();
    const id = setInterval(load, BADGE_REFRESH_MS);
    window.addEventListener(APPTS_CHANGED, load); // лікар щойно змінив статус запису
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener(APPTS_CHANGED, load);
    };
  }, [pathname]);

  // Пошук у шапці веде в «Клієнти» з уже введеним запитом (там і контакти, і історія записів).
  function submitSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/admin/clients?q=${encodeURIComponent(q)}`);
    setQuery("");
    setSearchOpen(false);
  }

  return (
    <div className="flex h-screen bg-bg">
      {/* Sidebar — статична на десктопі (lg+) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <SidebarContent badges={badges} />
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
            <SidebarContent badges={badges} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
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
            <form onSubmit={submitSearch} role="search" className="relative hidden sm:block">
              <SearchIcon
                width={16}
                height={16}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("admin.searchPh")}
                aria-label={t("admin.searchPh")}
                className="h-9 w-48 rounded-lg border border-border bg-bg pl-8 pr-3 text-sm outline-none focus:border-brand-500 lg:w-64"
              />
            </form>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="grid size-9 place-items-center rounded-lg text-muted hover:bg-black/5 sm:hidden"
              aria-label={t("admin.searchPh")}
            >
              <SearchIcon width={20} height={20} />
            </button>
            <LanguageSwitch />
          </div>

          {/* Пошук на телефоні — поверх шапки */}
          {searchOpen && (
            <form
              onSubmit={submitSearch}
              role="search"
              className="absolute inset-0 z-10 flex items-center gap-2 bg-surface px-4 sm:hidden"
            >
              <SearchIcon width={18} height={18} className="shrink-0 text-muted" />
              {/* type="text": у search браузер додає свій хрестик — поруч із нашим «закрити» їх було б два */}
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
                placeholder={t("admin.searchPh")}
                aria-label={t("admin.searchPh")}
                enterKeyHint="search"
                className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-black/5"
                aria-label={t("common.close")}
              >
                <CloseIcon width={20} height={20} />
              </button>
            </form>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
