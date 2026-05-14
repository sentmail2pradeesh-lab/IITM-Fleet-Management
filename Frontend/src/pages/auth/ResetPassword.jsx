import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { resetPassword } from "../../api/authApi";
import LoadingSpinner from "../../components/LoadingSpinner";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, watch } = useForm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const newPassword = watch("newPassword");

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
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
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(10, 20, 50, 0.72) 0%, rgba(10, 20, 50, 0.45) 100%), url('/bus-hero.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <div className="absolute inset-0 bg-[#18315f]/25 mix-blend-multiply pointer-events-none" />
      <div className="absolute inset-0 backdrop-blur-[1px] pointer-events-none" />
      <Navbar />

      <div className="relative z-10 min-h-screen pt-[72px] flex items-center justify-center px-4 py-10">
        <div className="bg-white p-10 rounded-2xl w-full max-w-[430px] shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Reset password</h2>
          <p className="text-slate-600 text-sm mb-6">Choose a new password for your account.</p>

          <form autoComplete="off" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <input
              type="password"
              name="reset_new_pw"
              autoComplete="new-password"
              placeholder="New password"
              {...register("newPassword", { required: true })}
              className="w-full px-4 py-2 rounded border border-slate-200 text-slate-900"
            />
            <input
              type="password"
              name="reset_confirm_pw"
              autoComplete="new-password"
              placeholder="Confirm password"
              {...register("confirmPassword", { required: true })}
              className="w-full px-4 py-2 rounded border border-slate-200 text-slate-900"
            />
            {newPassword && (
              <p className="text-slate-500 text-xs">Tip: use at least 8 characters.</p>
            )}
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {message && <p className="text-emerald-700 text-sm">{message}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size={16} />
                  Resetting…
                </>
              ) : (
                "Reset password"
              )}
            </button>
          </form>

          <div className="mt-4">
            <button
              type="button"
              className="text-slate-700 underline text-sm"
              onClick={() => navigate("/login")}
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
