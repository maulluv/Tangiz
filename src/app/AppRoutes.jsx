import { Routes, Route, Navigate } from "react-router-dom";
import { RequireOwner } from "@/features/auth";
import PublicLayout from "@/layouts/PublicLayout";
import AdminLayout from "@/layouts/AdminLayout";

import Landing from "@/pages/public/Landing";
import About from "@/pages/public/About";
import Services from "@/pages/public/Services";
import Reviews from "@/pages/public/Reviews";
import Booking from "@/pages/public/Booking";
import Login from "@/pages/public/Login";
import Cabinet from "@/pages/public/Cabinet";

import Dashboard from "@/pages/admin/Dashboard";
import Clients from "@/pages/admin/Clients";
import Appointments from "@/pages/admin/Appointments";
import Calendar from "@/pages/admin/Calendar";
import Settings from "@/pages/admin/Settings";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Публічна частина (USER) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cabinet" element={<Cabinet />} />
      </Route>

      {/* Старий шлях входу власника → загальна форма */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />

      {/* Адмінка (OWNER) — лише після входу */}
      <Route path="/admin" element={<RequireOwner />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
