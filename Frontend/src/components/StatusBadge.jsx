function StatusBadge({ status }) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const colors = {
    pending: "bg-yellow-400",
    "pending_guide_approval": "bg-yellow-400",
    "guide_approved": "bg-green-500",
    approved: "bg-indigo-400",
    rejected: "bg-red-500",
    cancelled: "bg-red-500",
    "cancellation_requested": "bg-amber-400",
    assigned: "bg-indigo-400",
    delayed: "bg-orange-400",
    in_progress: "bg-blue-400",
    completed: "bg-blue-500",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-black ${colors[normalized] || "bg-gray-200"}`}
      title={status || ""}
    >
      {status}
    </span>
  );
}

export default StatusBadge;