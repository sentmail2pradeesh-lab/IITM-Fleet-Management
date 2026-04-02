import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { resetPassword } from "../../api/authApi";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, watch } = useForm();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const newPassword = watch("newPassword");

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (data.confirmPassword !== data.newPassword) {
        setError("Passwords do not match");
        return;
      }
      if (!token) {
        setError("Reset token missing");
        return;
      }

      await resetPassword(token, { password: data.newPassword });
      setMessage("Password reset successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/bus.jpg')" }}
    >
      <Navbar />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white/30 backdrop-blur-lg p-10 rounded-2xl w-[420px] shadow-xl"
      >
        <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
        <p className="text-white/90 text-sm mb-6">
          Choose a new password.
        </p>

        <input
          type="password"
          placeholder="New password"
          {...register("newPassword", { required: true })}
          className="w-full mb-3 px-4 py-2 rounded"
        />

        <input
          type="password"
          placeholder="Confirm password"
          {...register("confirmPassword", { required: true })}
          className="w-full mb-3 px-4 py-2 rounded"
        />

        {newPassword && (
          <p className="text-white/70 text-xs mb-3">
            Tip: use at least 8 characters.
          </p>
        )}

        {error && <p className="text-red-200 text-sm mb-3">{error}</p>}
        {message && <p className="text-green-100 text-sm mb-3">{message}</p>}

        <button
          disabled={submitting}
          className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-60"
        >
          {submitting ? "Resetting..." : "Reset Password"}
        </button>

        <div className="mt-4">
          <button
            type="button"
            className="text-white underline text-sm"
            onClick={() => navigate("/login")}
          >
            Back to login
          </button>
        </div>
      </form>
    </div>
  );
}

export default ResetPassword;

