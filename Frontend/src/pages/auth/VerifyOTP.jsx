import { useForm } from "react-hook-form";
import { verifyOtpAndCreateUser } from "../../api/authApi";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";

function VerifyOTP() {
  const { register, handleSubmit } = useForm();
  const location = useLocation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const email = location.state?.email;
  const data = useMemo(() => location.state?.data, [location.state]);

  useEffect(() => {
    if (!email || !data) navigate("/login", { replace: true });
  }, [email, data, navigate]);

  if (!email || !data) return null;

  const onSubmit = async (formData) => {
    setSubmitting(true);
    setError("");
    try {
      const otp = formData.otp != null ? String(formData.otp).trim() : "";
      const normalizedEmail = String(email || "").trim().toLowerCase();
      await verifyOtpAndCreateUser({
        email: normalizedEmail,
        otp,
        ...data
      });
      alert("Registration successful. Please login.");
      navigate("/login", { replace: true });
    } catch (e) {
      setError(e?.response?.data?.message || "OTP verification failed");
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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Verify OTP</h2>
          <p className="text-slate-600 text-sm mb-6 break-all">
            OTP sent to: <span className="font-medium text-slate-800">{email}</span>
          </p>

          <form autoComplete="off" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <input
              placeholder="Enter OTP"
              inputMode="numeric"
              maxLength={6}
              autoComplete="off"
              {...register("otp", { required: true })}
              className="w-full px-4 py-2 rounded border border-slate-200 text-slate-900"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size={16} />
                  Verifying…
                </>
              ) : (
                "Verify OTP"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default VerifyOTP;
