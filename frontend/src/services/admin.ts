import api from "../lib/api";
import { BorrowRecord } from "../types";
import { authService } from "./auth";

const API_URL = "/api/admin/requests";

export const adminService = {
  async getPendingRequests() {
    try {
      const response = await api.get(API_URL);
      return response.data;
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      return [];
    }
  },

  async approveRequest(id: string, dueDate?: string) {
    try {
      const response = await api.post(`${API_URL}/${id}/approve`, { dueDate });
      return response.data;
    } catch (error) {
      console.error("Error approving request:", error);
      throw error;
    }
  },

  async getStats() {
    try {
      const response = await api.get("/api/admin/stats");
      return response.data as { revenue: number };
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      return { revenue: 0 };
    }
  },

  async denyRequest(id: string) {
    try {
      const response = await api.post(`${API_URL}/${id}/deny`, {});
      return response.data;
    } catch (error) {
      console.error("Error denying request:", error);
      throw error;
    }
  }
};
