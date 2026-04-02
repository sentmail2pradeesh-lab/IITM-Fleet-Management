import { useEffect, useState } from "react";
import StatusBadge from "../../components/StatusBadge";
import { listAllBookings } from "../../api/bookingApi";

function formatDT(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AllBookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    status: "",
    vehicle_type: ""
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.status) params.status = filters.status;
      if (filters.vehicle_type) params.vehicle_type = filters.vehicle_type;

      const res = await listAllBookings(params);
      setRows(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="text-gray-900">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">All Bookings</h1>
        <button
          onClick={load}
          className="bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="datetime-local"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="rounded px-3 py-2 text-black"
            placeholder="From"
          />
          <input
            type="datetime-local"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="rounded px-3 py-2 text-black"
            placeholder="To"
          />
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value }))
            }
            className="rounded px-3 py-2 text-black"
          >
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Delayed">Delayed</option>
            <option value="Completed">Completed</option>
            <option value="Cancellation Requested">Cancellation Requested</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Rejected">Rejected</option>
          </select>
          <input
            value={filters.vehicle_type}
            onChange={(e) => setFilters((f) => ({ ...f, vehicle_type: e.target.value }))}
            className="rounded px-3 py-2 text-black"
            placeholder="Vehicle type (e.g. Bus)"
          />
        </div>
        <div className="mt-3">
          <button
            onClick={load}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
          >
            Apply filters
          </button>
        </div>
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
                  #{b.vehicle_id} {b.vehicle_type ? `(${b.vehicle_type})` : ""}
                </td>
                <td className="p-3">{formatDT(b.start_time)}</td>
                <td className="p-3">{formatDT(b.end_time)}</td>
                <td className="p-3">
                  <StatusBadge status={b.status} />
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="p-6 text-gray-600" colSpan={6}>
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

