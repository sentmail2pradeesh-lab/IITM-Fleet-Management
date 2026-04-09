import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
});

export const loginUser = (data) => API.post("/auth/login", data);

// Registration is a 2-step process:
// 1) request OTP (IIT or external)
// 2) verify OTP + submit full registration payload (user created in verify step)
export const requestOtpIIT = (data) => API.post("/auth/register/iit", data);
export const requestOtpExternal = (data) =>
  API.post("/auth/register/external", data);

export const verifyOtpAndCreateUser = (data) => API.post("/auth/verify-otp", data);

export const forgotPassword = (data) =>
  API.post("/auth/forgot-password", data);

export const resetPassword = (token, data) =>
  API.post(`/auth/reset-password/${token}`, data);

// OTP-based password reset (no reset link)
export const forgotPasswordOtp = (data) =>
  API.post("/auth/forgot-password-otp", data);

export const resetPasswordOtp = (data) =>
  API.post("/auth/reset-password-otp", data);

// Fetch authenticated user's profile/role from backend
export const getMe = () => {
  const raw = sessionStorage.getItem("user");
  const token = (() => {
    try {
      const user = JSON.parse(raw);
      return user?.token;
    } catch {
      return null;
    }
  })();
  return API.get("/auth/me", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
};