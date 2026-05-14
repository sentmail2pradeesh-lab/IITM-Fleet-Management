import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { forgotPasswordOtp, resetPasswordOtp } from "../../api/authApi";
import { AuthContext } from "../../context/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";

function ForgotPassword() {
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      email: "",
      otp: "",
      newPassword: "",
      confirmPassword: ""
    }
  });
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  const newPassword = watch("newPassword");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [stage, setStage] = useState("request");

  useEffect(() => {
    if (isAuthenticated) navigate("/home", { replace: true });
  }, [isAuthenticated, navigate]);

  const onRequestOtp = async (data) => {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const email = String(data.email || "").trim().toLowerCase();
      await forgotPasswordOtp({ email });
      setMessage("OTP sent. Enter OTP and set your new password.");
      setStage("verify");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const onResetPassword = async (data) => {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const email = String(data.email || "").trim().toLowerCase();
      const otp = String(data.otp || "").trim();
      const password = data.newPassword;
      const confirmPassword = data.confirmPassword;

      if (!otp) return setError("OTP is required");
      if (!password) return setError("New password is required");
      if (confirmPassword !== password) {
        return setError("Passwords do not match");
      }

      await resetPasswordOtp({ email, otp, newPassword: password });
      setMessage("Password reset successful. Redirecting to login...");
      setTimeout(() => {
        reset();
        navigate("/login", { replace: true });
      }, 900);
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

      <div className="relative z-10 min-h-screen pt-[72px] grid grid-cols-1 lg:grid-cols-2">
        <div className="hidden lg:flex items-center pl-[8vw] select-none">
          <div className="max-w-md text-white">
            <div className="flex items-center gap-3 mb-5">
              <img src="/iitm-mark.svg" alt="" className="w-12 h-12" />
              <div className="font-bold text-2xl leading-tight">
                IIT Madras Fleet Booking Portal
              </div>
            </div>
            <p className="text-white/80 text-base">
              Reset your password with a one-time code sent to your registered email.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center lg:justify-end pr-[8vw] px-4 py-10">
          <div className="bg-white p-10 rounded-2xl w-full max-w-[430px] shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {stage === "request" ? "Forgot password" : "Reset password"}
            </h2>
            <p className="text-slate-600 text-sm mb-6">
              {stage === "request"
                ? "Enter your email and we will send an OTP."
                : "Enter the OTP and choose your new password."}
            </p>

            <form
              autoComplete="off"
              onSubmit={handleSubmit(stage === "request" ? onRequestOtp : onResetPassword)}
              className="space-y-3"
            >
              <input
                type="email"
                name="forgot_email"
                autoComplete="off"
                placeholder="Email"
                {...register("email", { required: true })}
                className="w-full px-4 py-2 rounded border border-slate-200 text-slate-900"
              />

              {stage === "verify" && (
                <>
                  <input
                    placeholder="OTP"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="off"
                    {...register("otp", { required: true })}
                    className="w-full px-4 py-2 rounded border border-slate-200 text-slate-900"
                  />
                  <input
                    type="password"
                    name="forgot_new_pw"
                    autoComplete="new-password"
                    placeholder="New password"
                    {...register("newPassword", { required: true })}
                    className="w-full px-4 py-2 rounded border border-slate-200 text-slate-900"
                  />
                  <input
                    type="password"
                    name="forgot_confirm_pw"
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    {...register("confirmPassword", { required: true })}
                    className="w-full px-4 py-2 rounded border border-slate-200 text-slate-900"
                  />
                  {newPassword && (
                    <p className="text-slate-500 text-xs">Tip: confirm the same password in both fields.</p>
                  )}
                </>
              )}

              {error && <p className="text-red-600 text-sm">{error}</p>}
              {message && <p className="text-emerald-700 text-sm">{message}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="relative w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60 soft-transition-long"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size={16} />
                    {stage === "request" ? "Sending…" : "Resetting…"}
                  </span>
                ) : stage === "request" ? (
                  "Send OTP"
                ) : (
                  "Verify OTP & reset password"
                )}
              </button>
            </form>

            <div className="mt-4">
              <button
                type="button"
                className="text-slate-700 underline text-sm"
                onClick={() => {
                  if (stage === "verify") {
                    setStage("request");
                    setError("");
                    setMessage("");
                  } else {
                    navigate("/login");
                  }
                }}
              >
                Back to login
              </button>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-600 space-y-1">
              <p className="font-medium text-slate-700">Booking queries</p>
              <p>
                Email:{" "}
                <a className="underline" href="mailto:bustransport@iitm.ac.in">
                  bustransport@iitm.ac.in
                </a>
              </p>
              <p>
                Phone:{" "}
                <a className="underline" href="tel:04422574970">
                  044-22574970 / 044-22575971
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
