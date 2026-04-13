import { http } from "./http";

export const getAvailableVehicles = (date) =>
  http.get(`/vehicles/available?date=${date}`);

export const getVehicleAvailabilitySummary = (date) =>
  http.get(`/vehicles/availability-summary?date=${date}`);

export const getVehicleAvailabilityByType = ({ date, type }) =>
  http.get(`/vehicles/availability-by-type?date=${date}&type=${encodeURIComponent(type)}`);

export const getVehicleBookedDates = (id, params) =>
  http.get(`/vehicles/${id}/booked-dates`, { params });

export const getVehicleDetails = (type) =>
  http.get(`/vehicles/type/${type}`);

export const listVehicles = () => http.get("/vehicles");

export const addVehicle = (formData) => http.post("/vehicles", formData);
export const addVehiclesBulk = (formData) => http.post("/vehicles/bulk", formData);
export const updateVehicle = (id, formData) => http.patch(`/vehicles/${id}`, formData);
export const deleteVehicle = (id) => http.delete(`/vehicles/${id}`);
export const setVehicleStatus = (id, status) =>
  http.put(`/vehicles/${id}/status`, { status });