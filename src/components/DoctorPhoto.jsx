import { useState } from "react";
import { useClinic } from "@/features/clinic";
import { useI18n } from "@/i18n";

// Картка має пропорції фото (2:3), тож object-cover заповнює її повністю —
// без обрізання й без смуг. Фолбек — ініціали, якщо файлу /doctor.jpg ще немає.
export default function DoctorPhoto() {
  const CLINIC = useClinic();
  const { lang } = useI18n();
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-brand-50 to-brand-100">
        <span className="text-5xl font-bold text-brand-500">
          {CLINIC.initials}
        </span>
      </div>
    );
  }

  return (
    <img
      src="/doctor.jpg"
      alt={lang === "en" ? CLINIC.doctorNameEn : CLINIC.doctorName}
      onError={() => setError(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
