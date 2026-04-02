export default function SuccessCheck({ text = "Success" }) {
  return (
    <div className="success-check flex items-center gap-3 text-white">
      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="font-semibold">{text}</div>
    </div>
  );
}

