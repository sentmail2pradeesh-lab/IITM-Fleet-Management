import { useEffect, useRef, useState } from "react";
import {
  addVehiclesBulk,
  deleteVehicle,
  listVehicles,
  setVehicleStatus,
  updateVehicle
} from "../../api/vehicleApi";

const VEHICLE_TYPES = [
  { value: "E-CART-AC",     label: "E-cart AC",    category: "CART" },
  { value: "E-CART-NON-AC", label: "E-cart Non-AC", category: "CART" },
  { value: "BUS-ELECTRIC",  label: "Bus Electric",  category: "BUS"  },
  { value: "BUS-DIESEL",    label: "Bus Diesel",    category: "BUS"  },
];

function apiImg(path) {
  if (!path) return null;
  if (String(path).startsWith("http")) return path;
  return `http://localhost:5000/${path}`;
}

export default function Vehicles() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [filterType, setFilterType] = useState(null);

  const [form, setForm] = useState({
    vehicle_type: "",
    passenger_capacity: "",
    count: 1,
    registration_number: "",
    registration_prefix: "",
    registration_numbers: [],
    condition_status: "Working"
  });
  const [images, setImages] = useState({ image1: null, image2: null, image3: null });
  const [submitting, setSubmitting] = useState(false);
  const fileRef1 = useRef(null);
  const fileRef2 = useRef(null);
  const fileRef3 = useRef(null);

  const [editVehicle, setEditVehicle] = useState(null);
  const [editForm, setEditForm] = useState({
    registration_number: "",
    vehicle_type: "",
    passenger_capacity: "",
    condition_status: ""
  });
  const [editImages, setEditImages] = useState({ image1: null, image2: null, image3: null });
  const editFileRef1 = useRef(null);
  const editFileRef2 = useRef(null);
  const editFileRef3 = useRef(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const filteredRows = filterType
    ? rows.filter((v) => v.vehicle_type === filterType)
    : [];

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listVehicles();
      setRows(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onTypeChange = (e) => {
    const val = e.target.value;
    setForm((f) => ({
      ...f,
      vehicle_type: val,
      passenger_capacity: "",
      registration_number: "",
      registration_prefix: "",
      registration_numbers: []
    }));
  };

  const isBusType = String(form.vehicle_type || "").startsWith("BUS-");
  const countValue = Math.max(1, parseInt(form.count, 10) || 1);

  const onCountChange = (value) => {
    const nextCount = Math.max(1, parseInt(value, 10) || 1);
    setForm((f) => {
      const existing = Array.isArray(f.registration_numbers) ? f.registration_numbers : [];
      const nextRegs = Array.from({ length: nextCount }, (_, i) => existing[i] || "");
      return {
        ...f,
        count: nextCount,
        registration_numbers: nextRegs
      };
    });
  };

  const onAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("vehicle_type", form.vehicle_type);
      fd.append("passenger_capacity", String(form.passenger_capacity));
      fd.append("count", String(countValue));
      fd.append("condition_status", form.condition_status || "Working");

      if (isBusType) {
        const regs = Array.from({ length: countValue }, (_, i) =>
          String(form.registration_numbers?.[i] || "").trim()
        );
        if (regs.some((r) => !r)) {
          setError("Enter all registration numbers for BUS vehicles.");
          setSubmitting(false);
          return;
        }
        fd.append("registration_numbers", JSON.stringify(regs));
      } else {
        // For cart types, auto-generate internal registration values.
        fd.append("registration_prefix", form.registration_prefix || form.vehicle_type || "CART");
      }
      if (images.image1) fd.append("image1", images.image1);
      if (images.image2) fd.append("image2", images.image2);
      if (images.image3) fd.append("image3", images.image3);

      await addVehiclesBulk(fd);
      setForm({
        vehicle_type: "",
        passenger_capacity: "",
        count: 1,
        registration_number: "",
        registration_prefix: "",
        registration_numbers: [],
        condition_status: "Working"
      });
      setImages({ image1: null, image2: null, image3: null });
      await refresh();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to add vehicles");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Delete this vehicle?")) return;
    setBusyId(id);
    setError("");
    try {
      await deleteVehicle(id);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const onStatus = async (id, status) => {
    setBusyId(id);
    setError("");
    try {
      await setVehicleStatus(id, status);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || "Status update failed");
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (v) => {
    setEditVehicle(v);
    setEditForm({
      registration_number: v.registration_number || "",
      vehicle_type: v.vehicle_type || "",
      passenger_capacity: String(v.passenger_capacity ?? ""),
      condition_status: v.condition_status || ""
    });
    setEditImages({ image1: null, image2: null, image3: null });
  };

  const onEditTypeChange = (e) => {
    const val = e.target.value;
    setEditForm((f) => ({
      ...f,
      vehicle_type: val
    }));
  };

  const onEditSubmit = async (e) => {
    e.preventDefault();
    if (!editVehicle) return;
    setEditSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("registration_number", editForm.registration_number);
      fd.append("vehicle_type", editForm.vehicle_type);
      fd.append("passenger_capacity", String(editForm.passenger_capacity));
      if (editForm.condition_status) fd.append("condition_status", editForm.condition_status);
      if (editImages.image1) fd.append("image1", editImages.image1);
      if (editImages.image2) fd.append("image2", editImages.image2);
      if (editImages.image3) fd.append("image3", editImages.image3);
      await updateVehicle(editVehicle.id, fd);
      setEditVehicle(null);
      await refresh();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to update vehicle");
    } finally {
      setEditSubmitting(false);
    }
  };

  const uniqueTypes = [...new Set(rows.map((v) => v.vehicle_type))].filter(Boolean).sort();
  const typeStats = uniqueTypes.map((type) => {
    const list = rows.filter((v) => v.vehicle_type === type);
    const total = list.length;
    const free = list.filter((v) => v.status === "Available").length;
    const booked = list.filter((v) => v.status === "Booked").length;
    return { type, total, free, booked };
  });

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Vehicle Management</h1>
        <button
          onClick={refresh}
          className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-red-200 mb-4">{error}</p>}

      <div className="bg-white/10 rounded-xl p-4 mb-6">
        <h2 className="font-semibold mb-3">Add vehicles</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-white/90 mb-1">Vehicle type *</label>
            <select
              value={form.vehicle_type}
              onChange={onTypeChange}
              className="w-full rounded px-3 py-2 text-black"
              required
            >
              <option value="">Select type</option>
              <optgroup label="CART">
                {VEHICLE_TYPES.filter((t) => t.category === "CART").map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="BUS">
                {VEHICLE_TYPES.filter((t) => t.category === "BUS").map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/90 mb-1">Capacity</label>
            <input
              type="number"
              min={1}
              value={form.passenger_capacity}
              onChange={(e) => setForm((f) => ({ ...f, passenger_capacity: e.target.value }))}
              className="w-full rounded px-3 py-2 text-black"
              placeholder="Enter capacity"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-white/90 mb-1">Vehicle count *</label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.count}
              onChange={(e) => onCountChange(e.target.value)}
              className="w-full rounded px-3 py-2 text-black"
              required
            />
          </div>

          {!isBusType && (
            <div>
              <label className="block text-sm text-white/90 mb-1">Registration prefix (optional)</label>
              <input
                value={form.registration_prefix}
                onChange={(e) => setForm((f) => ({ ...f, registration_prefix: e.target.value }))}
                className="w-full rounded px-3 py-2 text-black"
                placeholder={`e.g. ${form.vehicle_type || "TYPE"}`}
              />
              <span className="text-xs text-white/70">
                Cart vehicles do not require manual registration numbers.
              </span>
            </div>
          )}

          {isBusType && (
            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-sm text-white/90 mb-2">
                Registration numbers (required for BUS, one per vehicle)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {Array.from({ length: countValue }).map((_, idx) => (
                  <input
                    key={idx}
                    value={form.registration_numbers?.[idx] || ""}
                    onChange={(e) =>
                      setForm((f) => {
                        const regs = Array.from(
                          { length: countValue },
                          (__unused, i) => f.registration_numbers?.[i] || ""
                        );
                        regs[idx] = e.target.value;
                        return { ...f, registration_numbers: regs };
                      })
                    }
                    className="rounded px-3 py-2 text-black"
                    placeholder={`Registration #${idx + 1}`}
                    required
                  />
                ))}
              </div>
            </div>
          )}

          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-sm text-white/90 mb-1">Images (optional – upload once per type, applies to all vehicles in this batch)</label>
            <div className="flex flex-wrap gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm">Image {i}</span>
                  <div className="border border-white/30 rounded-lg bg-white/5 p-2 inline-flex items-center">
                    <input
                      ref={i === 1 ? fileRef1 : i === 2 ? fileRef2 : fileRef3}
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setImages((s) => ({ ...s, [`image${i}`]: e.target.files?.[0] || null }))
                      }
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => (i === 1 ? fileRef1 : i === 2 ? fileRef2 : fileRef3).current?.click()}
                      className="py-1.5 px-3 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm"
                    >
                      Choose
                    </button>
                    {images[`image${i}`] && (
                      <span className="ml-2 text-sm truncate max-w-[100px]">
                        {images[`image${i}`].name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-4">
            <button
              disabled={submitting || !form.vehicle_type}
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded disabled:opacity-60"
            >
              {submitting ? "Adding..." : `Add ${Number(form.count) || 1} vehicle(s)`}
            </button>
          </div>
        </form>
      </div>

      {typeStats.length > 0 && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {typeStats.map((s) => (
            <button
              key={s.type}
              type="button"
              onClick={() => setFilterType(s.type)}
              className={`text-left rounded-xl p-4 border transition ${
                filterType === s.type
                  ? "bg-blue-500/20 border-blue-300"
                  : "bg-white/10 border-white/20 hover:bg-white/15"
              }`}
            >
              <div className="font-semibold">{s.type}</div>
              <div className="text-sm text-white/80 mt-1">Total: {s.total}</div>
              <div className="text-sm text-green-200">Free to book: {s.free}</div>
              <div className="text-sm text-blue-200">Booked: {s.booked}</div>
            </button>
          ))}
        </div>
      )}

      {filterType && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-white/90">Filtering by:</span>
          <span className="font-medium">{filterType}</span>
          <button
            onClick={() => setFilterType(null)}
            className="text-blue-300 hover:underline text-sm"
          >
            Clear filter
          </button>
        </div>
      )}

      {!filterType && typeStats.length > 0 && (
        <p className="mb-4 text-white/80 text-sm">
          Click a vehicle type card to view detailed vehicle list below.
        </p>
      )}

      {loading && <p>Loading...</p>}

      {filterType && (
      <div className="overflow-auto bg-white/10 rounded-xl">
        <table className="w-full text-sm">
          <thead className="text-left bg-white/10">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Type</th>
              <th className="p-3">Capacity</th>
              <th className="p-3">Reg No</th>
              <th className="p-3">Status</th>
              <th className="p-3">Condition</th>
              <th className="p-3">Images</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((v) => (
              <tr key={v.id} className="border-t border-white/10">
                <td className="p-3">{v.id}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => setFilterType(v.vehicle_type)}
                    className="text-blue-300 hover:underline font-medium"
                  >
                    {v.vehicle_type}
                  </button>
                </td>
                <td className="p-3">{v.passenger_capacity}</td>
                <td className="p-3">{v.registration_number}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      v.status === "Available"
                        ? "bg-green-500/30"
                        : v.status === "Booked"
                          ? "bg-blue-500/30"
                          : "bg-yellow-500/30"
                    }`}
                  >
                    {v.status}
                  </span>
                </td>
                <td className="p-3">{v.condition_status || "-"}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {[apiImg(v.image1), apiImg(v.image2), apiImg(v.image3)]
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((src) => (
                        <img
                          key={src}
                          src={src}
                          className="w-10 h-10 rounded object-cover"
                          alt=""
                        />
                      ))}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busyId === v.id}
                      onClick={() => openEdit(v)}
                      className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      disabled={busyId === v.id}
                      onClick={() => onStatus(v.id, "Available")}
                      className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded disabled:opacity-60"
                    >
                      Set Available
                    </button>
                    <button
                      disabled={busyId === v.id}
                      onClick={() => onStatus(v.id, "Unavailable")}
                      className="bg-yellow-500 hover:bg-yellow-600 px-3 py-1 rounded disabled:opacity-60"
                    >
                      Set Unavailable
                    </button>
                    <button
                      disabled={busyId === v.id}
                      onClick={() => onDelete(v.id)}
                      className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td className="p-6 text-white/80" colSpan={8}>
                  {filterType ? `No vehicles of type ${filterType}.` : "No vehicles found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {editVehicle && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-6"
          onClick={() => setEditVehicle(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl text-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Edit vehicle #{editVehicle.id}</h2>
            <form onSubmit={onEditSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Registration number</label>
                <input
                  value={editForm.registration_number}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, registration_number: e.target.value }))
                  }
                  className="w-full border rounded px-3 py-2 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle type</label>
                <select
                  value={editForm.vehicle_type}
                  onChange={onEditTypeChange}
                  className="w-full border rounded px-3 py-2 text-gray-900"
                  required
                >
                  <option value="">Select type</option>
                  {editForm.vehicle_type &&
                    !VEHICLE_TYPES.some((t) => t.value === editForm.vehicle_type) && (
                    <option value={editForm.vehicle_type}>
                      {editForm.vehicle_type} (existing)
                    </option>
                  )}
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Capacity</label>
                <input
                  type="number"
                  min={1}
                  value={editForm.passenger_capacity}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, passenger_capacity: e.target.value }))
                  }
                  className="w-full border rounded px-3 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Condition</label>
                <input
                  value={editForm.condition_status}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, condition_status: e.target.value }))
                  }
                  className="w-full border rounded px-3 py-2 text-gray-900"
                  placeholder="e.g. Working, Under repair"
                />
              </div>
              <div className="text-sm text-gray-600">Images (optional – replace only if needed)</div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <span className="block text-xs font-medium mb-1">Image {i}</span>
                    <div className="border rounded p-2">
                      <input
                        ref={i === 1 ? editFileRef1 : i === 2 ? editFileRef2 : editFileRef3}
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setEditImages((s) => ({
                            ...s,
                            [`image${i}`]: e.target.files?.[0] || null
                          }))
                        }
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          (i === 1 ? editFileRef1 : i === 2 ? editFileRef2 : editFileRef3).current?.click()
                        }
                        className="py-1 px-2 rounded bg-blue-500 text-white text-xs"
                      >
                        Choose
                      </button>
                      {editImages[`image${i}`] && (
                        <span className="ml-1 text-xs truncate block">
                          {editImages[`image${i}`].name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditVehicle(null)}
                  className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60"
                >
                  {editSubmitting ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
