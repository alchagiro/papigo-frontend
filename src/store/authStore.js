import { create } from "zustand";
import axios from "axios";
import { API_URL } from "../config";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.suspended) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login?error=suspended";
    }
    if (error.response?.status === 403 && error.response?.data?.pendingApproval) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login?error=pending";
    }
    return Promise.reject(error);
  }
);

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem("user")) || null,
  token: localStorage.getItem("token") || null,
  isAuthenticated: !!localStorage.getItem("token"),

  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { user, token } = response.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
    return user;
  },

  register: async (name, email, phone, password, role) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      phone,
      password,
      role,
    });
    
    // Si es conductor, NO iniciar sesion automaticamente
    if (role === 'driver') {
      return { ...response.data, pendingApproval: true };
    }
    
    const { user, token } = response.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
    return user;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

export { api };
