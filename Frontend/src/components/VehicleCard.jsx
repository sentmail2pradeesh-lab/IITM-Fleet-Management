import { useNavigate } from "react-router-dom"

function VehicleCard({vehicle, selectedDate, availableCount, groupedByType, onSelect}){

const navigate = useNavigate()

return(

<div className="
bg-white/30
backdrop-blur-md
rounded-xl
p-6
text-center
shadow-lg
w-60
hover:bg-white/35
hover:shadow-xl
hover:-translate-y-0.5
transition
">

<h3 className="text-xl font-semibold">
{vehicle.vehicle_type}
</h3>

<p className="text-sm mt-2">
{vehicle.passenger_capacity} members capacity
</p>

{groupedByType && (
  <p className="text-xs mt-1 text-white/90">
    {availableCount} vehicle{availableCount === 1 ? "" : "s"} available
  </p>
)}

<button
onClick={() => {
  if (onSelect) {
    onSelect(vehicle)
    return
  }
  navigate(`/vehicle/${vehicle.id}`, { state: { selectedDate } })
}}
className="
mt-4
bg-blue-400
text-white
px-4
py-1
rounded
"
>

{onSelect ? "Select" : "View Details"}

</button>

</div>

)

}

export default VehicleCard