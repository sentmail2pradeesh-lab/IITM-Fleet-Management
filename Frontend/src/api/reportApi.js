import { http } from "./http";

export const getUsageReport = (params) =>
  http.get("/reports/usage", { params });

export const getReportVehicleTypes = () => http.get("/reports/vehicle-types");

