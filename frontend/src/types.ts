export enum UserRole {
  GUEST = "guest",
  MEMBER = "member",
  ADMIN = "admin",
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "suspended";
  borrowedCount: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string;
  image: string;
  totalCopies: number;
  availableCopies: number;
  rating: number;
  reviewCount: number;
  publishedDate?: string;
}

export interface BorrowRecord {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  bookImage: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: "borrowed" | "returned" | "overdue" | "pending_return" | "pending" | "denied";
  fine: number;
  borrowFee: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  bookId: string;
  rating: number;
  comment: string;
  date: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: "info" | "warning" | "success";
}
