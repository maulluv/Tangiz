const base = (p) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...p,
});

export const ChartIcon = (p) => (
  <svg {...base(p)}>
    <path d="M3 3v18h18" />
    <path d="M7 14l3-3 3 3 4-6" />
  </svg>
);

export const UsersIcon = (p) => (
  <svg {...base(p)}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const CalendarIcon = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const SettingsIcon = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

export const LogoutIcon = (p) => (
  <svg {...base(p)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export const PlusIcon = (p) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ListIcon = (p) => (
  <svg {...base(p)}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

export const ChevronLeftIcon = (p) => (
  <svg {...base(p)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const ChevronRightIcon = (p) => (
  <svg {...base(p)}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export const ArrowUpIcon = (p) => (
  <svg {...base(p)}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export const TelegramIcon = (p) => (
  <svg {...base(p)}>
    <path d="M21.5 4.5 2.5 12l6 2m13-9.5L18 20l-6-6m9.5-9.5L8.5 14" />
  </svg>
);

export const ToothIcon = (p) => (
  <svg {...base(p)}>
    <path d="M12 5.5c-1.5-1.5-3-2-4.5-2C5 3.5 3.5 5.5 3.5 8.5c0 2 .5 3.5 1 6s.5 6 2 6 1.5-3.5 2.5-5.5c.6-1.2 1.4-1.2 2 0 1 2 .5 5.5 2.5 5.5s1.5-3.5 2-6 1-4 1-6.5c0-3-1.5-5-4-5-1.5 0-3 .5-4.5 2Z" />
  </svg>
);

export const PhoneIcon = (p) => (
  <svg {...base(p)}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
  </svg>
);

export const ClockIcon = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const MedicalIcon = (p) => (
  <svg {...base(p)}>
    <path d="M9 3a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3a1 1 0 0 1 1 1v3a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-3a1 1 0 0 1-1-1V4a1 1 0 0 0-1-1Z" />
  </svg>
);

export const StarIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16} {...p}>
    <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.8 6.2 20.8l1.1-6.4-4.7-4.6 6.5-.9z" />
  </svg>
);

export const MenuIcon = (p) => (
  <svg {...base(p)}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

export const CloseIcon = (p) => (
  <svg {...base(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const InstagramIcon = (p) => (
  <svg {...base(p)}>
    <rect x="2" y="2" width="20" height="20" rx="5.5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const FacebookIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={20} height={20} {...p}>
    <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H17V3.6c-.3-.04-1.3-.13-2.46-.13-2.43 0-4.1 1.48-4.1 4.21v2.35H7.7V13h2.74v8h3.06z" />
  </svg>
);

export const YoutubeIcon = (p) => (
  <svg {...base(p)}>
    <rect x="2" y="5" width="20" height="14" rx="4" />
    <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
  </svg>
);

export const PlayIcon = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
  </svg>
);
