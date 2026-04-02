import { http } from "./http";

export const getAvailableVehicles = (date) =>
  http.get(`/vehicles/available?date=${date}`);

export const getVehicleDetails = (type) =>
  http.get(`/vehicles/type/${type}`);

export const listVehicles = () => http.get("/vehicles");

export const addVehicle = (formData) => http.post("/vehicles", formData);
export const addVehiclesBulk = (formData) => http.post("/vehicles/bulk", formData);
export const updateVehicle = (id, formData) => http.patch(`/vehicles/${id}`, formData);
export const deleteVehicle = (id) => http.delete(`/vehicles/${id}`);
export const setVehicleStatus = (id, status) =>
  http.put(`/vehicles/${id}/status`, { status });