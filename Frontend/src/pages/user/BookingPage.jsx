import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { createBooking } from "../../api/bookingApi";
import { listVehicles } from "../../api/vehicleApi";
import { listLocations } from "../../api/locationApi";
import LoadingSpinner from "../../components/LoadingSpinner";
import SuccessCheck from "../../components/SuccessCheck";

function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tripTypeFromIntro = params.get("trip") || "";
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      return_required: "",
      campus_type: tripTypeFromIntro || "",
      pickup_location: "",
      drop_location: ""
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [purposeKind, setPurposeKind] = useState("");
  const returnRequired = watch("return_required");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState(null);
  const [locations, setLocations] = useState([]);
  const [locLoading, setLocLoading] = useState(true);

  useEffect(() => {
    async function loadType() {
      try {
        if (!id) {
          setVehicleType("");
          setVehicleCapacity(null);
          return;
        }
        const res = await listVehicles();
        const found = res.data.find((v) => String(v.id) === String(id));
        setVehicleType(found?.vehicle_type || "");
        setVehicleCapacity(found?.passenger_capacity ?? null);
      } catch {
        setVehicleType("");
      }
    }
    loadType();
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLocLoading(true);
      try {
        const res = await listLocations();
        if (!cancelled) setLocations(res.data || []);
      } catch {
        if (!cancelled) setLocations([]);
      } finally {
        if (!cancelled) setLocLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError("");
    setSuccess(false);
    try {
      if (returnRequired !== "yes" && returnRequired !== "no") {
        setError("Please select whether return is required.");
        setSubmitting(false);
        return;
      }

      const campus = String(tripTypeFromIntro || data.campus_type || "")
        .trim()
        .toLowerCase();
      if (campus !== "inside" && campus !== "outside") {
        setError(
          "Trip type is missing. Please go back and choose Inside IITM or Outside IITM before booking."
        );
        setSubmitting(false);
        return;
      }

      if (!purposeKind || (purposeKind !== "institute" && purposeKind !== "project")) {
        setError("Select exactly one purpose: Institute or Project.");
        setSubmitting(false);
        return;
      }
      const purposeValue =
        purposeKind === "institute" ? "Institute purpose" : "Project purpose";

      if (
        String(vehicleType || "").toLowerCase().includes("cart") &&
        campus === "outside"
      ) {
        setError("Cart booking is only allowed for Inside IITM trips.");
        setSubmitting(false);
        return;
      }

      if (vehicleCapacity && Number(data.passenger_count) > vehicleCapacity) {
        setError(`Passenger count cannot exceed vehicle capacity (${vehicleCapacity}).`);
        setSubmitting(false);
        return;
      }

      if (!data.pickup_location || !data.drop_location) {
        setError("Please select pickup and drop locations from the list.");
        setSubmitting(false);
        return;
      }

      const form = new FormData();
      if (id) form.append("vehicle_id", String(id));
      const start = new Date(data.start_time);
      const end = new Date(data.end_time);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        setError("Invalid start/end time");
        setSubmitting(false);
        return;
      }
      if (start >= end) {
        setError("End time must be after start time.");
        setSubmitting(false);
        return;
      }
      if (start < new Date()) {
        setError("Start time cannot be in the past.");
        setSubmitting(false);
        return;
      }
      form.append("start_time", start.toISOString());
      form.append("end_time", end.toISOString());
      form.append("pickup_location", data.pickup_location);
      form.append("drop_location", data.drop_location);
      form.append("passenger_count", String(data.passenger_count));

      form.append("purpose", purposeValue);
      form.append("campus_type", campus);
      form.append("hod_name", data.hod_name);
      form.append("hod_email", data.hod_email);
      form.append("return_required", String(returnRequired === "yes"));
      if (returnRequired === "yes" && data.return_pickup_time) {
        const ret = new Date(data.return_pickup_time);
        if (Number.isNaN(ret.getTime())) {
          setError("Invalid return pickup time");
          setSubmitting(false);
          return;
        }
        if (ret < end) {
          setError("Return pickup time must be after end time.");
          setSubmitting(false);
          return;
        }
        form.append("return_pickup_time", ret.toISOString());
      }
      if (data.document?.[0]) form.append("document", data.document[0]);

      await createBooking(form);
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 350);
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data?.message || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const locDisabled = locLoading || locations.length === 0;

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <Navbar />

      <div className="h-[100px] bg-[#1a2a4a] relative overflow-hidden mt-[72px]">
        <div className="absolute inset-y-0 right-0 w-1/3 opacity-20 bg-[url('/bus-hero.svg')] bg-cover bg-center" />
        <div className="max-w-5xl mx-auto h-full px-6 flex items-center">
          <h2 className="text-white text-2xl font-semibold">Vehicle Request Form</h2>
        </div>
      </div>

      <div className="flex justify-center items-start py-8 px-4">
        <div className="bg-white p-8 rounded-xl shadow-[0_8px_24px_rgba(16,24,40,0.08)] w-full max-w-[700px]">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-1 text-center">
            Vehicle Request Form
          </h2>
          <p className="text-slate-600 text-sm text-center mb-6">
            Fill the trip details and submit for approval.
          </p>
          {locLoading && (
            <p className="text-sm text-slate-600 mb-4 text-center">Loading location list…</p>
          )}
          {!locLoading && locations.length === 0 && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
              No pickup or drop locations are available yet. The Officer In-charge must publish
              locations under <b>Pickup / drop locations</b> in the OIC panel before bookings can be
              submitted.
            </p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Guide/HoD name *
                </label>
                <input
                  placeholder="Guide/HoD name"
                  {...register("hod_name", { required: true, minLength: 3 })}
                  className="block w-full px-4 py-2 rounded border border-slate-200 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Guide/HoD email id *
                </label>
                <input
                  type="email"
                  placeholder="guide@iitm.ac.in"
                  {...register("hod_email", { required: true })}
                  className="block w-full px-4 py-2 rounded border border-slate-200 text-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Start date & time *
              </label>
              <input
                type="datetime-local"
                {...register("start_time", { required: true })}
                className="block w-full px-4 py-2 rounded border border-slate-200 text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                End date & time *
              </label>
              <input
                type="datetime-local"
                {...register("end_time", { required: true })}
                className="block w-full px-4 py-2 rounded border border-slate-200 text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Pickup location *
              </label>
              <select
                disabled={locDisabled}
                {...register("pickup_location", { required: true })}
                className="block w-full px-4 py-2 rounded border border-slate-200 text-black disabled:bg-slate-100"
              >
                <option value="">Select pickup location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.label}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Drop location *
              </label>
              <select
                disabled={locDisabled}
                {...register("drop_location", { required: true })}
                className="block w-full px-4 py-2 rounded border border-slate-200 text-black disabled:bg-slate-100"
              >
                <option value="">Select drop location</option>
                {locations.map((loc) => (
                  <option key={`d-${loc.id}`} value={loc.label}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Passenger count *
              </label>
              <input
                type="number"
                placeholder="Passenger count"
                max={vehicleCapacity || undefined}
                {...register("passenger_count", { required: true, min: 1 })}
                className="block w-full px-4 py-2 rounded border border-slate-200 text-black"
              />
              {vehicleCapacity && (
                <p className="text-xs text-slate-500 mt-1">
                  Capacity for this vehicle type: {vehicleCapacity} passengers.
                </p>
              )}
            </div>

            <div>
              <span className="block text-sm font-semibold text-slate-700 mb-2">
                Purpose * (select one)
              </span>
              <div className="flex flex-col sm:flex-row gap-3 text-sm text-slate-800">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="purpose_kind"
                    value="institute"
                    checked={purposeKind === "institute"}
                    onChange={() => setPurposeKind("institute")}
                    className="border-slate-300"
                  />
                  Institute purpose
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="purpose_kind"
                    value="project"
                    checked={purposeKind === "project"}
                    onChange={() => setPurposeKind("project")}
                    className="border-slate-300"
                  />
                  Project purpose
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Return required *
                </label>
                <select
                  {...register("return_required", { required: true })}
                  className="block w-full px-4 py-2 rounded border border-slate-200 text-black"
                >
                  <option value="" disabled>
                    Select option
                  </option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>

            {returnRequired === "yes" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Return pickup time *
                </label>
                <input
                  type="datetime-local"
                  {...register("return_pickup_time", { required: true })}
                  className="block w-full px-4 py-2 rounded border border-slate-200 text-black"
                />
              </div>
            )}

            <div className="text-slate-700">
              <label className="block text-sm font-semibold mb-2">Document (optional)</label>
              <div className="flex items-center gap-3">
                <label className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded cursor-pointer">
                  Choose file
                  <input type="file" {...register("document")} className="hidden" />
                </label>
                <span className="text-xs text-slate-500">
                  {watch("document")?.[0]?.name || "No file selected"}
                </span>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              disabled={submitting || locDisabled}
              className="relative bg-green-500 hover:bg-green-600 px-6 py-2 rounded text-white disabled:opacity-60 soft-transition-long w-full"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size={16} />
                  Submitting...
                </span>
              ) : (
                "Submit Request"
              )}
              {submitting && <div className="submit-progress absolute bottom-0 left-0 right-0" />}
            </button>

            {success && (
              <div className="mt-4">
                <SuccessCheck text="Request submitted" />
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default BookingPage;
