import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "@/components/ui";
import { useI18n } from "@/i18n";
import { useOwnerAuth } from "@/features/auth";
import { useClinic, useSaveClinic, CLINIC_FIELDS } from "@/features/clinic";

const inputCls =
  "mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-brand-500";

function Field({ label, value, onChange, hint, readOnly }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-muted">{label}</span>
      <input
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={`${inputCls} ${readOnly ? "cursor-not-allowed text-muted" : ""}`}
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export default function Settings() {
  const { t } = useI18n();
  const { signOut } = useOwnerAuth();
  const clinic = useClinic();
  const saveClinic = useSaveClinic();
  const navigate = useNavigate();

  const [form, setForm] = useState(() =>
    Object.fromEntries(CLINIC_FIELDS.map((f) => [f, clinic[f] ?? ""])),
  );
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = CLINIC_FIELDS.some((f) => (form[f] ?? "") !== (clinic[f] ?? ""));

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
    setSaved(false);
    setError(false);
  }

  function handleSave() {
    if (!form.name.trim() || !form.doctorName.trim()) {
      setError(true);
      return;
    }
    saveClinic({
      name: form.name.trim(),
      doctorName: form.doctorName.trim(),
      phone: form.phone.trim(),
      telegram: form.telegram.trim(),
      address: form.address.trim(),
    });
    setSaved(true);
  }

  function handleLogout() {
    signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-6">
        <h2 className="font-semibold">{t("settings.clinicProfile")}</h2>
        <p className="text-sm text-muted">{t("settings.profileHint")}</p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={t("settings.name")}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <Field
            label={t("settings.doctor")}
            value={form.doctorName}
            onChange={(e) => set("doctorName", e.target.value)}
          />
          <Field
            label={t("settings.specialty")}
            value={t("clinic.specialty")}
            hint={t("settings.specialtyHint")}
            readOnly
          />
          <Field
            label={t("settings.phone")}
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          <Field
            label={t("settings.bot")}
            value={form.telegram}
            onChange={(e) => set("telegram", e.target.value)}
          />
          <Field
            label={t("settings.address")}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>

        {error && (
          <p className="mt-4 text-sm text-danger">{t("settings.required")}</p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          {saved && !dirty && (
            <span className="text-sm font-medium text-emerald-600">
              {t("settings.saved")}
            </span>
          )}
          <Button onClick={handleSave} disabled={!dirty}>
            {t("settings.save")}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold">{t("settings.account")}</h2>
        <p className="text-sm text-muted">{t("settings.role")}</p>
        <div className="mt-4">
          <Button variant="outline" onClick={handleLogout}>
            {t("settings.logout")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
