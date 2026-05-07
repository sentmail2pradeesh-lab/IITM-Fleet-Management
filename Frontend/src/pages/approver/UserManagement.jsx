import { useEffect, useState } from "react";
import { useContext } from "react";
import { createUser, deleteUser, listUsers } from "../../api/userApi";
import { AuthContext } from "../../context/AuthContext";
import { useTwoStepConfirm } from "../../components/TwoStepConfirm";

const DRIVER_DESIGNATIONS = [
  "MOTORIST DRIVER GRADE 1",
  "MOTORIST DRIVER GRADE 2",
  "MOTORIST DRIVER GRADE 3",
  "MOTORIST DRIVER GRADE 4",
  "E-CART DRIVER"
];

export default function UserManagement() {
  const { user } = useContext(AuthContext);
  const role = user?.role === "approver" ? "oic" : user?.role;
  const canManageUsers = role === "oic";
  const [drivers, setDrivers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyUserId, setBusyUserId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    driver_id_no: "",
    designation: DRIVER_DESIGNATIONS[0],
    phone: "",
    role: "supervisor",
    password: ""
  });
  const needsPassword = form.role === "supervisor";
  const isDriver = form.role === "driver";
  const { confirm, dialog: confirmDialog } = useTwoStepConfirm();

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [driverRes, supRes] = await Promise.all([
        listUsers("driver"),
        listUsers("supervisor")
      ]);
      setDrivers(driverRes.data || []);
      setSupervisors(supRes.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createUser({
        ...form,
        password: needsPassword ? form.password : undefined,
        email: isDriver ? undefined : form.email.trim().toLowerCase(),
        driver_id_no: isDriver ? form.driver_id_no.trim() : undefined,
        designation: isDriver ? form.designation : undefined
      });
      setForm({
        name: "",
        email: "",
        driver_id_no: "",
        designation: DRIVER_DESIGNATIONS[0],
        phone: "",
        role: "supervisor",
        password: ""
      });
      await refresh();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to create user");
    }
  };

  const onDeleteUser = async (userId) => {
    if (!canManageUsers) return;
    const confirmed = await confirm({
      title: "Delete user",
      primaryMessage: "Delete this driver/supervisor?",
      secondaryMessage:
        "Final confirmation: this will permanently delete the user account.",
      confirmLabel: "Delete"
    });
    if (!confirmed) return;

    setBusyUserId(userId);
    setError("");
    try {
      await deleteUser(userId);
      await refresh();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Delete failed");
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="text-slate-800">
      {!canManageUsers && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 mb-4">
          Only Officer In-charge can add drivers and supervisors.
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">User Management (OIC)</h1>
        <button onClick={refresh} className="bg-[#1a2a4a] text-white px-4 py-2 rounded">
          Refresh
        </button>
      </div>
      {error && <p className="text-red-600 mb-3">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <h2 className="font-semibold mb-3">Add supervisor/driver</h2>
        {!canManageUsers ? (
          <p className="text-slate-600 text-sm">Read-only access.</p>
        ) : (
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          {isDriver ? (
            <input
              className="border rounded px-3 py-2"
              placeholder="ID No"
              value={form.driver_id_no}
              onChange={(e) => setForm((f) => ({ ...f, driver_id_no: e.target.value }))}
              required
            />
          ) : (
            <input
              className="border rounded px-3 py-2"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          )}
          {isDriver ? (
            <select
              className="border rounded px-3 py-2"
              value={form.designation}
              onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
            >
              {DRIVER_DESIGNATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="border rounded px-3 py-2"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          )}
          <select className="border rounded px-3 py-2" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="supervisor">Supervisor</option>
            <option value="driver">Driver</option>
          </select>
          {needsPassword && (
            <input
              className="border rounded px-3 py-2"
              placeholder="Temporary password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
          )}
          <button className="md:col-span-2 lg:col-span-5 bg-blue-600 text-white rounded px-4 py-2">Create User</button>
        </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold mb-2">Supervisors</h2>
          {loading ? (
            <p>Loading...</p>
          ) : supervisors.length === 0 ? (
            <p className="text-sm text-slate-600">No supervisors found.</p>
          ) : (
            supervisors.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 py-1">
                <div className="text-sm">
                  <div className="font-medium text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-600 break-all">{u.email}</div>
                </div>
                {canManageUsers && (
                  <button
                    type="button"
                    disabled={busyUserId === u.id}
                    onClick={() => onDeleteUser(u.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs disabled:opacity-60"
                  >
                    {busyUserId === u.id ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold mb-2">Drivers</h2>
          {loading ? (
            <p>Loading...</p>
          ) : drivers.length === 0 ? (
            <p className="text-sm text-slate-600">No drivers found.</p>
          ) : (
            drivers.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 py-1">
                <div className="text-sm">
                  <div className="font-medium text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-600">
                    ID No: {u.driver_id_no || "-"} | {u.designation || "-"}
                  </div>
                </div>
                {canManageUsers && (
                  <button
                    type="button"
                    disabled={busyUserId === u.id}
                    onClick={() => onDeleteUser(u.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs disabled:opacity-60"
                  >
                    {busyUserId === u.id ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}
