import Navbar from "../../components/Navbar"
import VehicleCard from "../../components/VehicleCard"
import { useEffect, useState } from "react"
import { getAvailableVehicles } from "../../api/vehicleApi"
import { useNavigate, useSearchParams } from "react-router-dom"

function VehicleSelection(){

const [vehicles,setVehicles] = useState([])
const [loading,setLoading] = useState(false)
const [error,setError] = useState("")
const [params] = useSearchParams()
const navigate = useNavigate()
const date = params.get("date")

useEffect(()=>{

async function fetchVehicles(){

if(!date){
setVehicles([])
return
}

setLoading(true)
setError("")
try{
const res = await getAvailableVehicles(date)
setVehicles(res.data)
}catch(e){
setError(e?.response?.data?.message || "Failed to load vehicles")
}finally{
setLoading(false)
}

}

fetchVehicles()

},[date])

return(

<div className="min-h-screen bg-[#f4f6f9]">

<Navbar/>

<div className="h-[100px] bg-[#1a2a4a] relative overflow-hidden mt-[72px]">
  <div className="absolute inset-y-0 right-0 w-1/3 opacity-20 bg-[url('/bus.jpg')] bg-cover bg-center" />
  <div className="max-w-6xl mx-auto h-full px-6 flex items-center">
    <h2 className="text-white text-2xl font-semibold">Select Vehicle</h2>
  </div>
</div>

<div className="max-w-6xl mx-auto px-6 py-8">
<div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(16,24,40,0.08)] p-8 flex flex-col items-center">

<h2 className="text-slate-800 text-3xl mb-2 font-semibold">
SELECT VEHICLE
</h2>

<p className="text-slate-600 mb-8">
Date: <b>{date || "not selected"}</b>
</p>

{!date && (
<button
onClick={()=>navigate("/home")}
className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 mb-10"
>
Choose a date
</button>
)}

{loading && <p className="text-slate-700 mb-6">Loading...</p>}
{error && <p className="text-red-600 mb-6">{error}</p>}

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">

{vehicles.map(v => (

<VehicleCard key={v.id} vehicle={v}/>

))}

</div>

</div>
</div>

</div>

)

}

export default VehicleSelection