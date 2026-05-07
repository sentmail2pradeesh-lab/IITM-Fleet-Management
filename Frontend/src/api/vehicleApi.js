import { http } from "./http";

export const getAvailableVehicles = ({ date, start_time, end_time }) =>
  http.get("/vehicles/available", { params: { date, start_time, end_time } });

export const getVehicleAvailabilitySummary = ({ date, start_time, end_time }) =>
  http.get("/vehicles/availability-summary", { params: { date, start_time, end_time } });

export const getVehicleAvailabilityByType = ({ date, type, start_time, end_time }) =>
  http.get("/vehicles/availability-by-type", {
    params: { date, type, start_time, end_time }
  });

export const getVehicleBookedDates = (id, params) =>
  http.get(`/vehicles/${id}/booked-dates`, { params });

export const getVehicleDetails = (type) =>
  http.get(`/vehicles/type/${type}`);

export const listVehicles = () => http.get("/vehicles");

export const addVehicle = (formData) => http.post("/vehicles", formData);
export const addVehiclesBulk = (formData) => http.post("/vehicles/bulk", formData);
export const updateVehicle = (id, formData) => http.patch(`/vehicles/${id}`, formData);
export const deleteVehicle = (id, { force = false } = {}) =>
  http.delete(`/vehicles/${id}`, { params: force ? { force: true } : undefined });

export const deleteAllVehicles = (confirmPhrase) =>
  http.delete("/vehicles/all", {
    params: { force: true, confirmPhrase }
  });
export const setVehicleStatus = (id, status, extra = {}) =>
  http.put(`/vehicles/${id}/status`, { status, ...extra });