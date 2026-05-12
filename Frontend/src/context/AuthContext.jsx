import { createContext, useEffect, useMemo, useState } from "react";
import { getMe } from "../api/authApi";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeRole(rawRole) {
  if (rawRole === "approver") return "oic";
  return rawRole;
}

export const AuthProvider = ({ children }) => {

const [user, setUser] = useState(() => {
  try {
    // Clear old persistence format to avoid stale cross-user role/token pickup.
    localStorage.removeItem("user");
    return JSON.parse(sessionStorage.getItem("user"));
  } catch {
    return null;
  }
});

const login = (data) => {
  const token = data?.token;
  const payload = token ? decodeJwtPayload(token) : null;
  setUser((prev) => {
    const next = {
      token: data?.token ?? prev?.token,
      role: normalizeRole(data?.role ?? payload?.role ?? prev?.role),
      id: data?.id ?? payload?.id ?? prev?.id,
      name: data?.name ?? prev?.name,
      email: data?.email ?? prev?.email
    };
    sessionStorage.setItem("user", JSON.stringify(next));
    return next;
  });
};

const logout = () => {
  setUser(null);
  sessionStorage.removeItem("user");
};

const isAuthenticated = useMemo(() => Boolean(user?.token), [user?.token]);

useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const raw = sessionStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed?.token || parsed?.name) return;
      const res = await getMe();
      if (cancelled) return;
      const me = res.data || {};
      const next = {
        ...parsed,
        name: me.name,
        email: me.email,
        role: normalizeRole(me.role ?? parsed.role),
        id: me.id ?? parsed.id
      };
      setUser(next);
      sessionStorage.setItem("user", JSON.stringify(next));
    } catch {
      // ignore — token may be expired
    }
  })();
  return () => {
    cancelled = true;
  };
}, []);

return (

<AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
  {children}
</AuthContext.Provider>

);

};