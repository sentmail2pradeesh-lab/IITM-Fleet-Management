import { useEffect, useRef, useState } from "react";
import {
  addVehiclesBulk,
  deleteVehicle,
  listVehicles,
  setVehicleStatus,
  updateVehicle
} from "../../api/vehicleApi";

const VEHICLE_TYPES = [
  { value: "E-CART-AC",     label: "E-cart AC",      category: "CART" },
  { value: "E-CART-NON-AC", label: "E-cart Non-AC",  category: "CART" },
  { value: "BUS-ELECTRIC",  label: "Bus Electric",   category: "BUS"  },
  { value: "BUS-DIESEL",    label: "Bus Diesel",     category: "BUS"  },
];

function apiImg(path) {
  if (!path) return null;
  if (String(path).startsWith("http")) return path;
  return `http://localhost:5000/${path}`;
}

/* ── small reusable label ── */
function Label({ children }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1.5">{children}</label>;
}

/* ── shared input classes ── */
const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition";

export default function Vehicles() {
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [busyId,     setBusyId]     = useState(null);
  const [filterType, setFilterType] = useState(null);

  const [form, setForm] = useState({
    vehicle_type: "", passenger_capacity: "", count: 1,
    registration_prefix: "", registration_numbers: [], condition_status: "Working",
  });
  const [images,     setImages]     = useState({ image1: null, image2: null, image3: null });
  const [submitting, setSubmitting] = useState(false);
  const fileRef1 = useRef(null);
  const fileRef2 = useRef(null);
  const fileRef3 = useRef(null);

  const [editVehicle,    setEditVehicle]    = useState(null);
  const [editForm,       setEditForm]       = useState({ registration_number: "", vehicle_type: "", passenger_capacity: "", condition_status: "" });
  const [editImages,     setEditImages]     = useState({ image1: null, image2: null, image3: null });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const editFileRef1 = useRef(null);
  const editFileRef2 = useRef(null);
  const editFileRef3 = useRef(null);

  const filteredRows = filterType ? rows.filter((v) => v.vehicle_type === filterType) : [];

  const refresh = async () => {
    setLoading(true); setError("");
    try { const res = await listVehicles(); setRows(res.data); }
    catch (e) { setError(e?.response?.data?.message || "Failed to load vehicles"); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const isBusType  = String(form.vehicle_type || "").startsWith("BUS-");
  const countValue = Math.max(1, parseInt(form.count, 10) || 1);

  const onTypeChange = (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, vehicle_type: val, passenger_capacity: "", registration_prefix: "", registration_numbers: [] }));
  };

  const onCountChange = (value) => {
    const next = Math.max(1, parseInt(value, 10) || 1);
    setForm((f) => {
      const existing = Array.isArray(f.registration_numbers) ? f.registration_numbers : [];
      return { ...f, count: next, registration_numbers: Array.from({ length: next }, (_, i) => existing[i] || "") };
    });
  };

  const onAdd = async (e) => {
    e.preventDefault(); setSubmitting(true); setError("");
    try {
      const fd = new FormData();
      fd.append("vehicle_type",       form.vehicle_type);
      fd.append("passenger_capacity", String(form.passenger_capacity));
      fd.append("count",              String(countValue));
      fd.append("condition_status",   form.condition_status || "Working");
      if (isBusType) {
        const regs = Array.from({ length: countValue }, (_, i) => String(form.registration_numbers?.[i] || "").trim());
        if (regs.some((r) => !r)) { setError("Enter all registration numbers for BUS vehicles."); setSubmitting(false); return; }
        fd.append("registration_numbers", JSON.stringify(regs));
      } else {
        fd.append("registration_prefix", form.registration_prefix || form.vehicle_type || "CART");
      }
      if (images.image1) fd.append("image1", images.image1);
      if (images.image2) fd.append("image2", images.image2);
      if (images.image3) fd.append("image3", images.image3);
      await addVehiclesBulk(fd);
      setForm({ vehicle_type: "", passenger_capacity: "", count: 1, registration_prefix: "", registration_numbers: [], condition_status: "Working" });
      setImages({ image1: null, image2: null, image3: null });
      await refresh();
    } catch (e2) { setError(e2?.response?.data?.message || "Failed to add vehicles"); }
    finally { setSubmitting(false); }
  };

  const onDelete = async (id) => {
    if (!confirm("Delete this vehicle?")) return;
    setBusyId(id); setError("");
    try { await deleteVehicle(id); await refresh(); }
    catch (e) { setError(e?.response?.data?.message || "Delete failed"); }
    finally { setBusyId(null); }
  };

  const onStatus = async (id, status) => {
    setBusyId(id); setError("");
    try { await setVehicleStatus(id, status); await refresh(); }
    catch (e) { setError(e?.response?.data?.message || "Status update failed"); }
    finally { setBusyId(null); }
  };

  const openEdit = (v) => {
    setEditVehicle(v);
    setEditForm({ registration_number: v.registration_number || "", vehicle_type: v.vehicle_type || "", passenger_capacity: String(v.passenger_capacity ?? ""), condition_status: v.condition_status || "" });
    setEditImages({ image1: null, image2: null, image3: null });
  };

  const onEditSubmit = async (e) => {
    e.preventDefault(); if (!editVehicle) return;
    setEditSubmitting(true); setError("");
    try {
      const fd = new FormData();
      fd.append("registration_number", editForm.registration_number);
      fd.append("vehicle_type",        editForm.vehicle_type);
      fd.append("passenger_capacity",  String(editForm.passenger_capacity));
      if (editForm.condition_status) fd.append("condition_status", editForm.condition_status);
      if (editImages.image1) fd.append("image1", editImages.image1);
      if (editImages.image2) fd.append("image2", editImages.image2);
      if (editImages.image3) fd.append("image3", editImages.image3);
      await updateVehicle(editVehicle.id, fd);
      setEditVehicle(null); await refresh();
    } catch (e2) { setError(e2?.response?.data?.message || "Failed to update vehicle"); }
    finally { setEditSubmitting(false); }
  };

  const uniqueTypes = [...new Set(rows.map((v) => v.vehicle_type))].filter(Boolean).sort();
  const typeStats   = uniqueTypes.map((type) => {
    const list  = rows.filter((v) => v.vehicle_type === type);
    return { type, total: list.length, free: list.filter((v) => v.status === "Available").length, booked: list.filter((v) => v.status === "Booked").length };
  });

  return (
    <div className="text-gray-900">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Vehicle Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Add, edit, and manage fleet vehicles</p>
        </div>
        <button onClick={refresh} className="border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm transition">
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
      )}

      {/* ── Add vehicle form ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Add vehicles</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          <div>
            <Label>Vehicle type *</Label>
            <select value={form.vehicle_type} onChange={onTypeChange} className={inputCls} required>
              <option value="">Select type</option>
              <optgroup label="CART">
                {VEHICLE_TYPES.filter((t) => t.category === "CART").map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </optgroup>
              <optgroup label="BUS">
                {VEHICLE_TYPES.filter((t) => t.category === "BUS").map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <Label>Passenger capacity *</Label>
            <input type="number" min={1} value={form.passenger_capacity}
              onChange={(e) => setForm((f) => ({ ...f, passenger_capacity: e.target.value }))}
              className={inputCls} placeholder="Enter capacity" required />
          </div>

          <div>
            <Label>Vehicle count *</Label>
            <input type="number" min={1} max={100} value={form.count}
              onChange={(e) => onCountChange(e.target.value)}
              className={inputCls} required />
          </div>

          {!isBusType && (
            <div>
              <Label>Registration prefix (optional)</Label>
              <input value={form.registration_prefix}
                onChange={(e) => setForm((f) => ({ ...f, registration_prefix: e.target.value }))}
                className={inputCls} placeholder={`e.g. ${form.vehicle_type || "TYPE"}`} />
              <p className="text-xs text-gray-400 mt-1">Cart vehicles auto-generate registration IDs.</p>
            </div>
          )}

          {isBusType && (
            <div className="md:col-span-2 lg:col-span-4">
              <Label>Registration numbers (one per vehicle) *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {Array.from({ length: countValue }).map((_, idx) => (
                  <input key={idx}
                    value={form.registration_numbers?.[idx] || ""}
                    onChange={(e) => setForm((f) => {
                      const regs = Array.from({ length: countValue }, (__u, i) => f.registration_numbers?.[i] || "");
                      regs[idx] = e.target.value;
                      return { ...f, registration_numbers: regs };
                    })}
                    className={inputCls} placeholder={`Registration #${idx + 1}`} required />
                ))}
              </div>
            </div>
          )}

          {/* Image uploads */}
          <div className="md:col-span-2 lg:col-span-4">
            <Label>Vehicle images (optional — applies to all vehicles in this batch)</Label>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3].map((i) => {
                const ref = i === 1 ? fileRef1 : i === 2 ? fileRef2 : fileRef3;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <input ref={ref} type="file" accept="image/*"
                      onChange={(e) => setImages((s) => ({ ...s, [`image${i}`]: e.target.files?.[0] || null }))}
                      className="hidden" />
                    <button type="button" onClick={() => ref.current?.click()}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 transition">
                      {images[`image${i}`] ? (
                        <span className="text-green-700 font-medium truncate max-w-[120px] block">{images[`image${i}`].name}</span>
                      ) : `Choose image ${i}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-4">
            <button disabled={submitting || !form.vehicle_type}
              className="bg-[#185FA5] hover:bg-[#0f4a86] text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition">
              {submitting ? "Adding…" : `Add ${Number(form.count) || 1} vehicle(s)`}
            </button>
          </div>

        </form>
      </div>

      {/* ── Type stat cards ── */}
      {typeStats.length > 0 && (
        <>
          <p className="text-xs text-gray-500 mb-3">Click a type to view its vehicles below</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {typeStats.map((s) => (
              <button key={s.type} type="button" onClick={() => setFilterType(filterType === s.type ? null : s.type)}
                className={`text-left rounded-xl p-4 border transition ${
                  filterType === s.type
                    ? "bg-blue-50 border-blue-200 shadow-sm"
                    : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
                }`}>
                <div className="text-sm font-semibold text-gray-800">{s.type}</div>
                <div className="text-xs text-gray-500 mt-1">Total: {s.total}</div>
                <div className="text-xs text-green-700 mt-0.5">Free to book: {s.free}</div>
                <div className="text-xs text-blue-700 mt-0.5">Booked: {s.booked}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {filterType && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-gray-500">Showing:</span>
          <span className="font-medium text-gray-800">{filterType}</span>
          <button onClick={() => setFilterType(null)} className="text-blue-600 hover:underline text-xs">Clear</button>
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {/* ── Vehicle table ── */}
      {filterType && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Reg No</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3">Images</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRows.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-500 text-xs">{v.id}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setFilterType(v.vehicle_type)}
                        className="text-blue-600 hover:underline font-medium text-xs">
                        {v.vehicle_type}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{v.passenger_capacity}</td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{v.registration_number}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        v.status === "Available" ? "bg-green-50 text-green-700"
                        : v.status === "Booked"  ? "bg-blue-50 text-blue-700"
                        : "bg-amber-50 text-amber-700"
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{v.condition_status || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {[apiImg(v.image1), apiImg(v.image2), apiImg(v.image3)]
                          .filter(Boolean).slice(0, 3)
                          .map((src) => (
                            <img key={src} src={src} className="w-9 h-9 rounded-lg object-cover border border-gray-100" alt="" />
                          ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button disabled={busyId === v.id} onClick={() => openEdit(v)}
                          className="px-2.5 py-1 rounded-md text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 transition">
                          Edit
                        </button>
                        <button disabled={busyId === v.id} onClick={() => onStatus(v.id, "Available")}
                          className="px-2.5 py-1 rounded-md text-xs bg-green-50 hover:bg-green-100 text-green-700 disabled:opacity-50 transition">
                          Available
                        </button>
                        <button disabled={busyId === v.id} onClick={() => onStatus(v.id, "Unavailable")}
                          className="px-2.5 py-1 rounded-md text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 disabled:opacity-50 transition">
                          Unavailable
                        </button>
                        <button disabled={busyId === v.id} onClick={() => onDelete(v.id)}
                          className="px-2.5 py-1 rounded-md text-xs bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50 transition">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-gray-400 text-center text-sm" colSpan={8}>
                      No vehicles of type <span className="font-medium text-gray-600">{filterType}</span>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editVehicle && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-6"
          onClick={() => setEditVehicle(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit vehicle #{editVehicle.id}</h2>
            <form onSubmit={onEditSubmit} className="space-y-4">
              <div>
                <Label>Registration number</Label>
                <input value={editForm.registration_number}
                  onChange={(e) => setEditForm((f) => ({ ...f, registration_number: e.target.value }))}
                  className={inputCls} required />
              </div>
              <div>
                <Label>Vehicle type</Label>
                <select value={editForm.vehicle_type}
                  onChange={(e) => setEditForm((f) => ({ ...f, vehicle_type: e.target.value }))}
                  className={inputCls} required>
                  <option value="">Select type</option>
                  {editForm.vehicle_type && !VEHICLE_TYPES.some((t) => t.value === editForm.vehicle_type) && (
                    <option value={editForm.vehicle_type}>{editForm.vehicle_type} (existing)</option>
                  )}
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Passenger capacity</Label>
                <input type="number" min={1} value={editForm.passenger_capacity}
                  onChange={(e) => setEditForm((f) => ({ ...f, passenger_capacity: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <Label>Condition</Label>
                <input value={editForm.condition_status}
                  onChange={(e) => setEditForm((f) => ({ ...f, condition_status: e.target.value }))}
                  className={inputCls} placeholder="e.g. Working, Under repair" />
              </div>
              <div>
                <Label>Replace images (optional)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => {
                    const ref = i === 1 ? editFileRef1 : i === 2 ? editFileRef2 : editFileRef3;
                    return (
                      <div key={i}>
                        <input ref={ref} type="file" accept="image/*"
                          onChange={(e) => setEditImages((s) => ({ ...s, [`image${i}`]: e.target.files?.[0] || null }))}
                          className="hidden" />
                        <button type="button" onClick={() => ref.current?.click()}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition text-left truncate">
                          {editImages[`image${i}`] ? editImages[`image${i}`].name : `Image ${i}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditVehicle(null)}
                  className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-700 transition">
                  Cancel
                </button>
                <button type="submit" disabled={editSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#185FA5] hover:bg-[#0f4a86] text-white text-sm font-medium disabled:opacity-60 transition">
                  {editSubmitting ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
