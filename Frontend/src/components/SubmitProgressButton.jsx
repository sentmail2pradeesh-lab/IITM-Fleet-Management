import LoadingSpinner from "./LoadingSpinner";

export default function SubmitProgressButton({
  submitting,
  disabled,
  className = "",
  children,
  spinnerText = "Submitting..."
}) {
  return (
    <button
      type="submit"
      disabled={disabled || submitting}
      className={`relative w-full ${className}`}
    >
      {submitting ? (
        <span className="flex items-center justify-center gap-2">
          <LoadingSpinner size={16} />
          {spinnerText}
        </span>
      ) : (
        children
      )}
      {submitting && <div className="submit-progress absolute bottom-0 left-0 right-0" />}
    </button>
  );
}

