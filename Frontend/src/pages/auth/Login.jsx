import { useContext, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getMe, loginUser } from "../../api/authApi";
import { AuthContext } from "../../context/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import SuccessCheck from "../../components/SuccessCheck";

function Login() {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { email: "", password: "" }
  });
  const navigate = useNavigate();
  const { login, isAuthenticated } = useContext(AuthContext);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const defaultEmailHint = useMemo(
    () => "rollnumber@smail.iitm.ac.in",
    []
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    reset({ email: "", password: "" });
  }, [reset]);

  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) {
        reset({ email: "", password: "" });
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [reset]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError("");
    setSuccess(false);
    try {
      const res = await loginUser({
        email: data.email?.trim(),
        password: data.password
      });

      const token = res.data.token;
      login({ token });

      const meRes = await getMe();
      const me = meRes.data || {};
      login({
        token,
        role: me?.role || "requester",
        id: me?.id,
        name: me?.name,
        email: me?.email
      });

      const role = me?.role || "requester";
      const target =
        role === "guide_hod"
          ? "/guide/pending"
          : role === "approver" || role === "supervisor" || role === "oic"
            ? "/approver"
            : role === "admin"
              ? "/admin/dashboard"
              : role === "driver"
                ? "/driver/dashboard"
                : "/home";

      setSuccess(true);
      setTimeout(() => navigate(target, { replace: true }), 350);
    } catch (e) {
      setError(e?.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(10, 20, 50, 0.72) 0%, rgba(10, 20, 50, 0.45) 100%), url('/bus.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-[#18315f]/25 mix-blend-multiply pointer-events-none" />
      <div className="absolute inset-0 backdrop-blur-[1px] pointer-events-none" />
      <Navbar />

      <div className="relative z-10 min-h-screen pt-[72px] grid grid-cols-1 lg:grid-cols-2">
        <div className="hidden lg:flex items-center pl-[8vw]">
          <div className="max-w-md text-white">
            <div className="flex items-center gap-3 mb-5">
              <img src="/IIT_Madras_Logo.svg.png" alt="IITM" className="w-12 h-12" />
              <div className="font-bold text-2xl leading-tight">
                IIT Madras Fleet Booking Portal
              </div>
            </div>
            <p className="text-white/80 text-base">
              Streamlined vehicle booking for the IIT Madras community
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center lg:justify-end pr-[8vw] px-4 py-10">
          <form
            autoComplete="off"
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white p-10 rounded-2xl w-full max-w-[430px] shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Login</h2>
            <p className="text-slate-600 text-sm mb-6">
              Login with your institution account credentials (example: <b>{defaultEmailHint}</b>).
            </p>

            <input
              type="email"
              name="login_email_field"
              autoComplete="off"
              placeholder="Email"
              {...register("email")}
              className="w-full mb-3 px-4 py-2 rounded border border-slate-200"
            />

            <input
              type="password"
              name="login_password_field"
              autoComplete="new-password"
              placeholder="Password"
              {...register("password")}
              className="w-full mb-3 px-4 py-2 rounded border border-slate-200"
            />

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <button
              disabled={submitting}
              className="relative w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60 soft-transition-long"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size={16} />
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
              {submitting && (
                <div className="submit-progress absolute bottom-0 left-0 right-0" />
              )}
            </button>

            {success && (
              <div className="mt-4 flex justify-center">
                <SuccessCheck text="Logged in successfully" />
              </div>
            )}

            <div className="mt-4 flex items-center justify-start text-sm">
              <button
                type="button"
                className="text-slate-700 underline"
                onClick={() => navigate("/forgot-password")}
              >
                Forgot password?
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
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
