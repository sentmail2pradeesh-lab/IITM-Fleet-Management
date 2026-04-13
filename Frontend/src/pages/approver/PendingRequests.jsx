import { useEffect, useMemo, useState } from "react";
import { useContext } from "react";
import StatusBadge from "../../components/StatusBadge";
import {
  approveBooking,
  assignDriver,
  getBookingFlow,
  listPendingBookings,
  listUpcomingBookings,
  rejectBooking,
  reassignVehicle,
  reportIssue,
  supervisorAllot
} from "../../api/bookingApi";
import {
  getAvailableVehicles,
  getVehicleAvailabilityByType,
  getVehicleAvailabilitySummary
} from "../../api/vehicleApi";
import { listUsers } from "../../api/userApi";
import LoadingSpinner from "../../components/LoadingSpinner";
import SuccessCheck from "../../components/SuccessCheck";
import { AuthContext } from "../../context/AuthContext";

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
  const { user } = useContext(AuthContext);
  const role = user?.role === "approver" ? "oic" : user?.role;
  const isOic = role === "oic";
  const [pendingRows, setPendingRows] = useState([]);
  const [upcomingRows, setUpcomingRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [assignBooking, setAssignBooking] = useState(null);
  const [assignName, setAssignName] = useState("");
  const [assignPhone, setAssignPhone] = useState("");
  const [assignRemarks, setAssignRemarks] = useState("");
  const [drivers, setDrivers] = useState([]);
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

  const [allotBooking, setAllotBooking] = useState(null);
  const [allotVehicles, setAllotVehicles] = useState([]);
  const [allotSelectedVehicleId, setAllotSelectedVehicleId] = useState(null);
  const [allotDriverName, setAllotDriverName] = useState("");
  const [allotDriverPhone, setAllotDriverPhone] = useState("");
  const [allotRemarks, setAllotRemarks] = useState("");
  const [allotLoading, setAllotLoading] = useState(false);
  const [allotSubmitting, setAllotSubmitting] = useState(false);
  const [allotError, setAllotError] = useState("");

  const [allotStep, setAllotStep] = useState(1);
  const [allotSummary, setAllotSummary] = useState([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState("");
  const [typeVehicles, setTypeVehicles] = useState({ available: [], booked: [] });
  const [vehicleTab, setVehicleTab] = useState("available");

  const [oicFlowModal, setOicFlowModal] = useState(null);
  const [oicFlowLoading, setOicFlowLoading] = useState(false);
  const [oicFlow, setOicFlow] = useState(null);
  const [oicApproveRemarks, setOicApproveRemarks] = useState("");

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
      const driverRes = await listUsers("driver");
      setDrivers(driverRes.data || []);
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
      await approveBooking(bookingId, {
        remarks: String(oicApproveRemarks || "").trim() || undefined
      });
      setActionSuccess("Approved");
      setTimeout(() => setActionSuccess(null), 350);
      await refresh();
      alert("Assignment approved. Requester and driver have been notified by email/SMS.");
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
    setAssignRemarks("");
  };

  const openAllotModal = async (booking) => {
    const startDate = booking?.start_time
      ? new Date(booking.start_time).toISOString().slice(0, 10)
      : null;
    if (!startDate) {
      alert("Missing start time; cannot load availability.");
      return;
    }
    setAllotBooking(booking);
    setAllotSelectedVehicleId(booking.vehicle_id);
    setAllotDriverName("");
    setAllotDriverPhone("");
    setAllotVehicles([]);
    setAllotRemarks("");
    setAllotError("");
    setAllotStep(1);
    setAllotSummary([]);
    setSelectedVehicleType("");
    setTypeVehicles({ available: [], booked: [] });
    setVehicleTab("available");
    setAllotLoading(true);
    try {
      const res = await getVehicleAvailabilitySummary(startDate);
      setAllotSummary(res.data || []);
    } catch (e) {
      setAllotError(e?.response?.data?.message || "Failed to load vehicles");
    } finally {
      setAllotLoading(false);
    }
  };

  const loadVehicleType = async (booking, type) => {
    const startDate = booking?.start_time
      ? new Date(booking.start_time).toISOString().slice(0, 10)
      : null;
    if (!startDate) return;
    setAllotLoading(true);
    setAllotError("");
    try {
      const res = await getVehicleAvailabilityByType({ date: startDate, type });
      const data = res.data || {};
      setTypeVehicles({
        available: data.available || [],
        booked: data.booked || []
      });
      setVehicleTab("available");
      setAllotVehicles(data.available || []);
      setAllotSelectedVehicleId(null);
      setAllotStep(2);
    } catch (e) {
      setAllotError(e?.response?.data?.message || "Failed to load vehicles for type");
    } finally {
      setAllotLoading(false);
    }
  };

  const submitAllot = async () => {
    if (!allotBooking) return;
    if (!allotDriverName.trim() || !allotDriverPhone.trim()) {
      alert("Driver name and phone are required.");
      return;
    }
    if (!allotSelectedVehicleId) {
      alert("Select a vehicle.");
      return;
    }
    setAllotSubmitting(true);
    setError("");
    try {
      await supervisorAllot(allotBooking.id, {
        vehicle_id: Number(allotSelectedVehicleId),
        driver_name: allotDriverName.trim(),
        driver_phone: allotDriverPhone.trim(),
        remarks: String(allotRemarks || "").trim() || undefined
      });
      setActionSuccess("Sent to OIC");
      setTimeout(() => setActionSuccess(null), 350);
      await refresh();
      alert(
        "Vehicle and driver allotted. The Officer In-charge has been notified for approval."
      );
      setAllotBooking(null);
    } catch (e) {
      setError(e?.response?.data?.message || "Allotment failed");
    } finally {
      setAllotSubmitting(false);
    }
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
        driver_phone: assignPhone.trim(),
        remarks: String(assignRemarks || "").trim() || undefined
      });
      setActionSuccess("Driver assigned");
      setTimeout(() => setActionSuccess(null), 350);
      await refresh();
      alert("Driver assigned. Driver will receive an SMS after OIC approves the booking.");
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
      await reportIssue(reportIssueBooking.id, {
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

  const openOicFlow = async (bookingId) => {
    setOicFlowModal(bookingId);
    setOicFlowLoading(true);
    setOicFlow(null);
    setOicApproveRemarks("");
    try {
      const res = await getBookingFlow(bookingId);
      setOicFlow(res.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load booking flow");
      setOicFlowModal(null);
    } finally {
      setOicFlowLoading(false);
    }
  };

  return (
    <div className="text-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          {isOic ? "Officer In-charge Dashboard" : "Transport Supervisor Dashboard"}
        </h1>
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
              const canSupervisorAllot =
                !isOic &&
                (b.status === "Guide Approved" ||
                  (b.status === "Pending OIC Approval" &&
                    (!String(b.driver_name || "").trim() ||
                      !String(b.driver_phone || "").trim())));
              const canFinalApprove = isOic && b.status === "Pending OIC Approval";
              const canAssignDriver = false;
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
                    {b.status === "Pending OIC Approval" && b.driver_name && (
                      <div className="text-slate-600 text-xs mt-1">
                        Allotted: {b.driver_name} ({b.driver_phone})
                      </div>
                    )}
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
                      {canSupervisorAllot && (
                        <>
                          <button
                            disabled={busyId === b.id}
                            onClick={() => openAllotModal(b)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded disabled:opacity-60 soft-transition-long"
                          >
                            Allot vehicle &amp; driver
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
                      {canFinalApprove && (
                        <>
                          <button
                            disabled={busyId === b.id}
                            onClick={() => openOicFlow(b.id)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1 rounded disabled:opacity-60 soft-transition-long"
                          >
                            View full flow
                          </button>
                          <button
                            disabled={busyId === b.id}
                            onClick={() => onApprove(b.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded disabled:opacity-60 soft-transition-long"
                          >
                            Approve assignment
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
                    {!isOic ? (
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
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
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

      {/* Supervisor: allot vehicle + driver for OIC approval */}
      {allotBooking && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-6"
          onClick={() => setAllotBooking(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-2 text-gray-900">
              Allot vehicle &amp; driver — request #{allotBooking.id}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Choose an available vehicle and driver. This is sent to the Officer In-charge for final
              approval.
            </p>

            {allotLoading && (
              <p className="text-sm text-gray-600 mb-3">Loading available vehicles...</p>
            )}
            {allotError && <p className="text-sm text-red-600 mb-3">{allotError}</p>}

            {!allotLoading && allotStep === 1 && (
              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-900 mb-2">
                  Step 1: Select vehicle type
                </div>
                <div className="max-h-64 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(allotSummary || []).map((t) => (
                    <button
                      key={t.vehicle_type}
                      type="button"
                      onClick={() => {
                        setSelectedVehicleType(t.vehicle_type);
                        loadVehicleType(allotBooking, t.vehicle_type);
                      }}
                      className={`text-left border rounded-lg px-3 py-2 text-sm ${
                        selectedVehicleType === t.vehicle_type
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-blue-400"
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{t.vehicle_type}</div>
                      <div className="text-gray-600 text-xs mt-0.5">
                        Available: {t.available_count} • Booked: {t.booked_count}
                      </div>
                    </button>
                  ))}
                  {(allotSummary || []).length === 0 && !allotError && (
                    <div className="text-sm text-gray-600">
                      No vehicle types returned for this date.
                    </div>
                  )}
                </div>
              </div>
            )}

            {!allotLoading && allotStep === 2 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-gray-900">
                    Step 2: Select vehicle ({selectedVehicleType})
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAllotStep(1);
                      setAllotSelectedVehicleId(null);
                      setVehicleTab("available");
                    }}
                    className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800"
                  >
                    Change type
                  </button>
                </div>

                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setVehicleTab("available")}
                    className={`px-3 py-1 rounded text-sm ${
                      vehicleTab === "available"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                    }`}
                  >
                    Available ({typeVehicles.available.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleTab("booked")}
                    className={`px-3 py-1 rounded text-sm ${
                      vehicleTab === "booked"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                    }`}
                  >
                    Booked ({typeVehicles.booked.length})
                  </button>
                </div>

                <select
                  value={allotSelectedVehicleId || ""}
                  onChange={(e) =>
                    setAllotSelectedVehicleId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 bg-white"
                >
                  <option value="">
                    {vehicleTab === "available"
                      ? "Select available vehicle"
                      : "View booked vehicles"}
                  </option>
                  {(vehicleTab === "available"
                    ? typeVehicles.available
                    : typeVehicles.booked
                  ).map((v) => (
                    <option key={v.id} value={v.id}>
                      #{v.id} — {v.registration_number || v.vehicle_type}
                    </option>
                  ))}
                </select>

                {vehicleTab === "booked" && (
                  <div className="text-xs text-gray-600 mt-2">
                    Booked vehicles are shown for reference only. Select from the “Available” tab to
                    allot.
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 text-sm border-t border-gray-100 pt-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1.5">Driver</label>
                <select
                  value={allotDriverName}
                  onChange={(e) => {
                    const selected = drivers.find((d) => d.name === e.target.value);
                    setAllotDriverName(e.target.value);
                    if (selected?.phone) setAllotDriverPhone(String(selected.phone).replace(/\D/g, "").slice(-10));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 bg-white"
                >
                  <option value="">Select available driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1.5">
                  Driver phone (10 digits)
                </label>
                <input
                  type="tel"
                  value={allotDriverPhone}
                  onChange={(e) => setAllotDriverPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 bg-white"
                  placeholder="10-digit phone number"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1.5">
                  Remarks (optional)
                </label>
                <textarea
                  value={allotRemarks}
                  onChange={(e) => setAllotRemarks(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 bg-white min-h-[90px]"
                  placeholder="Add any notes for OIC / audit trail..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setAllotBooking(null)}
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                disabled={allotSubmitting || allotLoading}
                onClick={submitAllot}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-60"
              >
                {allotSubmitting ? "Submitting..." : "Send to OIC for approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign driver modal (deprecated by supervisor allotment flow) */}
      {false && assignBooking && (
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
                <select
                  value={assignName}
                  onChange={(e) => {
                    const selected = drivers.find((d) => d.name === e.target.value);
                    setAssignName(e.target.value);
                    if (selected?.phone) setAssignPhone(selected.phone);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 bg-white"
                >
                  <option value="">Select available driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1.5">
                  Driver phone
                </label>
                <input
                  type="tel"
                  value={assignPhone}
                  onChange={(e) => setAssignPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="10-digit phone number"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1.5">
                  Remarks (optional)
                </label>
                <textarea
                  value={assignRemarks}
                  onChange={(e) => setAssignRemarks(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 bg-white min-h-[90px]"
                  placeholder="Add any notes for audit trail..."
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

      {oicFlowModal && (
        <div
          className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-6"
          onClick={() => setOicFlowModal(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-2xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900">
                Full request flow — booking #{oicFlowModal}
              </h2>
              <button
                type="button"
                onClick={() => setOicFlowModal(null)}
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm"
              >
                Close
              </button>
            </div>

            {oicFlowLoading && <p className="text-sm text-gray-600">Loading...</p>}

            {!oicFlowLoading && oicFlow?.booking && (
              <div className="text-sm text-gray-900">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="border rounded-lg p-3">
                    <div className="font-semibold mb-1">Trip details</div>
                    <div>Pickup: {oicFlow.booking.pickup_location}</div>
                    <div>Drop: {oicFlow.booking.drop_location}</div>
                    <div>Start: {formatDT(oicFlow.booking.start_time)}</div>
                    <div>End: {formatDT(oicFlow.booking.end_time)}</div>
                    <div>
                      Vehicle:{" "}
                      {oicFlow.booking.vehicle_type || `#${oicFlow.booking.vehicle_id}`}
                    </div>
                    <div className="mt-1">
                      Driver: {oicFlow.booking.driver_name || "-"} (
                      {oicFlow.booking.driver_phone || "-"})
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="font-semibold mb-1">Requester</div>
                    <div>{oicFlow.requester?.name}</div>
                    <div className="text-gray-600">{oicFlow.requester?.email}</div>
                    <div className="text-gray-600">{oicFlow.requester?.phone || "-"}</div>
                    {oicFlow.booking.document_url ? (
                      <a
                        className="text-blue-700 underline inline-block mt-2"
                        href={
                          String(oicFlow.booking.document_url).startsWith("http")
                            ? oicFlow.booking.document_url
                            : `http://localhost:5000/${String(
                                oicFlow.booking.document_url
                              ).replace(/\\/g, "/")}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        View uploaded document
                      </a>
                    ) : (
                      <div className="text-gray-500 mt-2">No document uploaded</div>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-3 mb-4">
                  <div className="font-semibold mb-2">Approval & allotment flow</div>
                  <div className="max-h-56 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="text-left text-gray-600">
                        <tr>
                          <th className="py-1 pr-2">Time</th>
                          <th className="py-1 pr-2">Action</th>
                          <th className="py-1 pr-2">By</th>
                          <th className="py-1 pr-2">Status</th>
                          <th className="py-1 pr-2">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(oicFlow.audit || []).map((a) => (
                          <tr key={a.id} className="border-t">
                            <td className="py-1 pr-2">{formatDT(a.created_at)}</td>
                            <td className="py-1 pr-2">{a.action}</td>
                            <td className="py-1 pr-2">
                              {a.performed_by_name || a.performed_by || "-"}
                            </td>
                            <td className="py-1 pr-2">
                              {a.old_status} → {a.new_status}
                            </td>
                            <td className="py-1 pr-2">{a.remarks || "-"}</td>
                          </tr>
                        ))}
                        {(oicFlow.audit || []).length === 0 && (
                          <tr>
                            <td className="py-2 text-gray-600" colSpan={5}>
                              No audit history found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border rounded-lg p-3">
                  <div className="font-semibold mb-2">OIC remarks (optional)</div>
                  <textarea
                    value={oicApproveRemarks}
                    onChange={(e) => setOicApproveRemarks(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 bg-white min-h-[90px]"
                    placeholder="Add any notes for audit trail..."
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      disabled={busyId === oicFlowModal}
                      onClick={async () => {
                        const id = oicFlowModal;
                        setOicFlowModal(null);
                        await onApprove(id);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm disabled:opacity-60"
                    >
                      Approve assignment
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

