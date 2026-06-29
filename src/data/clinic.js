// Статичні дані клініки. Текст, що перекладається (спеціалізація, біо тощо),
// живе в src/i18n/translations.js.
export const CLINIC = {
  name: "TANGIZ",
  doctorName: "Тенгіз Дадвані",
  initials: "ТД",
  phone: "+380 67 123 45 67",
  telegram: "@Drdadvanibot",
  botUrl: "https://t.me/Drdadvanibot",
  address: "Київ",
};

// Соцмережі та месенджери лікаря.
export const SOCIALS = {
  telegram: CLINIC.botUrl,
  instagram: "https://www.instagram.com/dr.dadvani",
  facebook: "https://www.facebook.com/share/18S9GLk8BL/",
};

// Тимчасові креди власника (поки немає бека). Згодом — реальна авторизація.
export const OWNER_CREDENTIALS = {
  login: "admin",
  password: "admin",
};
