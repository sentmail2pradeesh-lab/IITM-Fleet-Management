import { useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import VehicleCard from "../../components/VehicleCard";
import { getAvailableVehicles } from "../../api/vehicleApi";

function Home(){

const [date,setDate] = useState("");
const [error,setError] = useState("");
const [loading,setLoading] = useState(false);
const [vehicles,setVehicles] = useState([]);
const [hasChecked, setHasChecked] = useState(false);

const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

const typeCounts = useMemo(() => {
  const counts = {};
  for (const v of vehicles) {
    const key = v.vehicle_type || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}, [vehicles]);

const groupedVehicles = useMemo(() => {
  const byType = {};
  for (const v of vehicles) {
    const key = v.vehicle_type || "Unknown";
    if (!byType[key]) byType[key] = [];
    byType[key].push(v);
  }
  return Object.entries(byType).map(([type, list]) => ({
    type,
    count: list.length,
    representative: list[0]
  }));
}, [vehicles]);

const handleCheck = ()=>{

if(!date){
setError("Select a date to see vehicles");
return;
}

if (date < today) {
  setError("Please select today or a future date");
  return;
}

setLoading(true);
setError("");
setHasChecked(true);
getAvailableVehicles(date)
  .then(res=>{
    setVehicles(res.data || []);
  })
  .catch(e=>{
    setVehicles([]);
    setError(e?.response?.data?.message || "Failed to load vehicles");
  })
  .finally(()=>setLoading(false));

}

return(

<div className="min-h-screen bg-[#f4f6f9]">

<Navbar/>

<div className="h-[100px] bg-[#1a2a4a] relative overflow-hidden mt-[72px]">
  <div className="absolute inset-y-0 right-0 w-1/3 opacity-20 bg-[url('/bus.jpg')] bg-cover bg-center" />
  <div className="max-w-6xl mx-auto h-full px-6 flex items-center">
    <h1 className="text-white text-2xl font-semibold">Vehicle Availability</h1>
  </div>
</div>

<div className="max-w-6xl mx-auto px-6 py-8">
<div className="bg-white p-8 rounded-xl shadow-[0_4px_16px_rgba(16,24,40,0.08)] flex flex-col items-center gap-4">

<input
type="date"
value={date}
onChange={(e) => {
  const v = e.target.value;
  setDate(v);

  if (v && v < today) {
    setError("Please select today or a future date");
  } else {
    setError("");
  }
}}
min={today}
className="px-4 py-2 rounded text-black"
/>

<button
onClick={handleCheck}
className="
bg-blue-500
text-white
px-6
py-2
rounded
hover:bg-blue-600
"
>

Check Availability

</button>

{error && (

<p className="text-red-600 text-sm">
{error}
</p>

)}

{/* VEHICLE CARDS */}

<div className="w-full max-w-5xl mt-10 mb-20 px-6">
  {loading && <p className="text-slate-700 text-center">Loading available vehicles...</p>}

  {!loading && !error && hasChecked && date && vehicles.length === 0 && (
    <div className="bg-white rounded-xl p-6 text-slate-700 text-center shadow-[0_4px_16px_rgba(16,24,40,0.08)]">
      No vehicles available for <b>{date}</b>.
    </div>
  )}

  {!loading && hasChecked && vehicles.length > 0 && (
    <>
      <div className="bg-white rounded-xl p-4 mb-6 text-slate-800 shadow-[0_4px_16px_rgba(16,24,40,0.08)]">
        <h2 className="text-lg font-semibold mb-2">Available vehicles by type</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(typeCounts).map(([type, count]) => (
            <div
              key={type}
              className="px-3 py-1 rounded-full bg-slate-100 text-sm"
            >
              <span className="font-medium">{type}</span>
              <span className="ml-2 text-slate-500">{count} available</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
        {groupedVehicles.map((g) => (
          <VehicleCard
            key={g.type}
            vehicle={g.representative}
            selectedDate={date}
            availableCount={g.count}
            groupedByType
          />
        ))}
      </div>
    </>
  )}
</div>

</div>
</div>

</div>

)

}

export default Home