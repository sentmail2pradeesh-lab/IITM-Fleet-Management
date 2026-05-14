import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";

function Home(){
const navigate = useNavigate();
const [tripType, setTripType] = useState("");

return(

<div className="min-h-screen bg-[#f4f6f9]">

<Navbar/>

<div className="h-[100px] bg-[#1a2a4a] relative overflow-hidden mt-[72px]">
  <div className="absolute inset-y-0 right-0 w-1/3 opacity-20 bg-[url('/bus-hero.svg')] bg-cover bg-center" />
  <div className="max-w-6xl mx-auto h-full px-6 flex items-center">
    <h1 className="text-white text-2xl font-semibold">IITM Transport Office</h1>
  </div>
</div>

<div className="max-w-6xl mx-auto px-6 py-8">
<div className="bg-white p-8 rounded-xl shadow-[0_4px_16px_rgba(16,24,40,0.08)] flex flex-col items-center gap-4">
<div className="w-full max-w-3xl">
  <h2 className="text-2xl font-extrabold text-slate-900 mb-3 text-center">
    Fleet Booking Portal
  </h2>
  <p className="text-slate-700 text-sm leading-6">
    The IITM Transport Office manages institute vehicles and trip allotments for official purposes.
    This system helps you submit a vehicle request, get Guide/HoD recommendation, and track approval
    and allotment updates through email and the portal.
  </p>
  <div className="mt-6 bg-slate-50 border border-slate-100 rounded-xl p-5">
    <label className="block text-sm font-semibold text-slate-700 mb-2">
      Trip type *
    </label>
    <select
      value={tripType}
      onChange={(e) => setTripType(e.target.value)}
      className="block w-full px-4 py-2 rounded border border-slate-200 text-black"
    >
      <option value="" disabled>
        Select trip type
      </option>
      <option value="inside">Inside IITM</option>
      <option value="outside">Outside IITM</option>
    </select>

    <button
      disabled={!tripType}
      onClick={() => navigate(`/request?trip=${encodeURIComponent(tripType)}`)}
      className="mt-5 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded disabled:opacity-60 w-full"
    >
      Continue for booking
    </button>
  </div>
</div>

</div>
</div>

</div>

)

}

export default Home