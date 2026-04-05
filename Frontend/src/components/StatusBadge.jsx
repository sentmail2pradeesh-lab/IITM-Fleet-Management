// StatusBadge — pill shape with dot, semantic tones, works on white bg
function StatusBadge({ status }) {
  const key = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const styles = {
    pending:                    "bg-amber-50  text-amber-800  before:bg-amber-400",
    pending_guide_approval:     "bg-amber-50  text-amber-800  before:bg-amber-400",
    guide_approved:             "bg-teal-50   text-teal-800   before:bg-teal-500",
    approved:                   "bg-blue-50   text-blue-800   before:bg-blue-500",
    rejected:                   "bg-red-50    text-red-800    before:bg-red-500",
    cancelled:                  "bg-red-50    text-red-800    before:bg-red-400",
    cancellation_requested:     "bg-orange-50 text-orange-800 before:bg-orange-400",
    assigned:                   "bg-indigo-50 text-indigo-800 before:bg-indigo-500",
    in_progress:                "bg-blue-50   text-blue-800   before:bg-blue-400",
    delayed:                    "bg-orange-50 text-orange-800 before:bg-orange-500",
    completed:                  "bg-green-50  text-green-800  before:bg-green-500",
  };

  const cls = styles[key] || "bg-gray-100 text-gray-600 before:bg-gray-400";

  return (
    <span
      title={status || ""}
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-0.5 rounded-full
        text-xs font-medium whitespace-nowrap
        before:inline-block before:w-1.5 before:h-1.5
        before:rounded-full before:shrink-0
        ${cls}
      `}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
