import Navbar from "../../components/Navbar";

export default function DriverDashboard() {
  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <Navbar />
      <div className="h-[100px] bg-[#1a2a4a] relative overflow-hidden mt-[72px]">
        <div className="absolute inset-y-0 right-0 w-1/3 opacity-20 bg-[url('/bus.jpg')] bg-cover bg-center" />
        <div className="max-w-4xl mx-auto h-full px-6 flex items-center">
          <h1 className="text-white text-2xl font-semibold">Driver Dashboard</h1>
        </div>
      </div>
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl p-8 border border-slate-200 shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
          <h1 className="text-2xl font-semibold text-slate-900">
            Driver Dashboard
          </h1>
          <p className="text-slate-600 mt-2">
            This panel can show assigned trip details for drivers.
          </p>
        </div>
      </div>
    </div>
  );
}

