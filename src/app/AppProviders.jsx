import { I18nProvider } from "@/i18n";
import { AuthProvider, OwnerAuthProvider } from "@/features/auth";
import { ClinicProvider } from "@/features/clinic";

// Композиція глобальних провайдерів застосунку.
export default function AppProviders({ children }) {
  return (
    <I18nProvider>
      <ClinicProvider>
        <OwnerAuthProvider>
          <AuthProvider>{children}</AuthProvider>
        </OwnerAuthProvider>
      </ClinicProvider>
    </I18nProvider>
  );
}
