import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { http } from "../../api/http";
import LoadingSpinner from "../../components/LoadingSpinner";

function formatDT(value) {
  try {
    return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return String(value || "");
  }
}

export default function GuideEmailAction() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [submittingDecision, setSubmittingDecision] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [done, setDone] = useState(false);

  const canSubmitNotRecommend = useMemo(() => remarks.trim().length >= 3, [remarks]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await http.get(`/bookings/guide-email/${encodeURIComponent(token)}`);
        if (!cancelled) setData(res.data);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || "Unable to load request details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) load();
    else {
      setLoading(false);
      setError("Missing token");
    }
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submitDecision(decision) {
    setSubmittingDecision(decision);
    setError("");
    try {
      await http.post(`/bookings/guide-email/${encodeURIComponent(token)}`, {
        decision,
        remarks: remarks.trim()
      });
      setDone(true);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to submit decision");
    } finally {
      setSubmittingDecision("");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex items-center justify-center px-4 py-10">
      <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-[0_12px_32px_rgba(16,24,40,0.10)] p-8">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
          Guide/HoD Recommendation
        </h1>
        <p className="text-slate-600 text-sm mb-6">
          Review the full request details and choose Recommend / Not Recommend.
        </p>

        {loading && (
          <div className="flex items-center gap-2 text-slate-700">
            <LoadingSpinner size={18} /> Loading...
          </div>
        )}

        {!loading && error && <p className="text-red-600 text-sm">{error}</p>}

        {!loading && !error && data && (
          <>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-800">
                <div>
                  <div className="text-slate-500">Booking ID</div>
                  <div className="font-semibold">{data.booking?.id}</div>
                </div>
                <div>
                  <div className="text-slate-500">Status</div>
                  <div className="font-semibold">{data.booking?.status}</div>
                </div>
                <div>
                  <div className="text-slate-500">Requester</div>
                  <div className="font-semibold">
                    {data.requester?.name} ({data.requester?.email})
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Trip type</div>
                  <div className="font-semibold">
                    {data.booking?.campus_type === "outside" ? "Outside IITM" : "Inside IITM"}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Start</div>
                  <div className="font-semibold">{formatDT(data.booking?.start_time)}</div>
                </div>
                <div>
                  <div className="text-slate-500">End</div>
                  <div className="font-semibold">{formatDT(data.booking?.end_time)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Pickup</div>
                  <div className="font-semibold">{data.booking?.pickup_location}</div>
                </div>
                <div>
                  <div className="text-slate-500">Drop</div>
                  <div className="font-semibold">{data.booking?.drop_location}</div>
                </div>
                <div>
                  <div className="text-slate-500">Passengers</div>
                  <div className="font-semibold">{data.booking?.passenger_count}</div>
                </div>
                <div>
                  <div className="text-slate-500">Purpose</div>
                  <div className="font-semibold">{data.booking?.purpose}</div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Remarks (required for Not Recommend)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                className="w-full rounded border border-slate-200 px-3 py-2 text-black"
                placeholder="Add optional remarks (mandatory if Not Recommend)"
              />
            </div>

            {done ? (
              <div className="mt-6 bg-green-50 border border-green-100 text-green-800 rounded-lg p-4">
                Decision submitted successfully. You may close this page.
              </div>
            ) : (
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  disabled={Boolean(submittingDecision)}
                  onClick={() => submitDecision("recommend")}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded disabled:opacity-60"
                >
                  {submittingDecision === "recommend" ? "Submitting..." : "Recommend"}
                </button>
                <button
                  disabled={Boolean(submittingDecision) || !canSubmitNotRecommend}
                  onClick={() => submitDecision("not_recommend")}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded disabled:opacity-60"
                >
                  {submittingDecision === "not_recommend" ? "Submitting..." : "Not Recommend"}
                </button>
              </div>
            )}

            {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

