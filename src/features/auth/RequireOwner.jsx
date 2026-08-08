import { Navigate, Outlet } from "react-router-dom";
import { useOwnerAuth } from "./AuthProvider";

export default function RequireOwner() {
  const { isOwner } = useOwnerAuth();
  if (!isOwner) return <Navigate to="/login" replace />;
  return <Outlet />;
}
