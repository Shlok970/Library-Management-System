import axios from "axios";
import { BorrowRecord } from "../types";
import { authService } from "./auth";

const API_URL = "/api/admin/requests";

const getHeaders = () => ({
  headers: { Authorization: `Bearer ${authService.getToken()}` }
});

export const adminService = {
  async getPendingRequests() {
    try {
      const response = await axios.get(API_URL, getHeaders());
      return response.data;
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      return [];
    }
  },

  async approveRequest(id: string, dueDate?: string) {
    try {
      const response = await axios.post(`${API_URL}/${id}/approve`, { dueDate }, getHeaders());
      return response.data;
    } catch (error) {
      console.error("Error approving request:", error);
      throw error;
    }
  },

  async getStats() {
    try {
      const response = await axios.get("/api/admin/stats", getHeaders());
      return response.data as { revenue: number };
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      return { revenue: 0 };
    }
  },

  async denyRequest(id: string) {
    try {
      const response = await axios.post(`${API_URL}/${id}/deny`, {}, getHeaders());
      return response.data;
    } catch (error) {
      console.error("Error denying request:", error);
      throw error;
    }
  }
};
