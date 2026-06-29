// Послуги (як у боті). Назви й описи беремо через t(`service.${id}`) / `${id}desc`.
// Ціни — поки орієнтовні (плейсхолдери), уточнити в лікаря.
export const services = [
  { id: "s1", price: 600, durationMin: 30 },
  { id: "s2", price: 900, durationMin: 45 },
  { id: "s3", price: 1100, durationMin: 60 },
];

export const priceOf = (id) => services.find((s) => s.id === id).price;
