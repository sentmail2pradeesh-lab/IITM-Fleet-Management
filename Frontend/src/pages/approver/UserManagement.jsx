import { useEffect, useState } from "react";
import { useContext } from "react";
import { createUser, deleteUser, listUsers, updateUser } from "../../api/userApi";
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
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "supervisor",
    driver_id_no: "",
    designation: DRIVER_DESIGNATIONS[0],
    password: ""
  });
  const [editSaving, setEditSaving] = useState(false);
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
      if (needsPassword && form.password.trim().length < 8) {
        setError("Supervisor temporary password must be at least 8 characters.");
        return;
      }
      const supPhone = String(form.phone || "").replace(/\D/g, "");
      if (!isDriver && supPhone && supPhone.length !== 10) {
        setError("Supervisor phone must be exactly 10 digits or left empty.");
        return;
      }
      const drvPhone = String(form.phone || "").replace(/\D/g, "");
      if (isDriver && drvPhone && drvPhone.length !== 10) {
        setError("Driver phone must be exactly 10 digits or left empty.");
        return;
      }
      await createUser({
        ...form,
        password: needsPassword ? form.password : undefined,
        email: isDriver ? undefined : form.email.trim().toLowerCase(),
        driver_id_no: isDriver ? form.driver_id_no.trim() : undefined,
        designation: isDriver ? form.designation : undefined,
        phone: isDriver
          ? drvPhone && drvPhone.length === 10
            ? drvPhone
            : undefined
          : supPhone && supPhone.length === 10
            ? supPhone
            : undefined
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

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      name: u.name || "",
      email: u.email || "",
      phone: u.phone ? String(u.phone).replace(/\D/g, "").slice(0, 10) : "",
      role: u.role === "driver" ? "driver" : "supervisor",
      driver_id_no: u.driver_id_no || "",
      designation: DRIVER_DESIGNATIONS.includes(u.designation)
        ? u.designation
        : DRIVER_DESIGNATIONS[0],
      password: ""
    });
  };

  const closeEdit = () => {
    if (!editSaving) {
      setEditUser(null);
    }
  };

  const saveEdit = async () => {
    if (!editUser) return;
    const name = String(editForm.name || "").trim();
    if (name.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    const phoneDigits = String(editForm.phone || "").replace(/\D/g, "");
    if (phoneDigits && phoneDigits.length !== 10) {
      setError("Phone must be exactly 10 digits or left empty.");
      return;
    }
    const pwd = String(editForm.password || "").trim();
    if (pwd && pwd.length < 8) {
      setError("New password must be at least 8 characters, or leave blank.");
      return;
    }
    if (editForm.role === "supervisor") {
      const em = String(editForm.email || "").trim().toLowerCase();
      if (!em) {
        setError("Supervisor email is required.");
        return;
      }
      if (!em.endsWith("@iitm.ac.in") && !em.endsWith("@smail.iitm.ac.in")) {
        setError("Supervisor must use an @iitm.ac.in or @smail.iitm.ac.in email.");
        return;
      }
    } else {
      if (!String(editForm.driver_id_no || "").trim()) {
        setError("Driver ID No is required.");
        return;
      }
    }
    if (editUser.role === "driver" && editForm.role === "supervisor" && !pwd) {
      setError("When changing a driver to supervisor, enter a new password (min 8 characters).");
      return;
    }

    setEditSaving(true);
    setError("");
    try {
      const payload = {
        name,
        role: editForm.role,
        phone: phoneDigits && phoneDigits.length === 10 ? phoneDigits : null
      };
      if (editForm.role === "supervisor") {
        payload.email = String(editForm.email || "").trim().toLowerCase();
      } else {
        payload.driver_id_no = String(editForm.driver_id_no || "").trim();
        payload.designation = editForm.designation;
      }
      if (pwd) {
        payload.password = pwd;
      }
      await updateUser(editUser.id, payload);
      setEditUser(null);
      await refresh();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Update failed");
    } finally {
      setEditSaving(false);
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
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
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
          ) : null}
          {isDriver ? (
            <input
              className="border rounded px-3 py-2"
              placeholder="Phone (10 digits)"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))
              }
            />
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
          <button className="md:col-span-2 lg:col-span-6 bg-blue-600 text-white rounded px-4 py-2">Create User</button>
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
              <div key={u.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                <div className="text-sm min-w-0">
                  <div className="font-medium text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-600 break-all">{u.email}</div>
                  {u.phone ? (
                    <div className="text-xs text-slate-500 mt-0.5">Phone: {u.phone}</div>
                  ) : (
                    <div className="text-xs text-amber-700 mt-0.5">Phone not set</div>
                  )}
                </div>
                {canManageUsers && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1 rounded text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busyUserId === u.id}
                      onClick={() => onDeleteUser(u.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs disabled:opacity-60"
                    >
                      {busyUserId === u.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
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
              <div key={u.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                <div className="text-sm min-w-0">
                  <div className="font-medium text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-600">
                    ID No: {u.driver_id_no || "-"} | {u.designation || "-"}
                  </div>
                  {u.phone ? (
                    <div className="text-xs text-slate-500 mt-0.5">Phone: {u.phone}</div>
                  ) : (
                    <div className="text-xs text-amber-700 mt-0.5">Phone not set</div>
                  )}
                </div>
                {canManageUsers && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1 rounded text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busyUserId === u.id}
                      onClick={() => onDeleteUser(u.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs disabled:opacity-60"
                    >
                      {busyUserId === u.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      {editUser && (
        <div
          className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => !editSaving && closeEdit()}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-5 my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-slate-900 mb-1">Edit user</h3>
            <p className="text-xs text-slate-500 mb-4">
              User #{editUser.id}. If you change role from driver to supervisor, set a new password. If you
              change supervisor to driver, password is optional (a random one is set server-side if empty).
            </p>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Name *</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Role *</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="supervisor">Supervisor</option>
                  <option value="driver">Driver</option>
                </select>
              </div>
              {editForm.role === "supervisor" ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    className="w-full border rounded px-3 py-2"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">ID No *</label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={editForm.driver_id_no}
                      onChange={(e) => setEditForm((f) => ({ ...f, driver_id_no: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Designation *</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={editForm.designation}
                      onChange={(e) => setEditForm((f) => ({ ...f, designation: e.target.value }))}
                    >
                      {DRIVER_DESIGNATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mobile (10 digits, optional)</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 10)
                    }))
                  }
                  placeholder="10-digit mobile"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  New password (optional, min 8 chars if set)
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="w-full border rounded px-3 py-2"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Leave blank to keep current password"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                disabled={editSaving}
                className="px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 text-sm"
                onClick={closeEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving}
                className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
                onClick={saveEdit}
              >
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
