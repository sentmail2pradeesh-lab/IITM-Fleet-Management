import { useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function NavItem({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded soft-transition ${
        active ? "bg-white/20" : "hover:bg-white/10"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const isAuthed = Boolean(user?.token);
  const isLoginPage = location.pathname === "/" || location.pathname === "/login";

  const shellClass = isLoginPage
    ? "bg-transparent border-transparent"
    : "bg-[#1a2a4a] border-b border-[#21385f]";

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className={shellClass}>
        <div className="px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <img src="/iitm-logo.png" className="w-8" alt="IITM" />
            <div className="leading-tight">
              <div className="font-semibold">IIT Madras</div>
              <div className="text-xs text-white/80">Fleet Booking Portal</div>
            </div>
          </div>

          {isAuthed && (
            <div className="hidden sm:flex items-center gap-2 text-sm">
              {user?.role === "approver" || user?.role === "supervisor" ? (
                <NavItem to="/approver">Supervisor</NavItem>
              ) : user?.role === "guide_hod" ? (
                <NavItem to="/guide/pending">Guide/HoD</NavItem>
              ) : user?.role === "admin" ? (
                <NavItem to="/admin/dashboard">Admin</NavItem>
              ) : user?.role === "driver" ? (
                <NavItem to="/driver/dashboard">Driver</NavItem>
              ) : (
                <>
                  <NavItem to="/home">Home</NavItem>
                  <NavItem to="/dashboard">My Requests</NavItem>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            {!isAuthed ? (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-sm soft-transition-long"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate("/register-type")}
                  className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded text-sm soft-transition-long"
                >
                  Register
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded text-sm soft-transition-long"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="h-[72px]" />
    </div>
  );
}

