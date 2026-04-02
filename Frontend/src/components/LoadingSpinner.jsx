export default function LoadingSpinner({ size = 18 }) {
  return (
    <span
      className="loading-spinner inline-block"
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  );
}

