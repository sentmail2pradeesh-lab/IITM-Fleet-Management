import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { forgotPasswordOtp, resetPasswordOtp } from "../../api/authApi";

function ForgotPassword() {
  const { register, handleSubmit, watch, reset } = useForm();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [stage, setStage] = useState("request"); // request -> verify -> done
  const newPassword = watch("newPassword");

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
        navigate("/login");
      }, 1000);
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
        onSubmit={handleSubmit(stage === "request" ? onRequestOtp : onResetPassword)}
        className="bg-white/30 backdrop-blur-lg p-10 rounded-2xl w-[420px] shadow-xl"
      >
        <h2 className="text-2xl font-bold text-white mb-2">
          {stage === "request" ? "Forgot Password" : "Reset Password"}
        </h2>
        <p className="text-white/90 text-sm mb-6">
          {stage === "request"
            ? "Enter your email and we&apos;ll send an OTP."
            : "Enter OTP and choose your new password."}
        </p>

        <input
          placeholder="Email"
          autoComplete="off"
          {...register("email", { required: true })}
          className="w-full mb-3 px-4 py-2 rounded"
        />

        {stage === "verify" && (
          <>
            <input
              placeholder="OTP"
              inputMode="numeric"
              maxLength={6}
              autoComplete="off"
              {...register("otp", { required: true })}
              className="w-full mb-3 px-4 py-2 rounded"
            />

            <input
              type="password"
              placeholder="New password"
              autoComplete="off"
              {...register("newPassword", { required: true })}
              className="w-full mb-3 px-4 py-2 rounded"
            />

            <input
              type="password"
              placeholder="Confirm password"
              autoComplete="off"
              {...register("confirmPassword", { required: true })}
              className="w-full mb-3 px-4 py-2 rounded"
            />

            {newPassword && (
              <p className="text-white/70 text-xs mb-3">
                Tip: confirm the same password.
              </p>
            )}
          </>
        )}

        {error && <p className="text-red-200 text-sm mb-3">{error}</p>}
        {message && <p className="text-green-100 text-sm mb-3">{message}</p>}

        <button
          disabled={submitting}
          className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-60"
        >
          {submitting
            ? stage === "request"
              ? "Sending..."
              : "Resetting..."
            : stage === "request"
              ? "Send OTP"
              : "Verify OTP & Reset Password"}
        </button>

        <div className="mt-4">
          <button
            type="button"
            className="text-white underline text-sm"
            onClick={() => {
              if (stage === "verify") setStage("request");
              else navigate("/login");
            }}
          >
            Back to login
          </button>
        </div>
      </form>
    </div>
  );
}

export default ForgotPassword;

