import type { User } from "../types";
import api from "./api";

export const login = async (email: string, password: string) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};

export const register = async (email: string, password: string) => {
  const response = await api.post("/auth/register", { email, password });
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get("/auth/me");
  return response.data;
};

export const logout = () => {
  localStorage.removeItem("token");
};

export const refreshToken = async (refreshToken: string) => {
  const response = await api.post("/auth/refresh", { refreshToken });
  return response.data;
};
