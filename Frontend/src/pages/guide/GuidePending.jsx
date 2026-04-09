import { useEffect, useState } from "react";
import {
  guideApproveBooking,
  guideRejectBooking,
  listGuidePendingBookings
} from "../../api/bookingApi";

function formatDT(value) {
  try {
    return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return value;
  }
}

function toDocUrl(path) {
  if (!path) return "";
  if (String(path).startsWith("http")) return path;
  return `http://localhost:5000/${String(path).replace(/\\/g, "/")}`;
}

export default function GuidePending() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listGuidePendingBookings();
      setRows(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load guide approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onApprove = async (id) => {
    setBusyId(id);
    try {
      await guideApproveBooking(id);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || "Guide approval failed");
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (id) => {
    setBusyId(id);
    try {
      await guideRejectBooking(id);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || "Guide rejection failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="text-gray-900">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Guide / HoD Approvals</h1>
        <button
          onClick={refresh}
          className="bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-200 mb-4">{error}</p>}

      <div className="overflow-auto bg-gray-50 rounded-xl">
        <table className="w-full text-sm">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Requester</th>
              <th className="p-3">Vehicle</th>
              <th className="p-3">Start</th>
              <th className="p-3">End</th>
              <th className="p-3">Status</th>
              <th className="p-3">Document</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-gray-100">
                <td className="p-3">{b.id}</td>
                <td className="p-3">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-gray-600">{b.email}</div>
                </td>
                <td className="p-3">
                  {b.vehicle_type || `#${b.vehicle_id}`}
                </td>
                <td className="p-3">{formatDT(b.start_time)}</td>
                <td className="p-3">{formatDT(b.end_time)}</td>
                <td className="p-3">{b.status}</td>
                <td className="p-3">
                  {b.document_url ? (
                    <a
                      href={toDocUrl(b.document_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 underline"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="p-3">
                  {b.status === "Pending Guide Approval" ? (
                    <div className="flex gap-2">
                      <button
                        disabled={busyId === b.id}
                        onClick={() => onApprove(b.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        disabled={busyId === b.id}
                        onClick={() => onReject(b.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">Awaiting supervisor cancellation action</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="p-6 text-gray-600" colSpan={8}>
                  No pending approvals at Guide / HoD level.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

