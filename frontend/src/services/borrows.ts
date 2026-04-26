import api from "../lib/api";
import { BorrowRecord, Book, UserProfile } from "../types";
import { authService } from "./auth";

const API_URL = "/api/borrows";

export const borrowService = {
  async borrowBook(user: UserProfile, book: Book) {
    try {
      const response = await api.post(API_URL, { bookId: book.id, paymentConfirmed: true });
      return response.data.id || response.data._id;
    } catch (error) {
      console.error("Error borrowing book:", error);
      throw error;
    }
  },

  async getUserBorrows(userId: string) {
    try {
      const response = await api.get(`${API_URL}/user`);
      return response.data.map((b: any) => ({ ...b, id: b._id || b.id })) as BorrowRecord[];
    } catch (error) {
      console.error("Error fetching borrows:", error);
      return [];
    }
  },

  async returnBook(borrowId: string) {
    try {
      const response = await api.post(`${API_URL}/${borrowId}/return`, {});
      return response.data;
    } catch (error) {
      console.error("Error returning book:", error);
      throw error;
    }
  }
};
