import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function RequireRole({ role }) {
  const { user } = useContext(AuthContext);

  if (!user?.token) return <Navigate to="/login" replace />;

  // Treat null/undefined role as "requester" (legacy users before role column)
  const effectiveRole = user?.role || "requester";

  const roles = Array.isArray(role) ? role : [role];
  if (role && !roles.includes(effectiveRole)) {
    const target =
      effectiveRole === "approver" || effectiveRole === "supervisor" || effectiveRole === "oic"
        ? "/approver"
        : effectiveRole === "guide_hod"
          ? "/guide/pending"
        : effectiveRole === "requester"
          ? "/home"
            : effectiveRole === "admin"
              ? "/admin/dashboard"
              : effectiveRole === "driver"
                ? "/driver/dashboard"
                : "/login";
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}

