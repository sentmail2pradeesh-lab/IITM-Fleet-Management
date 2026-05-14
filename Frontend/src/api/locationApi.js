import { http } from "./http";

export const listLocations = () => http.get("/locations");

export const listLocationsManage = () => http.get("/locations/manage");

export const createLocation = (body) => http.post("/locations", body);

export const updateLocation = (id, body) => http.patch(`/locations/${id}`, body);

export const deleteLocation = (id) => http.delete(`/locations/${id}`);
