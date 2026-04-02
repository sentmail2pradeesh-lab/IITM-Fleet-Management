import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../../components/StatusBadge";
import {
  approveBooking,
  assignDriver,
  listPendingBookings,
  listUpcomingBookings,
  rejectBooking,
  reassignVehicle,
  reportIssue
} from "../../api/bookingApi";
import { getAvailableVehicles } from "../../api/vehicleApi";
import LoadingSpinner from "../../components/LoadingSpinner";
import SuccessCheck from "../../components/SuccessCheck";

function formatDT(value) {
  try {
    return new Date(value).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata"
    });
  } catch {
    return value;
  }
}

export default function PendingRequests() {
  const [pendingRows, setPendingRows] = useState([]);
  const [upcomingRows, setUpcomingRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [assignBooking, setAssignBooking] = useState(null);
  const [assignName, setAssignName] = useState("");
  const [assignPhone, setAssignPhone] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const [reassignBooking, setReassignBooking] = useState(null);
  const [reassignVehicles, setReassignVehicles] = useState([]);
  const [reassignSelected, setReassignSelected] = useState(null);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignError, setReassignError] = useState("");

  const [reportIssueBooking, setReportIssueBooking] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [markUnavailable, setMarkUnavailable] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const pending = useMemo(() => pendingRows, [pendingRows]);
  const upcoming = useMemo(() => upcomingRows, [upcomingRows]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [pendingRes, upcomingRes] = await Promise.all([
        listPendingBookings(),
        listUpcomingBookings()
      ]);
      setPendingRows(pendingRes.data || []);
      setUpcomingRows(upcomingRes.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const onApprove = async (bookingId) => {
    setBusyId(bookingId);
    setError("");
    try {
      await approveBooking(bookingId);
      setActionSuccess("Approved");
      setTimeout(() => setActionSuccess(null), 350);
      await refresh();
      alert("Approved. Now assign a driver.");
    } catch (e) {
      setError(e?.response?.data?.message || "Approve failed");
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (bookingId) => {
    setBusyId(bookingId);
    setError("");
    try {
      await rejectBooking(bookingId);
      setActionSuccess("Updated");
      setTimeout(() => setActionSuccess(null), 350);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || "Reject failed");
    } finally {
      setBusyId(null);
    }
  };

  const openAssignModal = (booking) => {
    setAssignBooking(booking);
    setAssignName("");
    setAssignPhone("");
  };

  const submitAssign = async () => {
    if (!assignBooking) return;
    if (!assignName.trim() || !assignPhone.trim()) {
      alert("Driver name and phone are required.");
      return;
    }
    setAssignSubmitting(true);
    setError("");
    try {
      await assignDriver(assignBooking.id, {
        driver_name: assignName.trim(),
        driver_phone: assignPhone.trim()
      });
      setActionSuccess("Driver assigned");
      setTimeout(() => setActionSuccess(null), 350);
      await refresh();
      alert("Driver assigned. WhatsApp message should be sent by backend.");
      setAssignBooking(null);
    } catch (e) {
      setError(e?.response?.data?.message || "Assign driver failed");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const openReassignModal = async (booking) => {
    const startDate = booking?.start_time
      ? new Date(booking.start_time).toISOString().slice(0, 10)
      : null;
    if (!startDate) {
      alert("Missing start_time; cannot compute date.");
      return;
    }

    setReassignBooking(booking);
    setReassignVehicles([]);
    setReassignSelected(null);
    setReassignError("");
    setReassignLoading(true);
    try {
      const res = await getAvailableVehicles(startDate);
      setReassignVehicles(res.data || []);
      if (!res.data || res.data.length === 0) {
        setReassignError("No available vehicles found for that date.");
      }
    } catch (e) {
      setReassignError(e?.response?.data?.message || "Failed to load vehicles");
    } finally {
      setReassignLoading(false);
    }
  };

  const submitReassign = async () => {
    if (!reassignBooking || !reassignSelected) {
      alert("Select a vehicle to reassign.");
      return;
    }
    setBusyId(reassignBooking.id);
    setError("");
    try {
      await reassignVehicle(reassignBooking.id, {
        vehicle_id: reassignSelected
      });
      await refresh();
      alert("Vehicle reassigned. Backend should email updated details.");
      setReassignBooking(null);
    } catch (e) {
      setError(e?.response?.data?.message || "Reassign failed");
    } finally {
      setBusyId(null);
    }
  };

  const submitReportIssue = async () => {
    if (!reportIssueBooking || !reportReason.trim()) {
      alert("Please enter a reason for the issue.");
      return;
    }
    setReportSubmitting(true);
    setError("");
    try {
      const res = await reportIssue(reportIssueBooking.id, {
        reason: reportReason.trim(),
        mark_unavailable: markUnavailable
      });
      await refresh();
      alert("Issue reported. Booking cancelled and requester notified by email.");
      setReportIssueBooking(null);
      setReportReason("");
      setMarkUnavailable(false);
    } catch (e) {
      setError(e?.response?.data?.message || "Report issue failed");
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <div className="text-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Transport Supervisor Dashboard</h1>
        <button
          onClick={refresh}
          className="bg-[#1a2a4a] hover:bg-[#21385f] text-white px-4 py-2 rounded soft-transition-long"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-600 mb-3">
          <LoadingSpinner size={18} />
          <span>Loading...</span>
        </div>
      )}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {actionSuccess && (
        <div className="mb-4">
          <SuccessCheck text={actionSuccess} />
        </div>
      )}

      <h2 className="text-lg font-semibold mb-2">Pending Requests</h2>
      <div className="overflow-auto bg-white rounded-xl border border-slate-200 shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
        <table className="w-full text-sm">
          <thead className="text-left bg-slate-50">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Requester</th>
              <th className="p-3">Vehicle</th>
              <th className="p-3">Start</th>
              <th className="p-3">End</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((b) => {
              const isCancellation = b.status === "Cancellation Requested";
              const canApproveStage3 = b.status === "Guide Approved";
              const canAssignDriver = b.status === "Approved";
              return (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="p-3">{b.id}</td>
                  <td className="p-3">
                    <div className="font-medium">{b.name}</div>
                    <div className="text-slate-500">{b.email}</div>
                  </td>
                  <td className="p-3">
                    {b.vehicle_type || `#${b.vehicle_id}`}
                    <div className="text-slate-500 text-xs">
                      Pickup: {b.pickup_location}
                    </div>
                    {b.status === "Cancellation Requested" && b.cancellation_reason && (
                      <div className="text-amber-200 text-xs mt-1">
                        Cancellation reason: {b.cancellation_reason}
                      </div>
                    )}
                  </td>
                  <td className="p-3">{formatDT(b.start_time)}</td>
                  <td className="p-3">{formatDT(b.end_time)}</td>
                  <td className="p-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {canApproveStage3 && (
                        <>
                          <button
                            disabled={busyId === b.id}
                            onClick={() => onApprove(b.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded disabled:opacity-60 soft-transition-long"
                          >
                            Approve & Assign Vehicle
                          </button>
                          <button
                            disabled={busyId === b.id}
                            onClick={() => onReject(b.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded disabled:opacity-60 soft-transition-long"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {canAssignDriver && (
                        <button
                          disabled={busyId === b.id}
                          onClick={() => openAssignModal(b)}
                          className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-60 soft-transition-long"
                        >
                          Assign Driver
                        </button>
                      )}

                      {isCancellation && (
                        <button
                          disabled={busyId === b.id}
                          onClick={() => {
                            const reasonMsg = b.cancellation_reason
                              ? `Cancellation reason:\n${b.cancellation_reason}\n\nApprove cancellation?`
                              : "Approve cancellation?";
                            const ok = window.confirm(reasonMsg);
                            if (ok) onReject(b.id);
                          }}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded disabled:opacity-60 soft-transition-long"
                        >
                          Approve cancellation
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && pending.length === 0 && (
              <tr>
                <td className="p-6 text-slate-500" colSpan={7}>
                  No pending requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold mt-8 mb-2">Upcoming Trips</h2>
      <div className="overflow-auto bg-white rounded-xl border border-slate-200 shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
        <table className="w-full text-sm">
          <thead className="text-left bg-slate-50">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Requester</th>
              <th className="p-3">Vehicle</th>
              <th className="p-3">Start</th>
              <th className="p-3">End</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((b) => {
              const canReassignVehicle =
                b.status === "Assigned" || b.status === "Delayed";
              const canReportIssue =
                b.status === "Assigned" || b.status === "Delayed";
              return (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="p-3">{b.id}</td>
                  <td className="p-3">
                    <div className="font-medium">{b.name}</div>
                    <div className="text-slate-500">{b.email}</div>
                  </td>
                  <td className="p-3">
                    {b.vehicle_type || `#${b.vehicle_id}`}
                    <div className="text-slate-500 text-xs">
                      Pickup: {b.pickup_location}
                    </div>
                  </td>
                  <td className="p-3">{formatDT(b.start_time)}</td>
                  <td className="p-3">{formatDT(b.end_time)}</td>
                  <td className="p-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={busyId === b.id || !canReassignVehicle}
                        onClick={() => canReassignVehicle && openReassignModal(b)}
                        className={`px-3 py-1 rounded disabled:opacity-40 ${
                          canReassignVehicle
                            ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        Reassign Vehicle
                      </button>
                      <button
                        disabled={busyId === b.id || !canReportIssue}
                        onClick={() => canReportIssue && setReportIssueBooking(b)}
                        className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40"
                      >
                        Report issue
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && upcoming.length === 0 && (
              <tr>
                <td className="p-6 text-slate-500" colSpan={7}>
                  No upcoming trips.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assign driver modal */}
      {assignBooking && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-6"
          onClick={() => setAssignBooking(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              Assign driver for request #{assignBooking.id}
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-700 font-medium mb-1.5">
                  Driver name
                </label>
                <input
                  type="text"
                  value={assignName}
                  onChange={(e) => setAssignName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter driver full name"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1.5">
                  Driver phone (WhatsApp)
                </label>
                <input
                  type="tel"
                  value={assignPhone}
                  onChange={(e) => setAssignPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="10-digit phone number"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setAssignBooking(null)}
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                disabled={assignSubmitting}
                onClick={submitAssign}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60"
              >
                {assignSubmitting ? "Assigning..." : "Assign driver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign vehicle modal */}
      {reassignBooking && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-6"
          onClick={() => setReassignBooking(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-2">
              Reassign vehicle for request #{reassignBooking.id}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Select an available vehicle for this trip window.
            </p>

            {reassignLoading && (
              <p className="text-sm">Loading available vehicles...</p>
            )}
            {reassignError && (
              <p className="text-sm text-red-600 mb-3">{reassignError}</p>
            )}

            {!reassignLoading && !reassignError && (
              <div className="max-h-64 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {reassignVehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setReassignSelected(v.id)}
                    className={`text-left border rounded-lg px-3 py-2 text-sm ${
                      reassignSelected === v.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-blue-400"
                    }`}
                  >
                    <div className="font-semibold">
                      {v.vehicle_type} (#{v.id})
                    </div>
                    <div className="text-gray-600 text-xs">
                      Capacity: {v.passenger_capacity}
                    </div>
                  </button>
                ))}
                {reassignVehicles.length === 0 && (
                  <div className="text-sm text-gray-600">
                    No available vehicles found.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setReassignBooking(null)}
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitReassign}
                disabled={!reassignSelected}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-60"
              >
                Confirm reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report issue modal */}
      {reportIssueBooking && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-6"
          onClick={() => { setReportIssueBooking(null); setReportReason(""); setMarkUnavailable(false); }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Report issue – request #{reportIssueBooking.id}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              The booking will be cancelled and the requester will be emailed with the reason.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (sent to requester)
            </label>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 bg-white min-h-[100px]"
              placeholder="e.g. Mechanical fault, accident damage..."
            />
            <label className="flex items-center gap-2 mt-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={markUnavailable}
                onChange={(e) => setMarkUnavailable(e.target.checked)}
              />
              Mark this vehicle as unavailable
            </label>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => { setReportIssueBooking(null); setReportReason(""); setMarkUnavailable(false); }}
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm"
              >
                Cancel
              </button>
              <button
                disabled={reportSubmitting || !reportReason.trim()}
                onClick={submitReportIssue}
                className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 text-sm disabled:opacity-60"
              >
                {reportSubmitting ? "Submitting..." : "Report issue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

