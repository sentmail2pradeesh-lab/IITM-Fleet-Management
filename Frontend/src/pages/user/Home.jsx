import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import VehicleCard from "../../components/VehicleCard";
import { listVehicles } from "../../api/vehicleApi";

function normalizeVehicleType(type) {
  const raw = String(type || "").toUpperCase();
  if (raw === "CART-LARGE" || raw === "E-CART-NON-AC") return "CART-NON-AC";
  if (raw === "E-CART-AC") return "CART-AC";
  return raw || "UNKNOWN";
}

function Home(){

const [error,setError] = useState("");
const [loading,setLoading] = useState(false);
const [vehicles,setVehicles] = useState([]);
const [selectedVehicle, setSelectedVehicle] = useState(null);
const navigate = useNavigate();

const groupedVehicles = useMemo(() => {
  const byType = {};
  for (const v of vehicles) {
    const key = normalizeVehicleType(v.vehicle_type);
    if (!byType[key]) byType[key] = [];
    byType[key].push(v);
  }
  return Object.entries(byType).map(([type, list]) => ({
    type,
    representative: list[0]
  }));
}, [vehicles]);

useEffect(() => {
  async function loadVehicles() {
    setLoading(true);
    setError("");
    try {
      const res = await listVehicles();
      setVehicles(res.data || []);
    } catch (e) {
      setVehicles([]);
      setError(e?.response?.data?.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }
  loadVehicles();
}, []);

return(

<div className="min-h-screen bg-[#f4f6f9]">

<Navbar/>

<div className="h-[100px] bg-[#1a2a4a] relative overflow-hidden mt-[72px]">
  <div className="absolute inset-y-0 right-0 w-1/3 opacity-20 bg-[url('/bus.jpg')] bg-cover bg-center" />
  <div className="max-w-6xl mx-auto h-full px-6 flex items-center">
    <h1 className="text-white text-2xl font-semibold">Vehicle Booking</h1>
  </div>
</div>

<div className="max-w-6xl mx-auto px-6 py-8">
<div className="bg-white p-8 rounded-xl shadow-[0_4px_16px_rgba(16,24,40,0.08)] flex flex-col items-center gap-4">
<p className="text-slate-700 text-sm">
  Select a vehicle type to see details and continue booking.
</p>

{error && (

<p className="text-red-600 text-sm">
{error}
</p>

)}

{/* VEHICLE CARDS */}

<div className="w-full max-w-5xl mt-10 mb-20 px-6">
  {loading && <p className="text-slate-700 text-center">Loading vehicles...</p>}

  {!loading && !error && vehicles.length === 0 && (
    <div className="bg-white rounded-xl p-6 text-slate-700 text-center shadow-[0_4px_16px_rgba(16,24,40,0.08)]">
      No vehicles available.
    </div>
  )}

  {!loading && vehicles.length > 0 && (
    <>
      <div className="bg-white rounded-xl p-4 mb-6 text-slate-800 shadow-[0_4px_16px_rgba(16,24,40,0.08)]">
        <h2 className="text-lg font-semibold mb-2">Vehicles by type</h2>
        <div className="flex flex-wrap gap-3">
          {groupedVehicles.map((g) => (
            <div key={g.type} className="px-3 py-1 rounded-full bg-slate-100 text-sm font-medium">
              {g.type}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
        {groupedVehicles.map((g) => (
          <VehicleCard
            key={g.type}
            vehicle={g.representative}
            selectedDate=""
            onSelect={(vehicle) => setSelectedVehicle(vehicle)}
          />
        ))}
      </div>

      {selectedVehicle && (
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-[0_4px_16px_rgba(16,24,40,0.08)]">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">Selected Vehicle Details</h3>
          <p className="text-slate-700 mb-1">
            <b>Type:</b> {normalizeVehicleType(selectedVehicle.vehicle_type)}
          </p>
          <p className="text-slate-700 mb-4">
            <b>Seating capacity:</b> {selectedVehicle.passenger_capacity}
          </p>
          <button
            onClick={() => navigate(`/vehicle/${selectedVehicle.id}`)}
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
          >
            Continue
          </button>
        </div>
      )}
    </>
  )}
</div>

</div>
</div>

</div>

)

}

export default Home