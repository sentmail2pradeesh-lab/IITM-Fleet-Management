import Navbar from "../../components/Navbar";
import { useNavigate } from "react-router-dom";

function RegisterType(){

const navigate = useNavigate();

return(

<div
className="
min-h-screen
bg-cover
bg-center
flex
items-center
justify-center
"
style={{backgroundImage:"url('/bus.jpg')"}}
>

<Navbar/>

<div className="
bg-white/30
backdrop-blur-lg
p-10
rounded-2xl
flex
gap-10
shadow-xl
">

<div
onClick={()=>navigate("/register-iit")}
className="
bg-white/40
p-8
rounded-xl
cursor-pointer
text-center
hover:scale-105
transition
"
>

<h2 className="text-xl font-bold">IIT User</h2>
<p className="text-sm mt-2">Register with IIT Email</p>

</div>

<div
onClick={()=>navigate("/register-external")}
className="
bg-white/40
p-8
rounded-xl
cursor-pointer
text-center
hover:scale-105
transition
"
>

<h2 className="text-xl font-bold">External User</h2>
<p className="text-sm mt-2">Non IIT User</p>

</div>

<div
  onClick={()=>navigate("/register-approver")}
  className="
  bg-white/40
  p-8
  rounded-xl
  cursor-pointer
  text-center
  hover:scale-105
  transition
  "
>

  <h2 className="text-xl font-bold">Transport Supervisor</h2>
  <p className="text-sm mt-2">Register as supervisor</p>

</div>

<div
  onClick={()=>navigate("/register-guide-hod")}
  className="
  bg-white/40
  p-8
  rounded-xl
  cursor-pointer
  text-center
  hover:scale-105
  transition
  "
>

  <h2 className="text-xl font-bold">Guide / HoD</h2>
  <p className="text-sm mt-2">Register as first-level approver</p>

</div>

</div>

</div>

)

}

export default RegisterType;