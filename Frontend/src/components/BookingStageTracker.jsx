import StatusBadge from "./StatusBadge";

function getStage(status) {
  switch (status) {
    case "Pending Guide Approval":
      return 1;
    case "Guide Approved":
      return 2;
    case "Approved":
      return 3;
    case "Assigned":
      return 4;
    default:
      return null;
  }
}

export default function BookingStageTracker({ status }) {
  const stage = getStage(status);

  const steps = [
    { n: 1, label: "Request submitted" },
    { n: 2, label: "HOD approval" },
    { n: 3, label: "Transport allotment" },
    { n: 4, label: "Driver assigned" },
  ];

  return (
    <div className="bg-black/20 rounded-xl p-3 border border-white/10">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-xs text-white/80">Approval stage</div>
        <StatusBadge status={status} />
      </div>

      <div className="space-y-2">
        {steps.map((s) => {
          const isComplete = stage !== null && s.n < stage;
          const isActive = stage !== null && s.n === stage;
          const dotBg = isActive
            ? "bg-blue-400"
            : isComplete
              ? "bg-green-400"
              : "bg-white/20";

          return (
            <div key={s.n} className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${dotBg} transition-all duration-300`}
              />
              <div className="text-sm text-white/90">{s.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

