import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const http = axios.create({ baseURL });

http.interceptors.request.use((config) => {
  const raw = sessionStorage.getItem("user");
  if (!raw) return config;

  try {
    const user = JSON.parse(raw);
    const token = user?.token;
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore malformed sessionStorage
  }

  return config;
});

