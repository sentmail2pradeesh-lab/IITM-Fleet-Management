import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Footer from "./components/Footer";

import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";

import Home from "./pages/user/Home";
import VehicleSelection from "./pages/user/VehicleSelection";
import VehicleDetails from "./pages/user/VehicleDetails";
import BookingPage from "./pages/user/BookingPage";
import Dashboard from "./pages/user/Dashboard";
import GuideEmailAction from "./pages/guide/GuideEmailAction";

import RequireAuth from "./routes/RequireAuth";
import RequireRole from "./routes/RequireRole";
import ApproverLayout from "./pages/approver/ApproverLayout";
import PendingRequests from "./pages/approver/PendingRequests";
import Reports from "./pages/approver/Reports";
import AllBookings from "./pages/approver/AllBookings";
import Vehicles from "./pages/approver/Vehicles";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DriverDashboard from "./pages/driver/DriverDashboard";
import UserManagement from "./pages/approver/UserManagement";
import LocationManagement from "./pages/approver/LocationManagement";

function App() {
  const LocationAware = () => {
    const location = useLocation();
    const hideFooter = location.pathname === "/" || location.pathname === "/login";
    return (
      <>
        <div key={location.pathname} className="page-fade flex-1">
          <Routes>
          {/* Auth Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/guide/recommend" element={<GuideEmailAction />} />

          {/* Protected Routes */}
          <Route element={<RequireAuth />}>
            {/* Requester Routes */}
            <Route element={<RequireRole role="requester" />}>
              <Route path="/home" element={<Home />} />
              <Route path="/request" element={<BookingPage />} />
              <Route path="/vehicles" element={<VehicleSelection />} />
              <Route path="/vehicle/:id" element={<VehicleDetails />} />
              <Route path="/booking/:id" element={<BookingPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            {/* Approver Routes (Transport Supervisor) */}
            <Route element={<RequireRole role={["oic", "approver", "supervisor"]} />}>
              <Route element={<ApproverLayout />}>
                <Route path="/approver" element={<PendingRequests />} />
                <Route path="/approver/pending" element={<PendingRequests />} />
                <Route path="/approver/bookings" element={<AllBookings />} />
                <Route path="/approver/reports" element={<Reports />} />
                <Route element={<RequireRole role={["oic", "approver", "supervisor"]} />}>
                  <Route path="/approver/vehicles" element={<Vehicles />} />
                </Route>
                <Route element={<RequireRole role={["oic", "approver"]} />}>
                  <Route path="/approver/users" element={<UserManagement />} />
                  <Route path="/approver/locations" element={<LocationManagement />} />
                </Route>
              </Route>
            </Route>

            {/* Admin Dashboard */}
            <Route element={<RequireRole role="admin" />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>

            {/* Driver Dashboard */}
            <Route element={<RequireRole role="driver" />}>
              <Route path="/driver/dashboard" element={<DriverDashboard />} />
            </Route>
          </Route>
          </Routes>
        </div>
        {!hideFooter && <Footer />}
      </>
    );
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <LocationAware />
      </div>
    </BrowserRouter>
  );
}

export default App;