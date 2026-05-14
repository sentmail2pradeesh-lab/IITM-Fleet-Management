import { useEffect, useState } from "react";
import { useContext } from "react";
import {
  createLocation,
  deleteLocation,
  listLocationsManage,
  updateLocation
} from "../../api/locationApi";
import { AuthContext } from "../../context/AuthContext";

export default function LocationManagement() {
  const { user } = useContext(AuthContext);
  const role = user?.role === "approver" ? "oic" : user?.role;
  const canEdit = role === "oic";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [busyId, setBusyId] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listLocationsManage();
      setRows(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onAdd = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setError("");
    const label = newLabel.trim();
    if (label.length < 2) {
      setError("Location name must be at least 2 characters.");
      return;
    }
    try {
      setBusyId(-1);
      await createLocation({ label });
      setNewLabel("");
      await refresh();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to add location");
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (row) => {
    if (!canEdit) return;
    setError("");
    try {
      setBusyId(row.id);
      await updateLocation(row.id, { active: !row.active });
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const saveLabel = async (row, label) => {
    if (!canEdit) return;
    const trimmed = String(label).trim();
    if (trimmed.length < 2) {
      setError("Location name must be at least 2 characters.");
      return;
    }
    setError("");
    try {
      setBusyId(row.id);
      await updateLocation(row.id, { label: trimmed });
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || "Rename failed");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (row) => {
    if (!canEdit) return;
    if (!window.confirm(`Permanently delete location "${row.label}"?`)) return;
    setError("");
    try {
      setBusyId(row.id);
      await deleteLocation(row.id);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900">Pickup / drop locations</h1>
      <p className="text-sm text-slate-600 mt-2">
        Locations listed here appear as dropdown choices on the vehicle request form. Requesters can only
        submit bookings when at least one active location exists for both pickup and drop.
      </p>

      {!canEdit && (
        <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Only the Officer In-charge can add, edit, or delete locations.
        </p>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {canEdit && (
        <form onSubmit={onAdd} className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1">New location</label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Main Gate, Ganga Hostel"
              className="w-full px-4 py-2 rounded border border-slate-200 text-black"
            />
          </div>
          <button
            type="submit"
            disabled={busyId === -1}
            className="h-[42px] px-5 rounded bg-[#1a2a4a] text-white text-sm font-medium hover:bg-[#243a63] disabled:opacity-60"
          >
            {busyId === -1 ? "Adding…" : "Add location"}
          </button>
        </form>
      )}

      <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-800">All locations</span>
          <button
            type="button"
            onClick={refresh}
            className="text-xs text-blue-700 hover:underline"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
        {loading && rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            No locations yet. Add at least one location before requesters can submit bookings.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <LocationRow
                key={row.id}
                row={row}
                canEdit={canEdit}
                busy={busyId === row.id}
                onToggle={() => toggleActive(row)}
                onSave={(label) => saveLabel(row, label)}
                onDelete={() => onDelete(row)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LocationRow({ row, canEdit, busy, onToggle, onSave, onDelete }) {
  const [draft, setDraft] = useState(row.label);

  useEffect(() => {
    setDraft(row.label);
  }, [row.label]);

  return (
    <li className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex-1 min-w-0">
        {canEdit ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 px-3 py-2 rounded border border-slate-200 text-black text-sm"
            />
            <button
              type="button"
              disabled={busy || draft.trim() === row.label}
              onClick={() => onSave(draft)}
              className="px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 text-sm text-slate-800 disabled:opacity-50"
            >
              Save name
            </button>
          </div>
        ) : (
          <div className="font-medium text-slate-900 truncate">{row.label}</div>
        )}
        <div className="text-xs text-slate-500 mt-1">
          {row.active ? <span className="text-emerald-700">Active</span> : <span>Inactive</span>}
          {row.sort_order != null && row.sort_order !== 0 && (
            <span className="ml-2">· sort {row.sort_order}</span>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={onToggle}
            className="px-3 py-1.5 rounded text-xs border border-slate-200 hover:bg-slate-50"
          >
            {row.active ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="px-3 py-1.5 rounded text-xs bg-red-50 text-red-800 border border-red-200 hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
