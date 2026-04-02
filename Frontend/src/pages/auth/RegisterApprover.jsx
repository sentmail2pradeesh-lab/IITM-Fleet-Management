import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { requestOtpExternal } from "../../api/authApi";
import Navbar from "../../components/Navbar";

function RegisterApprover() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    const email = String(data.email || "").trim().toLowerCase();
    const name = String(data.name || "").trim();
    const phone = String(data.phone || "").trim();
    const password = data.password;

    await requestOtpExternal({ email });

    navigate("/verify-otp", {
      state: {
        email,
        data: {
          name,
          phone,
          password,
          user_type: "supervisor",
          roll_number: null
        }
      }
    });
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/bus.jpg')" }}
    >
      <Navbar />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="
          bg-white/30 backdrop-blur-lg p-10 rounded-2xl
          w-[400px] shadow-xl
        "
      >
        <h2 className="text-xl font-bold mb-6 text-white">
          Transport Supervisor Registration
        </h2>

        <input
          placeholder="Name"
          {...register("name", { required: true })}
          className="w-full mb-3 px-4 py-2 rounded"
        />

        <input
          placeholder="Email"
          autoComplete="off"
          {...register("email", { required: true })}
          className="w-full mb-3 px-4 py-2 rounded"
        />

        <input
          placeholder="Phone"
          {...register("phone", { required: true })}
          className="w-full mb-3 px-4 py-2 rounded"
        />

        <input
          type="password"
          placeholder="Password"
          autoComplete="off"
          {...register("password", { required: true })}
          className="w-full mb-3 px-4 py-2 rounded"
        />

        <button
          className="
            w-full bg-blue-500 text-white py-2 rounded
          "
        >
          Send OTP
        </button>
      </form>
    </div>
  );
}

export default RegisterApprover;

