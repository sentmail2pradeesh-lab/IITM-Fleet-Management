import { useEffect, useState } from "react";
import { getUsageReport, getReportVehicleTypes } from "../../api/reportApi";

function downloadCsvFromData(data, reportType = "vehicle") {
  const isDriverReport = reportType === "driver";
  const header = isDriverReport
    ? "driver_name,driver_phone,total_trips,total_hours"
    : "vehicle_id,vehicle_type,vehicle_name,total_trips,total_hours";

  const filenamePrefix = isDriverReport ? "driver_usage_report" : "vehicle_usage_report";

  if (!data || !Array.isArray(data) || data.length === 0) {
    const blob = new Blob([header + "\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const rows = data.map((r) =>
    isDriverReport
      ? `${(r.driver_name || "").replace(/,/g, ";")},${(r.driver_phone || "").replace(/,/g, ";")},${r.total_trips ?? 0},${r.total_hours ?? 0}`
      : `${r.vehicle_id},${(r.vehicle_type || "").replace(/,/g, ";")},${(r.vehicle_name || "").replace(/,/g, ";")},${r.total_trips ?? 0},${r.total_hours ?? 0}`
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [vehicleType, setVehicleType] = useState("");
  const [reportType, setReportType] = useState("vehicle");

  useEffect(() => {
    getReportVehicleTypes()
      .then((r) => setVehicleTypes(r.data || []))
      .catch(() => setVehicleTypes([]));
  }, []);

  const getParams = () => {
    const params = {
      report_type: reportType,
      vehicle_type: reportType === "vehicle" ? vehicleType || undefined : undefined,
    };
    if (period === "custom") {
      if (!customStart || !customEnd) return null;
      params.start_date = customStart;
      params.end_date = customEnd;
    } else {
      params.period = period;
    }
    return params;
  };

  const load = async () => {
    const params = getParams();
    if (!params || (period === "custom" && (!params.start_date || !params.end_date))) {
      setError("Select a period or enter custom start and end dates.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await getUsageReport(params);
      setReport(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    const params = getParams();
    if (!params || (period === "custom" && (!params.start_date || !params.end_date))) {
      setError("Select a period or enter custom dates before downloading.");
      return;
    }
    try {
      const res = await getUsageReport({ ...params, download: "true" });
      if (typeof res.data === "string") {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}_usage_report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        downloadCsvFromData(Array.isArray(res.data) ? res.data : report, reportType);
      }
    } catch (e) {
      if (report && report.length > 0) {
        downloadCsvFromData(report, reportType);
      } else {
        setError(e?.response?.data?.message || "Download failed");
      }
    }
  };

  return (
    <div className="text-gray-900">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Usage Reports</h1>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded disabled:opacity-60"
          >
            {loading ? "Loading..." : "Load report"}
          </button>
          <button
            onClick={download}
            disabled={!report}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded disabled:opacity-60"
          >
            Download CSV
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Report type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded px-3 py-2 text-gray-900 bg-white"
            >
              <option value="vehicle">Vehicle-wise</option>
              <option value="driver">Driver-wise</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded px-3 py-2 text-gray-900 bg-white"
            >
              <option value="month">This month</option>
              <option value="year">This year</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          {period === "custom" && (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full rounded px-3 py-2 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">End date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full rounded px-3 py-2 text-gray-900 bg-white"
                />
              </div>
            </>
          )}
          {reportType === "vehicle" && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Vehicle type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full rounded px-3 py-2 text-gray-900 bg-white"
              >
                <option value="">All types</option>
                {vehicleTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-red-200 mb-4">{error}</p>}

      {report && (
        <div className="bg-gray-50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left bg-gray-50">
              {reportType === "driver" ? (
                <tr>
                  <th className="p-3">Driver name</th>
                  <th className="p-3">Driver phone</th>
                  <th className="p-3">Trips</th>
                  <th className="p-3">Hours</th>
                </tr>
              ) : (
                <tr>
                  <th className="p-3">Vehicle ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Reg / Name</th>
                  <th className="p-3">Trips</th>
                  <th className="p-3">Hours</th>
                </tr>
              )}
            </thead>
            <tbody>
              {report.map((r) =>
                reportType === "driver" ? (
                  <tr
                    key={`${r.driver_name || "unknown"}-${r.driver_phone || "na"}`}
                    className="border-t border-gray-100"
                  >
                    <td className="p-3">{r.driver_name || "—"}</td>
                    <td className="p-3">{r.driver_phone || "—"}</td>
                    <td className="p-3">{r.total_trips ?? 0}</td>
                    <td className="p-3">{Number(r.total_hours ?? 0).toFixed(1)}</td>
                  </tr>
                ) : (
                  <tr key={r.vehicle_id} className="border-t border-gray-100">
                    <td className="p-3">{r.vehicle_id}</td>
                    <td className="p-3">{r.vehicle_type || "—"}</td>
                    <td className="p-3">{r.vehicle_name || "—"}</td>
                    <td className="p-3">{r.total_trips ?? 0}</td>
                    <td className="p-3">{Number(r.total_hours ?? 0).toFixed(1)}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {report.length === 0 && (
            <p className="p-4 text-gray-500">No completed trips in the selected period.</p>
          )}
        </div>
      )}
    </div>
  );
}
