import api from "../lib/api";
import { Book } from "../types";
import { authService } from "./auth";

const API_URL = "/api/books";

export const bookService = {
  async getAllBooks() {
    try {
      const response = await api.get(API_URL);
      return response.data.map((b: any) => ({ ...b, id: b._id || b.id }));
    } catch (error) {
      console.error("Error fetching books:", error);
      return [];
    }
  },

  async getBookById(id: string) {
    try {
      const response = await api.get(`${API_URL}/${id}`);
      const b = response.data;
      return { ...b, id: b._id || b.id } as Book;
    } catch (error) {
      console.error("Error fetching book:", error);
      return null;
    }
  },

  async getFeaturedBooks() {
    const books = await this.getAllBooks();
    return books.filter(b => b.rating >= 4.5).slice(0, 5);
  },

  async searchBooks(searchTerm: string) {
    const books = await this.getAllBooks();
    const term = searchTerm.toLowerCase();
    return books.filter(book => 
      book.title.toLowerCase().includes(term) || 
      book.author.toLowerCase().includes(term) ||
      book.isbn.includes(term)
    );
  },

  async addBook(bookData: Partial<Book>) {
    const response = await api.post(API_URL, bookData);
    return response.data;
  },

  async updateBook(id: string, bookData: Partial<Book>) {
    const response = await api.put(`${API_URL}/${id}`, bookData);
    return response.data;
  },

  async deleteBook(id: string) {
    const response = await api.delete(`${API_URL}/${id}`);
    return response.data;
  }
};
