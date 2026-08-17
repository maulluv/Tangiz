// Профіль клініки через API. GET — публічно; PATCH — лише власник (токен).
import { apiGet, apiPatch } from "@/lib/api";

export const getClinicProfile = () => apiGet("/clinic");
export const saveClinicProfile = (patch) => apiPatch("/clinic", patch);
