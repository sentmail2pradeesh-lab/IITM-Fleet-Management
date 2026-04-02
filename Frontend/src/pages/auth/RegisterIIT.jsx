import { useForm } from "react-hook-form";
import { requestOtpIIT } from "../../api/authApi";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";

function RegisterIIT(){

const { register, handleSubmit } = useForm();
const navigate = useNavigate();

const onSubmit = async(data)=>{

const roll_number = data.roll_number?.trim();
const email = `${roll_number}@smail.iitm.ac.in`.trim().toLowerCase();

await requestOtpIIT({
  name: data.name,
  phone: data.phone,
  roll_number,
  password: data.password
});

navigate("/verify-otp", {
  state: {
    email,
    data: {
      name: data.name,
      phone: data.phone,
      roll_number,
      password: data.password,
      user_type: "iit"
    }
  }
});
};

return(

<div
className="min-h-screen bg-cover bg-center flex items-center justify-center"
style={{backgroundImage:"url('/bus.jpg')"}}
>
<Navbar/>

<form
onSubmit={handleSubmit(onSubmit)}
className="
bg-white/30
backdrop-blur-lg
p-10
rounded-2xl
w-[400px]
shadow-xl
"
>

<h2 className="text-xl font-bold mb-6 text-white">
IIT Registration
</h2>

<input
placeholder="Name"
{...register("name")}
className="w-full mb-3 px-4 py-2 rounded"
/>

<input
placeholder="Phone"
{...register("phone")}
className="w-full mb-3 px-4 py-2 rounded"
/>

<input
placeholder="Roll Number"
{...register("roll_number")}
className="w-full mb-3 px-4 py-2 rounded"
/>

<input
type="password"
placeholder="Password"
{...register("password")}
className="w-full mb-3 px-4 py-2 rounded"
/>

<button className="
w-full
bg-blue-500
text-white
py-2
rounded
">
Send OTP
</button>

</form>

</div>

)

}

export default RegisterIIT;