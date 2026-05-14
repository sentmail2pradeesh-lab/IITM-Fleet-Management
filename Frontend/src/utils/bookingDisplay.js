/** Vehicle type from joined vehicles row (see assigned_vehicle_type in API). */
export function bookingVehicleType(b) {
  if (!b) return "";
  const t = b.assigned_vehicle_type ?? b.vehicle_type;
  return String(t ?? "").trim();
}

export function bookingVehicleTitle(b) {
  const t = bookingVehicleType(b);
  const id = b?.vehicle_id;
  const hasId = id !== null && id !== undefined && id !== "";
  if (t && hasId) return `${t} (#${id})`;
  if (t) return t;
  if (hasId) return `Vehicle #${id}`;
  return "Vehicle (pending allotment)";
}

export function bookingVehicleSubtitle(b) {
  const t = bookingVehicleType(b);
  const id = b?.vehicle_id;
  const hasId = id !== null && id !== undefined && id !== "";
  if (t) return hasId ? `Type: ${t} · ID #${id}` : `Type: ${t}`;
  if (hasId) return `Assigned vehicle #${id}`;
  return null;
}

export function bookingVehicleCell(b) {
  const t = bookingVehicleType(b);
  const id = b?.vehicle_id;
  const hasId = id !== null && id !== undefined && id !== "";
  if (t && hasId) return `${t} (#${id})`;
  if (t) return t;
  if (hasId) return `Vehicle #${id}`;
  return "—";
}
