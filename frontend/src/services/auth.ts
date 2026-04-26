import api from "../lib/api";
import { UserProfile, UserRole } from "../types";

const API_URL = "/api/auth";

export const authService = {
  clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  async register(name: string, email: string, password: string, role?: string): Promise<UserProfile> {
    const response = await api.post(`${API_URL}/register`, { name, email, password, role });
    const { token, user: rawUser } = response.data;
    const user = this.mapUser(rawUser);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  },

  async login(email: string, password: string): Promise<UserProfile> {
    const response = await api.post(`${API_URL}/login`, { email, password });
    const { token, user: rawUser } = response.data;
    const user = this.mapUser(rawUser);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  },

  mapUser(user: any): UserProfile {
    return {
      uid: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      status: user.status || "active",
      borrowedCount: user.borrowedCount || 0
    };
  },

  async logout() {
    this.clearSession();
    window.location.reload();
  },

  getUser(): UserProfile | null {
    const userStr = localStorage.getItem("user");
    if (!userStr || userStr === "undefined") return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      localStorage.removeItem("user");
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem("token");
  },

  onAuthStateChange(callback: (user: UserProfile | null) => void) {
    const user = this.getUser();
    callback(user);
    // Return an unsubscribe function (mocked here)
    return () => {};
  }
};
