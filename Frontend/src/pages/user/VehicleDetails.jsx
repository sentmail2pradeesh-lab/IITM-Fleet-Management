import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { listVehicles } from "../../api/vehicleApi";

function apiImg(path) {
  if (!path) return null;
  if (String(path).startsWith("http")) return path;
  return `http://localhost:5000/${path}`;
}

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedDate = location.state?.selectedDate;

  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    async function fetchVehicle() {
      try {
        setError("");
        const res = await listVehicles();
        const found = res.data.find((v) => String(v.id) === String(id));
        setVehicle(found || null);
        if (!found) setError("Vehicle not found");
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load vehicle details");
      }
    }
    fetchVehicle();
  }, [id]);

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-[#f4f6f9]">
        <Navbar />
        <p className="text-slate-700 text-center mt-28">{error || "Loading..."}</p>
      </div>
    );
  }

  const images = [apiImg(vehicle.image1), apiImg(vehicle.image2), apiImg(vehicle.image3)];

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <Navbar />

      <div className="h-[100px] bg-[#1a2a4a] relative overflow-hidden mt-[72px]">
        <div className="absolute inset-y-0 right-0 w-1/3 opacity-20 bg-[url('/bus.jpg')] bg-cover bg-center" />
        <div className="max-w-5xl mx-auto h-full px-6 flex items-center">
          <h2 className="text-white text-2xl font-semibold">Vehicle Details</h2>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="bg-white rounded-2xl p-10 w-full shadow-[0_8px_24px_rgba(16,24,40,0.08)] text-center">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-black font-medium hover:underline"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold">Vehicle Details</h2>
          <div className="w-16" />
        </div>

        <div className="flex justify-center gap-6 mb-8">
          {images.map((src, idx) =>
            src ? (
              <img
                key={`${src}-${idx}`}
                src={src}
                className="w-28 h-24 rounded-xl object-cover cursor-pointer hover:scale-105 transition"
                onClick={() => setActiveImage(src)}
                alt="Vehicle"
              />
            ) : (
              <div key={`empty-${idx}`} className="w-28 h-24 rounded-xl border border-dashed border-slate-300 grid place-items-center text-xs text-slate-500">
                Image {idx + 1}
              </div>
            )
          )}
        </div>

        <div className="text-left mb-6">
          <p>
            <b>Vehicle Type:</b> {vehicle.vehicle_type}
          </p>
          <p>
            <b>Capacity:</b> {vehicle.passenger_capacity} members
          </p>
        </div>

        <button
          onClick={() => navigate(`/booking/${vehicle.id}`, { state: { selectedDate } })}
          className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
        >
          Continue
        </button>
      </div>
      </div>

      {activeImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-6"
          onClick={() => setActiveImage(null)}
        >
          <img
            src={activeImage}
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            alt="Full"
          />
        </div>
      )}
    </div>
  );
}

