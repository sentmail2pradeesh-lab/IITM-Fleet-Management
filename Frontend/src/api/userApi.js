import { http } from "./http";

export const listUsers = (role) => http.get("/users", { params: role ? { role } : {} });
export const createUser = (payload) => http.post("/users", payload);
export const deleteUser = (id) => http.delete(`/users/${id}`);
