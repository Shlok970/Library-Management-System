import axios from "axios";
import { BorrowRecord, Book, UserProfile } from "../types";
import { authService } from "./auth";

const API_URL = "/api/borrows";

const getHeaders = () => ({
  headers: { Authorization: `Bearer ${authService.getToken()}` }
});

export const borrowService = {
  async borrowBook(user: UserProfile, book: Book) {
    try {
      const response = await axios.post(API_URL, { bookId: book.id, paymentConfirmed: true }, getHeaders());
      return response.data.id || response.data._id;
    } catch (error) {
      console.error("Error borrowing book:", error);
      throw error;
    }
  },

  async getUserBorrows(userId: string) {
    try {
      const response = await axios.get(`${API_URL}/user`, getHeaders());
      return response.data.map((b: any) => ({ ...b, id: b._id || b.id })) as BorrowRecord[];
    } catch (error) {
      console.error("Error fetching borrows:", error);
      return [];
    }
  },

  async returnBook(borrowId: string) {
    try {
      const response = await axios.post(`${API_URL}/${borrowId}/return`, {}, getHeaders());
      return response.data;
    } catch (error) {
      console.error("Error returning book:", error);
      throw error;
    }
  }
};
