import { createContext, useMemo, useState } from "react";

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
  const next = {
    token,
    role: normalizeRole(data?.role ?? payload?.role),
    id: data?.id ?? payload?.id
  };
  setUser(next);
  sessionStorage.setItem("user", JSON.stringify(next));
};

const logout = () => {
  setUser(null);
  sessionStorage.removeItem("user");
};

const isAuthenticated = useMemo(() => Boolean(user?.token), [user?.token]);

return (

<AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
  {children}
</AuthContext.Provider>

);

};