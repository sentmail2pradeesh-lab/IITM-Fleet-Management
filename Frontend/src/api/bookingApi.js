import { http } from "./http";

export const createBooking = (data) => http.post("/bookings", data);

export const listPendingBookings = () => http.get("/bookings/pending");
export const listGuidePendingBookings = () => http.get("/bookings/guide-pending");
export const listUpcomingBookings = () => http.get("/bookings/upcoming");

export const guideApproveBooking = (id, payload) =>
  http.patch(`/bookings/${id}/guide-approve`, payload);
export const guideRejectBooking = (id, payload) => http.patch(`/bookings/${id}/guide-reject`, payload);

export const approveBooking = (id, payload) => http.patch(`/bookings/${id}/approve`, payload);
export const rejectBooking = (id) => http.patch(`/bookings/${id}/reject`);

export const supervisorAllot = (id, payload) =>
  http.put(`/bookings/${id}/supervisor-allot`, payload);

export const assignDriver = (id, payload) =>
  http.put(`/bookings/${id}/assign`, payload);

export const reassignVehicle = (id, payload) =>
  http.patch(`/bookings/${id}/reassign`, payload);

export const reportIssue = (id, payload) =>
  http.patch(`/bookings/${id}/report-issue`, payload);

export const getMyBookings = () => http.get("/bookings/my");
export const getBookingById = (id) => http.get(`/bookings/${id}`);
export const getBookingFlow = (id) => http.get(`/bookings/${id}/flow`);
export const listAllBookings = (params) => http.get("/bookings", { params });

export const requestCancellation = (id, reason) =>
  http.patch(`/bookings/${id}/cancel`, { reason });