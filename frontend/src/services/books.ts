import axios from "axios";
import { Book } from "../types";
import { authService } from "./auth";

const API_URL = "/api/books";

const getHeaders = () => ({
  headers: { Authorization: `Bearer ${authService.getToken()}` }
});

export const bookService = {
  async getAllBooks() {
    try {
      const response = await axios.get(API_URL);
      return response.data.map((b: any) => ({ ...b, id: b._id || b.id }));
    } catch (error) {
      console.error("Error fetching books:", error);
      return [];
    }
  },

  async getBookById(id: string) {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
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
    const response = await axios.post(API_URL, bookData, getHeaders());
    return response.data;
  },

  async updateBook(id: string, bookData: Partial<Book>) {
    const response = await axios.put(`${API_URL}/${id}`, bookData, getHeaders());
    return response.data;
  },

  async deleteBook(id: string) {
    const response = await axios.delete(`${API_URL}/${id}`, getHeaders());
    return response.data;
  }
};
