import { useContext } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

function NavLink({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`block px-3 py-2 rounded-md text-sm ${
        active ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
      }`}
    >
      {children}
    </Link>
  );
}

export default function ApproverLayout() {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <div className="min-h-screen flex flex-col">
        <div className="flex flex-1 min-h-0">
        {/* Left sidebar nav */}
        <aside className="w-64 bg-[#1a2a4a] border-r border-[#21385f] flex flex-col shrink-0 sidebar-slide-in">
          <div className="px-4 py-5 border-b border-[#2b4671]">
            <div className="text-xs text-white/70 uppercase tracking-wide">
              IIT Madras
            </div>
            <div className="text-lg font-semibold text-white">
                Transport Supervisor Panel
            </div>
          </div>

          <nav className="flex-1 px-3 pt-4 space-y-1 text-white">
            <div className="text-xs uppercase text-white/60 px-1 mb-1">
              Requests
            </div>
            <NavLink to="/approver/pending">Pending requests</NavLink>

            <div className="text-xs uppercase text-white/60 px-1 mt-4 mb-1">
              Fleet
            </div>
            <NavLink to="/approver/vehicles">Vehicles (add / manage)</NavLink>
            <NavLink to="/approver/bookings">All bookings</NavLink>

            <div className="text-xs uppercase text-white/60 px-1 mt-4 mb-1">
              Reports
            </div>
            <NavLink to="/approver/reports">Usage reports</NavLink>
          </nav>

          <div className="px-4 py-4 text-xs text-white/70 border-t border-[#2b4671] flex items-center justify-between gap-2">
            <span>IITM Fleet Booking</span>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-[11px]"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="h-[100px] bg-[#1a2a4a] relative overflow-hidden">
            <div className="absolute inset-y-0 right-0 w-1/3 opacity-20 bg-[url('/bus.jpg')] bg-cover bg-center" />
            <div className="h-full px-6 flex items-center">
              <h1 className="text-white text-2xl font-semibold">Transport Supervisor Dashboard</h1>
            </div>
          </div>
          <div className="p-6">
          <Outlet />
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
