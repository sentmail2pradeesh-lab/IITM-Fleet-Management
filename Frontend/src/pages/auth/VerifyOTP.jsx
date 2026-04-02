import { useForm } from "react-hook-form";
import { verifyOtpAndCreateUser } from "../../api/authApi";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useEffect, useMemo, useState } from "react";

function VerifyOTP(){
  const { register, handleSubmit } = useForm();
  const location = useLocation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const email = location.state?.email;
  const data = useMemo(() => location.state?.data, [location.state]);

  useEffect(() => {
    if (!email || !data) navigate("/login");
  }, [email, data, navigate]);

  if (!email || !data) return null;

  const onSubmit = async(formData)=>{
    setSubmitting(true);
    setError("");
    try{
      const otp = formData.otp != null ? String(formData.otp).trim() : "";
      const normalizedEmail = String(email || "").trim().toLowerCase();
      await verifyOtpAndCreateUser({
        email: normalizedEmail,
        otp,
        ...data
      });
      alert("Registration successful. Please login.");
      navigate("/login");
    }catch(e){
      setError(e?.response?.data?.message || "OTP verification failed");
    }finally{
      setSubmitting(false);
    }
  };

  return(
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center"
      style={{backgroundImage:"url('/bus.jpg')"}}
    >
      <Navbar/>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white/30 backdrop-blur-lg p-10 rounded-2xl w-[400px] shadow-xl"
      >
        <h2 className="text-xl font-bold mb-6 text-white">
          Verify OTP
        </h2>

        <p className="text-white/90 text-sm mb-4 break-all">
          OTP sent to: <b>{email}</b>
        </p>

        <input
          placeholder="Enter OTP"
          inputMode="numeric"
          maxLength={6}
          {...register("otp", { required: true })}
          className="w-full mb-3 px-4 py-2 rounded text-gray-900 bg-white border border-gray-300"
        />

        {error && <p className="text-red-200 text-sm mb-3">{error}</p>}

        <button
          disabled={submitting}
          className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-60"
        >
          {submitting ? "Verifying..." : "Verify OTP"}
        </button>
      </form>
    </div>
  );
}

export default VerifyOTP;