import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import BookingStageTracker from "../../components/BookingStageTracker";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getMyBookings, requestCancellation } from "../../api/bookingApi";

function formatDT(value) {
  try {
    return new Date(value).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata"
    });
  } catch {
    return value || "-";
  }
}

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const hasRows = useMemo(() => bookings.length > 0, [bookings.length]);

  const refresh = () => {
    let mounted = true;
    setLoading(true);
    setInfo("");

    getMyBookings()
      .then((res) => {
        if (!mounted) return;
        setBookings(res.data || []);
      })
      .catch((e) => {
        if (!mounted) return;
        setBookings([]);
        setInfo(e?.response?.data?.message || "Failed to load your bookings");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  };

  useEffect(() => refresh(), []);

  const canCancel = (b) => {
    // Allow cancellation request before the trip starts (backend blocks after In Progress/Completed)
    return [
      "Pending Guide Approval",
      "Guide Approved",
      "Approved",
      "Assigned",
    ].includes(b.status);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <Navbar />

      <div className="h-[100px] bg-[#1a2a4a] relative overflow-hidden mt-[72px]">
        <div className="absolute inset-y-0 right-0 w-1/3 opacity-20 bg-[url('/bus.jpg')] bg-cover bg-center" />
        <div className="max-w-6xl mx-auto h-full px-6 flex items-center">
          <h1 className="text-white text-2xl font-semibold">My Requests</h1>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">
                My Requests
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                Track approval status, assigned driver, and any delay/issue
                updates.
              </p>
            </div>
            <button
              onClick={refresh}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded disabled:opacity-60"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <LoadingSpinner size={16} />
                  Refreshing...
                </span>
              ) : (
                "Refresh"
              )}
            </button>
          </div>

          {info && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 mb-6">
              {info}
            </div>
          )}

          {!loading && !info && bookings.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center text-slate-700 shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
              <div className="text-xl font-semibold mb-2">No requests yet</div>
              <div className="text-sm text-slate-500">
                Create a booking request from <b>Home</b>, and it will appear
                here.
              </div>
            </div>
          )}

          {hasRows && (
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
              <div className="overflow-auto">
                <table className="w-full text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr className="text-left">
                      <th className="p-4">Request</th>
                      <th className="p-4">Trip</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Issue / Delay</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b, idx) => (
                      <tr
                        key={b.id}
                        className={`border-t border-slate-100 ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="p-4">
                          <div className="font-semibold">
                            {b.vehicle_type || "Vehicle"}
                          </div>
                          <div className="text-slate-500 text-xs">
                            Request ID: {b.id}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-700">
                            {formatDT(b.start_time)} → {formatDT(b.end_time)}
                          </div>
                          <div className="text-slate-500 text-xs mt-1">
                            {b.pickup_location} → {b.drop_location}
                          </div>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="p-4 text-slate-700">
                          {b.issue_text ? (
                            <div>
                              <div className="font-medium text-orange-100">
                                {b.status === "Delayed"
                                  ? "Delayed"
                                  : "Issue reported"}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {b.issue_text}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => setSelected(b)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  {selected.vehicle_type || "Booking"} request
                </h2>
                <p className="text-sm text-gray-600">
                  Request ID: {selected.id}
                </p>
              </div>
              <div className="flex gap-2">
                {canCancel(selected) && (
                  <button
                    disabled={cancelLoading}
                    onClick={async () => {
                      const reason = window.prompt(
                        "Enter reason for cancellation (required):"
                      );
                      if (!reason || !reason.trim()) return;
                      try {
                        setCancelLoading(true);
                        await requestCancellation(selected.id, reason.trim());
                        alert(
                          "Cancellation request submitted and sent to approver."
                        );
                        setSelected(null);
                        refresh();
                      } catch (e) {
                        alert(
                          e?.response?.data?.message ||
                            "Failed to request cancellation"
                        );
                      } finally {
                        setCancelLoading(false);
                      }
                    }}
                  className="px-3 py-2 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 text-sm"
                  >
                    {cancelLoading ? "Requesting..." : "Request Cancellation"}
                  </button>
                )}
                <button
                  onClick={() => setSelected(null)}
                className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 text-sm">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="font-semibold mb-2">Trip</div>
                <div>
                  <b>Start:</b> {formatDT(selected.start_time)}
                </div>
                <div>
                  <b>End:</b> {formatDT(selected.end_time)}
                </div>
                <div className="mt-2">
                  <b>Pickup:</b> {selected.pickup_location}
                </div>
                <div>
                  <b>Drop:</b> {selected.drop_location}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="font-semibold mb-2">Status</div>
                <div className="mb-2">
                  <StatusBadge status={selected.status} />
                </div>
                <div className="mt-3">
                  <BookingStageTracker status={selected.status} />
                </div>
                <div>
                  <b>Passengers:</b> {selected.passenger_count ?? "-"}
                </div>
              </div>
            </div>

            {(selected.driver_name || selected.driver_phone) && (
              <div className="bg-gray-50 rounded-xl p-4 mt-4 text-sm">
                <div className="font-semibold mb-2">Assigned driver</div>
                <div>
                  <b>Name:</b> {selected.driver_name || "-"}
                </div>
                <div>
                  <b>Phone:</b> {selected.driver_phone || "-"}
                </div>
              </div>
            )}

            {selected.issue_text && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-4 text-sm">
                <div className="font-semibold mb-1 text-orange-900">
                  Issue / delay update
                </div>
                <div className="text-orange-900">{selected.issue_text}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

