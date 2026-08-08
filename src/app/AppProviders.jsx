import { I18nProvider } from "@/i18n";
import { AuthProvider } from "@/features/auth";
import { ClinicProvider } from "@/features/clinic";

// Композиція глобальних провайдерів застосунку.
// AuthProvider — єдиний для клієнта й власника (розрізняємо за роллю).
export default function AppProviders({ children }) {
  return (
    <I18nProvider>
      <ClinicProvider>
        <AuthProvider>{children}</AuthProvider>
      </ClinicProvider>
    </I18nProvider>
  );
}
