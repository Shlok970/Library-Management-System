import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import { User } from "./models/User.ts";
import { Book } from "./models/Book.ts";
import { Borrow } from "./models/Borrow.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "your_fallback_secret_key";
const BORROW_FEE_USD = 2;
const OVERDUE_FINE_USD = 5;

const applyOverdueFineIfNeeded = async (borrow: any) => {
  if (borrow.status !== "borrowed" || !borrow.dueDate) return false;

  const isOverdue = new Date(borrow.dueDate).getTime() < Date.now();
  if (!isOverdue) return false;

  borrow.status = "overdue";
  borrow.fine = Math.max(borrow.fine || 0, OVERDUE_FINE_USD);
  await borrow.save();
  return true;
};

async function startServer() {
  // Connect to MongoDB
  const mongodbUri = process.env.MONGODB_URI || "mongodb+srv://shloknagda11_db_user:shlok_2006@librarymanagementsystem.7fuery4.mongodb.net/library?retryWrites=true&w=majority&appName=LibraryManagementSystem";
  console.log("Connecting to MongoDB...");
  try {
    await mongoose.connect(mongodbUri);
    console.log("Connected to MongoDB successfully");
    
    // Seed initial admin and books if needed
    console.log("Seeding data...");
    await seedInitialData();
    console.log("Data seeding completed");
  } catch (err) {
    console.error("MongoDB connection error details:", err);
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ message: "Invalid token" });
      req.user = user;
      next();
    });
  };

  const authorizeAdmin = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: "Admin access required" });
    }
  };

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      console.log("Registration attempt:", { name, email, role });
      
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: "User already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ 
        name, 
        email, 
        password: hashedPassword,
        role: role === "admin" ? "admin" : "member"
      });
      await user.save();
      console.log("User saved:", user._id);

      const token = jwt.sign({ id: user._id.toString(), role: user.role, name: user.name, email: user.email }, JWT_SECRET);
      res.status(201).json({ 
        token, 
        user: { 
          uid: user._id.toString(), 
          id: user._id.toString(),
          name: user.name, 
          email: user.email, 
          role: user.role,
          status: user.status,
          borrowedCount: user.borrowedCount
        } 
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(500).json({ message: `Error registering user: ${err.message}` });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("Login attempt:", email);
      
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: "User not found" });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ message: "Invalid password" });

      const token = jwt.sign({ id: user._id.toString(), role: user.role, name: user.name, email: user.email }, JWT_SECRET);
      res.json({ 
        token, 
        user: { 
          uid: user._id.toString(), 
          id: user._id.toString(),
          name: user.name, 
          email: user.email, 
          role: user.role, 
          status: user.status,
          borrowedCount: user.borrowedCount
        } 
      });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ message: `Error logging in: ${err.message}` });
    }
  });

  // Book Routes
  app.get("/api/books", async (req, res) => {
    try {
      const books = await Book.find().sort({ createdAt: -1 });
      res.json(books);
    } catch (err) {
      res.status(500).json({ message: "Error fetching books" });
    }
  });

  app.get("/api/books/:id", async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ message: "Book not found" });
      res.json(book);
    } catch (err) {
      res.status(500).json({ message: "Error fetching book" });
    }
  });

  app.post("/api/books", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
      const book = new Book(req.body);
      await book.save();
      res.status(201).json(book);
    } catch (err) {
      res.status(500).json({ message: "Error creating book" });
    }
  });

  app.put("/api/books/:id", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
      const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(book);
    } catch (err) {
      res.status(500).json({ message: "Error updating book" });
    }
  });

  app.delete("/api/books/:id", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
      await Book.findByIdAndDelete(req.params.id);
      res.json({ message: "Book deleted" });
    } catch (err) {
      res.status(500).json({ message: "Error deleting book" });
    }
  });

  // Borrow Routes
  app.get("/api/borrows/user", authenticateToken, async (req: any, res) => {
    try {
      const borrows = await Borrow.find({ userId: req.user.id }).sort({ issueDate: -1 });
      await Promise.all(borrows.map((borrow) => applyOverdueFineIfNeeded(borrow)));
      res.json(borrows);
    } catch (err) {
      res.status(500).json({ message: "Error fetching borrows" });
    }
  });

  app.post("/api/borrows", authenticateToken, async (req: any, res) => {
    try {
      const { bookId, paymentConfirmed } = req.body;
      if (!paymentConfirmed) {
        return res.status(400).json({ message: "Borrow payment of $2 is required" });
      }

      const book = await Book.findById(bookId);
      if (!book || book.availableCopies <= 0) {
        return res.status(400).json({ message: "Book not available" });
      }

      const borrow = new Borrow({
        userId: req.user.id,
        bookId: book._id,
        bookTitle: book.title,
        bookImage: book.image,
        status: "pending",
        borrowFee: BORROW_FEE_USD
      });

      await borrow.save();
      // Note: We don't decrement availableCopies or increment borrowedCount until approved.

      res.status(201).json(borrow);
    } catch (err) {
      res.status(500).json({ message: "Error requesting book" });
    }
  });

  app.post("/api/borrows/:id/return", authenticateToken, async (req, res) => {
    try {
      const borrow = await Borrow.findById(req.params.id);
      if (!borrow || !["borrowed", "overdue"].includes(borrow.status)) {
        return res.status(400).json({ message: "Invalid borrow record" });
      }

      if (borrow.dueDate && new Date(borrow.dueDate).getTime() < Date.now()) {
        borrow.fine = Math.max(borrow.fine || 0, OVERDUE_FINE_USD);
      }

      borrow.status = "pending_return";
      await borrow.save();

      res.json(borrow);
    } catch (err) {
      res.status(500).json({ message: "Error returning book" });
    }
  });

  // Admin: Get all Users
  app.get("/api/admin/users", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
      const users = await User.find().select("-password");
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  // Admin: Get pending requests
  app.get("/api/admin/requests", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
      const requests = await Borrow.find({ status: { $in: ["pending", "pending_return"] } })
        .populate("userId", "name email")
        .sort({ issueDate: -1 });

      // We need to calculate total fines for each user to display to the admin.
      // This is a naive approach; in production, you might aggregate this.
      const requestsWithUserDetails = await Promise.all(requests.map(async (req: any) => {
        const userBorrows = await Borrow.find({ userId: req.userId._id });
        await Promise.all(userBorrows.map((borrow) => applyOverdueFineIfNeeded(borrow)));
        const totalFine = userBorrows.reduce((acc, curr) => acc + (curr.fine || 0), 0);
        return {
          ...req.toJSON(),
          user: req.userId,
          totalFine
        };
      }));

      res.json(requestsWithUserDetails);
    } catch (err) {
      res.status(500).json({ message: "Error fetching requests" });
    }
  });

  // Admin: Approve request
  app.post("/api/admin/requests/:id/approve", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
      const { dueDate } = req.body;
      const borrow = await Borrow.findById(req.params.id);
      if (!borrow || !["pending", "pending_return"].includes(borrow.status)) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const book = await Book.findById(borrow.bookId);

      if (borrow.status === "pending") {
        if (!book || book.availableCopies <= 0) {
          return res.status(400).json({ message: "Book no longer available" });
        }
        const parsedDueDate = dueDate ? new Date(dueDate) : null;
        if (!parsedDueDate || Number.isNaN(parsedDueDate.getTime())) {
          return res.status(400).json({ message: "Valid due date is required" });
        }

        borrow.status = "borrowed";
        borrow.dueDate = parsedDueDate;
        await borrow.save();

        book.availableCopies -= 1;
        await book.save();

        await User.findByIdAndUpdate(borrow.userId, { $inc: { borrowedCount: 1 } });
      } else if (borrow.status === "pending_return") {
        borrow.status = "returned";
        borrow.returnDate = new Date();
        if (borrow.dueDate && new Date(borrow.dueDate).getTime() < borrow.returnDate.getTime()) {
          borrow.fine = Math.max(borrow.fine || 0, OVERDUE_FINE_USD);
        }
        await borrow.save();

        if (book) {
          book.availableCopies += 1;
          await book.save();
        }
      }

      res.json(borrow);
    } catch (err) {
      res.status(500).json({ message: "Error approving request" });
    }
  });

  // Admin: Deny request
  app.post("/api/admin/requests/:id/deny", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
      const borrow = await Borrow.findById(req.params.id);
      if (!borrow) {
        return res.status(404).json({ message: "Request not found" });
      }

      if (borrow.status === "pending") {
        borrow.status = "denied";
      } else if (borrow.status === "pending_return") {
        borrow.status = "borrowed";
      }
      
      await borrow.save();
      res.json(borrow);
    } catch (err) {
      res.status(500).json({ message: "Error denying request" });
    }
  });

  app.get("/api/admin/stats", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
      const borrows = await Borrow.find();
      await Promise.all(borrows.map((borrow) => applyOverdueFineIfNeeded(borrow)));
      // Backfill old records created before borrowFee was introduced.
      const revenueEligibleStatuses = ["pending", "borrowed", "pending_return", "returned", "overdue"];
      await Promise.all(
        borrows.map(async (borrow) => {
          if ((borrow.borrowFee === undefined || borrow.borrowFee === null) && revenueEligibleStatuses.includes(borrow.status)) {
            borrow.borrowFee = BORROW_FEE_USD;
            await borrow.save();
          }
        })
      );

      const refreshedBorrows = await Borrow.find();
      const revenue = refreshedBorrows.reduce((total, borrow) => total + (borrow.borrowFee || 0) + (borrow.fine || 0), 0);
      res.json({ revenue });
    } catch (err) {
      res.status(500).json({ message: "Error fetching admin stats" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite integration
  const frontendPath = path.resolve(__dirname, "../frontend");
  
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: frontendPath
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(frontendPath, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lumina Library server running on http://localhost:${PORT}`);
  });
}

async function seedInitialData() {
  // Seed Admin
  const adminEmail = "admin@lumina.com";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await User.create({
      name: "System Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin"
    });
    console.log("Seed: Admin created (admin@lumina.com / admin123)");
  }

  // Seed Books
  const coreBooks = [
    {
      title: "Rich Dad Poor Dad",
      author: "Robert T. Kiyosaki",
      isbn: "978-1-61268-019-4",
      category: "Finance",
      description: "What the Rich Teach Their Kids About Money - That the Poor and Middle Class Do Not!",
      image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800",
      totalCopies: 5,
      availableCopies: 5,
      rating: 4.8,
      reviewCount: 1250,
      featured: true
    },
    {
      title: "Atomic Habits",
      author: "James Clear",
      isbn: "978-0-73521-129-2",
      category: "Self-Help",
      description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones.",
      image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=800",
      totalCopies: 3,
      availableCopies: 3,
      rating: 4.9,
      reviewCount: 3200,
      featured: true
    },
    {
      title: "The Silent Patient",
      author: "Alex Michaelides",
      isbn: "978-1-25030-169-7",
      category: "Thriller",
      description: "A shocking psychological thriller of a woman's act of violence against her husband—and of the therapist obsessed with uncovering her motive.",
      image: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=800",
      totalCopies: 2,
      availableCopies: 2,
      rating: 4.5,
      reviewCount: 850
    },
    {
      title: "The Alchemist",
      author: "Paulo Coelho",
      isbn: "978-0-06-112241-5",
      category: "Fiction",
      description: "A timeless story of following your dreams and listening to your heart.",
      image: "https://covers.openlibrary.org/b/isbn/9780061122415-L.jpg",
      totalCopies: 6,
      availableCopies: 6,
      rating: 4.7,
      reviewCount: 2100,
      featured: true
    },
    {
      title: "Deep Work",
      author: "Cal Newport",
      isbn: "978-1-4555-8669-1",
      category: "Productivity",
      description: "Rules for focused success in a distracted world.",
      image: "https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg",
      totalCopies: 4,
      availableCopies: 4,
      rating: 4.6,
      reviewCount: 1200
    },
    {
      title: "Sapiens",
      author: "Yuval Noah Harari",
      isbn: "978-0-06-231611-0",
      category: "History",
      description: "A brief history of humankind from the Stone Age to the modern era.",
      image: "https://covers.openlibrary.org/b/isbn/9780062316110-L.jpg",
      totalCopies: 5,
      availableCopies: 5,
      rating: 4.8,
      reviewCount: 5400,
      featured: true
    },
    {
      title: "The Psychology of Money",
      author: "Morgan Housel",
      isbn: "978-0-85719-768-9",
      category: "Finance",
      description: "Timeless lessons on wealth, greed, and happiness.",
      image: "https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg",
      totalCopies: 7,
      availableCopies: 7,
      rating: 4.8,
      reviewCount: 1800
    },
    {
      title: "Project Hail Mary",
      author: "Andy Weir",
      isbn: "978-0-593-13520-4",
      category: "Science Fiction",
      description: "A lone astronaut must save humanity through science, grit, and humor.",
      image: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg",
      totalCopies: 3,
      availableCopies: 3,
      rating: 4.8,
      reviewCount: 2600
    },
    {
      title: "The Midnight Library",
      author: "Matt Haig",
      isbn: "978-0-525-55947-4",
      category: "Contemporary Fiction",
      description: "A moving novel about regret, second chances, and choosing your life.",
      image: "https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg",
      totalCopies: 4,
      availableCopies: 4,
      rating: 4.4,
      reviewCount: 1500
    },
    {
      title: "Educated",
      author: "Tara Westover",
      isbn: "978-0-399-59050-4",
      category: "Memoir",
      description: "An unforgettable memoir about education, identity, and resilience.",
      image: "https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg",
      totalCopies: 3,
      availableCopies: 3,
      rating: 4.7,
      reviewCount: 3300
    },
    {
      title: "Thinking, Fast and Slow",
      author: "Daniel Kahneman",
      isbn: "978-0-374-27563-1",
      category: "Psychology",
      description: "A landmark exploration of how we think, decide, and make judgments.",
      image: "https://covers.openlibrary.org/b/isbn/9780374275631-L.jpg",
      totalCopies: 5,
      availableCopies: 5,
      rating: 4.6,
      reviewCount: 4100
    },
    {
      title: "Clean Code",
      author: "Robert C. Martin",
      isbn: "978-0-13-235088-4",
      category: "Technology",
      description: "A practical handbook of agile software craftsmanship.",
      image: "https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg",
      totalCopies: 6,
      availableCopies: 6,
      rating: 4.7,
      reviewCount: 5000
    }
  ];

  const additionalBooks = [
    { title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling", isbn: "978-1-4088-5565-2", category: "Fantasy", description: "A young wizard discovers his magical heritage at Hogwarts.", image: "https://covers.openlibrary.org/b/isbn/9781408855652-L.jpg", totalCopies: 5, availableCopies: 5, rating: 4.9, reviewCount: 9800, featured: true },
    { title: "Harry Potter and the Chamber of Secrets", author: "J.K. Rowling", isbn: "978-1-4088-5566-9", category: "Fantasy", description: "Harry returns for a second year and faces a dark mystery.", image: "https://covers.openlibrary.org/b/isbn/9781408855669-L.jpg", totalCopies: 5, availableCopies: 5, rating: 4.8, reviewCount: 9200, featured: true },
    { title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling", isbn: "978-1-4088-5567-6", category: "Fantasy", description: "A notorious prisoner escapes and Hogwarts is in danger.", image: "https://covers.openlibrary.org/b/isbn/9781408855676-L.jpg", totalCopies: 5, availableCopies: 5, rating: 4.9, reviewCount: 9400, featured: true },
    { title: "Harry Potter and the Goblet of Fire", author: "J.K. Rowling", isbn: "978-1-4088-5568-3", category: "Fantasy", description: "Harry is unexpectedly entered into a dangerous tournament.", image: "https://covers.openlibrary.org/b/isbn/9781408855683-L.jpg", totalCopies: 5, availableCopies: 5, rating: 4.9, reviewCount: 9100 },
    { title: "Harry Potter and the Order of the Phoenix", author: "J.K. Rowling", isbn: "978-1-4088-5569-0", category: "Fantasy", description: "Harry forms a secret student group to prepare for dark times.", image: "https://covers.openlibrary.org/b/isbn/9781408855690-L.jpg", totalCopies: 5, availableCopies: 5, rating: 4.8, reviewCount: 8900 },
    { title: "Harry Potter and the Half-Blood Prince", author: "J.K. Rowling", isbn: "978-1-4088-5570-6", category: "Fantasy", description: "Secrets about Voldemort's past emerge as war approaches.", image: "https://covers.openlibrary.org/b/isbn/9781408855706-L.jpg", totalCopies: 5, availableCopies: 5, rating: 4.9, reviewCount: 9000 },
    { title: "Harry Potter and the Deathly Hallows", author: "J.K. Rowling", isbn: "978-1-4088-5571-3", category: "Fantasy", description: "Harry, Ron, and Hermione search for Horcruxes in the final battle.", image: "https://covers.openlibrary.org/b/isbn/9781408855713-L.jpg", totalCopies: 6, availableCopies: 6, rating: 5.0, reviewCount: 12000, featured: true },
    { title: "The Hobbit", author: "J.R.R. Tolkien", isbn: "978-0-261-10334-4", category: "Fantasy", description: "Bilbo Baggins embarks on an unexpected journey.", image: "https://covers.openlibrary.org/b/isbn/9780261103344-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.8, reviewCount: 7300 },
    { title: "The Fellowship of the Ring", author: "J.R.R. Tolkien", isbn: "978-0-261-10235-4", category: "Fantasy", description: "The first part of the epic Lord of the Rings saga.", image: "https://covers.openlibrary.org/b/isbn/9780261102354-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.9, reviewCount: 7600 },
    { title: "The Two Towers", author: "J.R.R. Tolkien", isbn: "978-0-261-10236-1", category: "Fantasy", description: "The fellowship is broken as darkness rises in Middle-earth.", image: "https://covers.openlibrary.org/b/isbn/9780261102361-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.9, reviewCount: 7400 },
    { title: "The Return of the King", author: "J.R.R. Tolkien", isbn: "978-0-261-10237-8", category: "Fantasy", description: "The fate of Middle-earth is decided in the final conflict.", image: "https://covers.openlibrary.org/b/isbn/9780261102378-L.jpg", totalCopies: 4, availableCopies: 4, rating: 5.0, reviewCount: 7800 },
    { title: "A Game of Thrones", author: "George R.R. Martin", isbn: "978-0-553-10354-0", category: "Fantasy", description: "Noble families vie for control of the Iron Throne.", image: "https://covers.openlibrary.org/b/isbn/9780553103540-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.7, reviewCount: 6900 },
    { title: "The Name of the Wind", author: "Patrick Rothfuss", isbn: "978-0-7564-0474-1", category: "Fantasy", description: "The tale of the magician Kvothe begins.", image: "https://covers.openlibrary.org/b/isbn/9780756404741-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.8, reviewCount: 4300 },
    { title: "Mistborn: The Final Empire", author: "Brandon Sanderson", isbn: "978-0-7653-6270-7", category: "Fantasy", description: "A heist against an immortal tyrant in a world of ash.", image: "https://covers.openlibrary.org/b/isbn/9780765362707-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.8, reviewCount: 5200 },
    { title: "The Way of Kings", author: "Brandon Sanderson", isbn: "978-0-7653-2635-8", category: "Fantasy", description: "Ancient oaths and shattered kingdoms collide on Roshar.", image: "https://covers.openlibrary.org/b/isbn/9780765326358-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.9, reviewCount: 4800 },
    { title: "Dune", author: "Frank Herbert", isbn: "978-0-441-17271-9", category: "Science Fiction", description: "A noble family becomes entangled in a galactic struggle for Arrakis.", image: "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.8, reviewCount: 8500, featured: true },
    { title: "Dune Messiah", author: "Frank Herbert", isbn: "978-0-441-17269-6", category: "Science Fiction", description: "Paul Atreides faces the consequences of prophecy and power.", image: "https://covers.openlibrary.org/b/isbn/9780441172696-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.4, reviewCount: 2600 },
    { title: "Children of Dune", author: "Frank Herbert", isbn: "978-0-441-10163-4", category: "Science Fiction", description: "The Atreides twins inherit a dangerous destiny.", image: "https://covers.openlibrary.org/b/isbn/9780441101634-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.5, reviewCount: 2200 },
    { title: "Foundation", author: "Isaac Asimov", isbn: "978-0-553-80371-6", category: "Science Fiction", description: "A mathematician predicts the fall of a galactic empire.", image: "https://covers.openlibrary.org/b/isbn/9780553803716-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.7, reviewCount: 5400 },
    { title: "I, Robot", author: "Isaac Asimov", isbn: "978-0-553-29438-5", category: "Science Fiction", description: "Stories exploring the ethics and logic of robotics.", image: "https://covers.openlibrary.org/b/isbn/9780553294385-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.5, reviewCount: 3100 },
    { title: "Neuromancer", author: "William Gibson", isbn: "978-0-441-56956-4", category: "Science Fiction", description: "A washed-up hacker gets one last chance in cyberspace.", image: "https://covers.openlibrary.org/b/isbn/9780441569564-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.3, reviewCount: 3400 },
    { title: "Snow Crash", author: "Neal Stephenson", isbn: "978-0-553-38095-8", category: "Science Fiction", description: "A fast-paced cyberpunk adventure in a virtual world.", image: "https://covers.openlibrary.org/b/isbn/9780553380958-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.4, reviewCount: 2900 },
    { title: "The Martian", author: "Andy Weir", isbn: "978-0-8041-3902-1", category: "Science Fiction", description: "An astronaut stranded on Mars fights to survive.", image: "https://covers.openlibrary.org/b/isbn/9780804139021-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.8, reviewCount: 6200 },
    { title: "1984", author: "George Orwell", isbn: "978-0-452-28423-4", category: "Dystopian", description: "A chilling vision of surveillance and totalitarian control.", image: "https://covers.openlibrary.org/b/isbn/9780452284234-L.jpg", totalCopies: 5, availableCopies: 5, rating: 4.7, reviewCount: 10000, featured: true },
    { title: "Animal Farm", author: "George Orwell", isbn: "978-0-452-28424-1", category: "Political Satire", description: "An allegorical novella about revolution and corruption.", image: "https://covers.openlibrary.org/b/isbn/9780452284241-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.6, reviewCount: 7800 },
    { title: "Brave New World", author: "Aldous Huxley", isbn: "978-0-06-085052-4", category: "Dystopian", description: "A society engineered for stability at the cost of freedom.", image: "https://covers.openlibrary.org/b/isbn/9780060850524-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.5, reviewCount: 6500 },
    { title: "Fahrenheit 451", author: "Ray Bradbury", isbn: "978-1-4516-7331-9", category: "Dystopian", description: "Books are outlawed in a world consumed by conformity.", image: "https://covers.openlibrary.org/b/isbn/9781451673319-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.6, reviewCount: 7100 },
    { title: "The Handmaid's Tale", author: "Margaret Atwood", isbn: "978-0-385-49081-8", category: "Dystopian", description: "A powerful story about oppression and resistance.", image: "https://covers.openlibrary.org/b/isbn/9780385490818-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.4, reviewCount: 5200 },
    { title: "The Catcher in the Rye", author: "J.D. Salinger", isbn: "978-0-316-76948-0", category: "Classic", description: "A teenage boy recounts days of confusion and alienation.", image: "https://covers.openlibrary.org/b/isbn/9780316769480-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.0, reviewCount: 6900 },
    { title: "To Kill a Mockingbird", author: "Harper Lee", isbn: "978-0-06-112008-4", category: "Classic", description: "A timeless novel of justice and moral courage.", image: "https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg", totalCopies: 5, availableCopies: 5, rating: 4.9, reviewCount: 12000, featured: true },
    { title: "Pride and Prejudice", author: "Jane Austen", isbn: "978-0-14-143951-8", category: "Classic", description: "Wit, romance, and social commentary in Regency England.", image: "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.7, reviewCount: 8600 },
    { title: "Jane Eyre", author: "Charlotte Bronte", isbn: "978-0-14-243720-9", category: "Classic", description: "A governess seeks independence and love on her own terms.", image: "https://covers.openlibrary.org/b/isbn/9780142437209-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.6, reviewCount: 5400 },
    { title: "Wuthering Heights", author: "Emily Bronte", isbn: "978-0-14-143955-6", category: "Classic", description: "A dark tale of passion and revenge on the moors.", image: "https://covers.openlibrary.org/b/isbn/9780141439556-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.2, reviewCount: 5000 },
    { title: "Moby-Dick", author: "Herman Melville", isbn: "978-0-14-243724-7", category: "Classic", description: "Captain Ahab pursues the white whale in an epic obsession.", image: "https://covers.openlibrary.org/b/isbn/9780142437247-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.1, reviewCount: 4300 },
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald", isbn: "978-0-7432-7356-5", category: "Classic", description: "A portrait of ambition and illusion in the Jazz Age.", image: "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.5, reviewCount: 9700 },
    { title: "War and Peace", author: "Leo Tolstoy", isbn: "978-1-85715-096-4", category: "Classic", description: "A sweeping chronicle of Russia during the Napoleonic wars.", image: "https://covers.openlibrary.org/b/isbn/9781857150964-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.4, reviewCount: 3200 },
    { title: "Crime and Punishment", author: "Fyodor Dostoevsky", isbn: "978-0-14-305814-4", category: "Classic", description: "A psychological exploration of guilt and redemption.", image: "https://covers.openlibrary.org/b/isbn/9780143058144-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.6, reviewCount: 4800 },
    { title: "The Brothers Karamazov", author: "Fyodor Dostoevsky", isbn: "978-0-374-52632-0", category: "Classic", description: "Faith, doubt, and morality collide in a Russian family drama.", image: "https://covers.openlibrary.org/b/isbn/9780374526320-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.8, reviewCount: 3900 },
    { title: "Anna Karenina", author: "Leo Tolstoy", isbn: "978-0-14-303500-8", category: "Classic", description: "A tragic story of love and society in imperial Russia.", image: "https://covers.openlibrary.org/b/isbn/9780143035008-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.5, reviewCount: 3600 },
    { title: "The Picture of Dorian Gray", author: "Oscar Wilde", isbn: "978-0-14-143957-0", category: "Classic", description: "Beauty, vanity, and moral corruption in Victorian London.", image: "https://covers.openlibrary.org/b/isbn/9780141439570-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.4, reviewCount: 4200 },
    { title: "The Odyssey", author: "Homer", isbn: "978-0-14-026886-7", category: "Epic", description: "Odysseus journeys home after the Trojan War.", image: "https://covers.openlibrary.org/b/isbn/9780140268867-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.3, reviewCount: 4400 },
    { title: "The Iliad", author: "Homer", isbn: "978-0-14-027536-0", category: "Epic", description: "A foundational epic poem of war, honor, and fate.", image: "https://covers.openlibrary.org/b/isbn/9780140275360-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.2, reviewCount: 3800 },
    { title: "Don Quixote", author: "Miguel de Cervantes", isbn: "978-0-06-093434-7", category: "Classic", description: "A noble dreamer sets out to revive chivalry.", image: "https://covers.openlibrary.org/b/isbn/9780060934347-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.1, reviewCount: 2900 },
    { title: "The Divine Comedy", author: "Dante Alighieri", isbn: "978-0-14-243722-3", category: "Poetry", description: "An allegorical journey through Hell, Purgatory, and Paradise.", image: "https://covers.openlibrary.org/b/isbn/9780142437223-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.4, reviewCount: 2500 },
    { title: "The Count of Monte Cristo", author: "Alexandre Dumas", isbn: "978-0-14-044926-6", category: "Classic", description: "A gripping tale of betrayal, revenge, and justice.", image: "https://covers.openlibrary.org/b/isbn/9780140449266-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.9, reviewCount: 6100 },
    { title: "Les Miserables", author: "Victor Hugo", isbn: "978-0-451-41010-8", category: "Classic", description: "A sweeping novel of redemption and social injustice.", image: "https://covers.openlibrary.org/b/isbn/9780451410108-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.7, reviewCount: 4100 },
    { title: "The Little Prince", author: "Antoine de Saint-Exupery", isbn: "978-0-15-601219-5", category: "Fable", description: "A poetic story about friendship, love, and human nature.", image: "https://covers.openlibrary.org/b/isbn/9780156012195-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.8, reviewCount: 7300 },
    { title: "The Book Thief", author: "Markus Zusak", isbn: "978-0-375-84220-7", category: "Historical Fiction", description: "A young girl finds solace in books during World War II.", image: "https://covers.openlibrary.org/b/isbn/9780375842207-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.8, reviewCount: 6900 },
    { title: "The Kite Runner", author: "Khaled Hosseini", isbn: "978-1-59448-000-3", category: "Historical Fiction", description: "A moving story of friendship, guilt, and redemption.", image: "https://covers.openlibrary.org/b/isbn/9781594480003-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.7, reviewCount: 7600 },
    { title: "A Thousand Splendid Suns", author: "Khaled Hosseini", isbn: "978-1-59448-385-1", category: "Historical Fiction", description: "Two Afghan women forge a bond amid hardship and war.", image: "https://covers.openlibrary.org/b/isbn/9781594483851-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.8, reviewCount: 7100 },
    { title: "Life of Pi", author: "Yann Martel", isbn: "978-0-15-602732-8", category: "Adventure", description: "A boy survives at sea with a Bengal tiger.", image: "https://covers.openlibrary.org/b/isbn/9780156027328-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.4, reviewCount: 5200 },
    { title: "The Road", author: "Cormac McCarthy", isbn: "978-0-307-38789-9", category: "Post-Apocalyptic", description: "A father and son travel through a devastated world.", image: "https://covers.openlibrary.org/b/isbn/9780307387899-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.3, reviewCount: 4500 },
    { title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson", isbn: "978-0-307-26975-1", category: "Thriller", description: "A journalist and hacker investigate a decades-old disappearance.", image: "https://covers.openlibrary.org/b/isbn/9780307269751-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.5, reviewCount: 5600 },
    { title: "Gone Girl", author: "Gillian Flynn", isbn: "978-0-307-58836-4", category: "Thriller", description: "A marriage gone wrong becomes a media spectacle.", image: "https://covers.openlibrary.org/b/isbn/9780307588364-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.3, reviewCount: 6800 },
    { title: "The Da Vinci Code", author: "Dan Brown", isbn: "978-0-385-50420-1", category: "Thriller", description: "A symbologist uncovers a religious conspiracy in Europe.", image: "https://covers.openlibrary.org/b/isbn/9780385504201-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.2, reviewCount: 8900 },
    { title: "Angels & Demons", author: "Dan Brown", isbn: "978-0-671-02736-0", category: "Thriller", description: "Robert Langdon races to stop a deadly plot in Vatican City.", image: "https://covers.openlibrary.org/b/isbn/9780671027360-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.1, reviewCount: 6200 },
    { title: "The Shining", author: "Stephen King", isbn: "978-0-307-74365-7", category: "Horror", description: "A family becomes isolated in a haunted hotel.", image: "https://covers.openlibrary.org/b/isbn/9780307743657-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.6, reviewCount: 5900 },
    { title: "It", author: "Stephen King", isbn: "978-1-5011-4761-1", category: "Horror", description: "A shape-shifting terror haunts a small town.", image: "https://covers.openlibrary.org/b/isbn/9781501147611-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.5, reviewCount: 5200 },
    { title: "Dracula", author: "Bram Stoker", isbn: "978-0-14-143984-6", category: "Horror", description: "The original gothic tale of the infamous vampire count.", image: "https://covers.openlibrary.org/b/isbn/9780141439846-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.3, reviewCount: 4800 },
    { title: "Frankenstein", author: "Mary Shelley", isbn: "978-0-14-143947-1", category: "Horror", description: "A scientist's ambition creates a tragic monster.", image: "https://covers.openlibrary.org/b/isbn/9780141439471-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.2, reviewCount: 5100 },
    { title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams", isbn: "978-0-345-39180-3", category: "Science Fiction", description: "A hilarious interstellar adventure begins after Earth is destroyed.", image: "https://covers.openlibrary.org/b/isbn/9780345391803-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.8, reviewCount: 7000 },
    { title: "Slaughterhouse-Five", author: "Kurt Vonnegut", isbn: "978-0-385-31208-0", category: "Science Fiction", description: "A nonlinear anti-war classic about time and trauma.", image: "https://covers.openlibrary.org/b/isbn/9780385312080-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.3, reviewCount: 4600 },
    { title: "Catch-22", author: "Joseph Heller", isbn: "978-1-4516-2618-6", category: "Satire", description: "A darkly comic critique of war and bureaucracy.", image: "https://covers.openlibrary.org/b/isbn/9781451626186-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.2, reviewCount: 3900 },
    { title: "The Grapes of Wrath", author: "John Steinbeck", isbn: "978-0-14-303943-3", category: "Classic", description: "A family migrates west during the Great Depression.", image: "https://covers.openlibrary.org/b/isbn/9780143039433-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.4, reviewCount: 3500 },
    { title: "Of Mice and Men", author: "John Steinbeck", isbn: "978-0-14-017739-8", category: "Classic", description: "A moving novella of friendship and shattered dreams.", image: "https://covers.openlibrary.org/b/isbn/9780140177398-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.5, reviewCount: 6100 },
    { title: "The Old Man and the Sea", author: "Ernest Hemingway", isbn: "978-0-684-80122-3", category: "Classic", description: "An aging fisherman's struggle with a giant marlin.", image: "https://covers.openlibrary.org/b/isbn/9780684801223-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.2, reviewCount: 4300 },
    { title: "For Whom the Bell Tolls", author: "Ernest Hemingway", isbn: "978-0-684-80335-7", category: "Classic", description: "An American volunteer fights in the Spanish Civil War.", image: "https://covers.openlibrary.org/b/isbn/9780684803357-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.1, reviewCount: 2400 },
    { title: "The Sun Also Rises", author: "Ernest Hemingway", isbn: "978-0-7432-9733-2", category: "Classic", description: "A portrait of the Lost Generation after World War I.", image: "https://covers.openlibrary.org/b/isbn/9780743297332-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.0, reviewCount: 2100 },
    { title: "The Stranger", author: "Albert Camus", isbn: "978-0-679-72020-1", category: "Philosophical Fiction", description: "An existential classic about absurdity and alienation.", image: "https://covers.openlibrary.org/b/isbn/9780679720201-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.2, reviewCount: 3600 },
    { title: "The Plague", author: "Albert Camus", isbn: "978-0-679-72021-8", category: "Philosophical Fiction", description: "A town quarantined by plague becomes a study in human resilience.", image: "https://covers.openlibrary.org/b/isbn/9780679720218-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.3, reviewCount: 2200 },
    { title: "The Trial", author: "Franz Kafka", isbn: "978-0-8052-0999-0", category: "Classic", description: "A man is arrested and prosecuted by an inaccessible authority.", image: "https://covers.openlibrary.org/b/isbn/9780805209990-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.1, reviewCount: 2000 },
    { title: "Metamorphosis", author: "Franz Kafka", isbn: "978-0-553-21369-0", category: "Classic", description: "A surreal novella of transformation and isolation.", image: "https://covers.openlibrary.org/b/isbn/9780553213690-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.2, reviewCount: 4100 },
    { title: "One Hundred Years of Solitude", author: "Gabriel Garcia Marquez", isbn: "978-0-06-088328-7", category: "Magical Realism", description: "The multigenerational saga of the Buendia family.", image: "https://covers.openlibrary.org/b/isbn/9780060883287-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.7, reviewCount: 4300 },
    { title: "Love in the Time of Cholera", author: "Gabriel Garcia Marquez", isbn: "978-0-14-012389-0", category: "Magical Realism", description: "A love story spanning decades and changing eras.", image: "https://covers.openlibrary.org/b/isbn/9780140123890-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.3, reviewCount: 2800 },
    { title: "The Wind-Up Bird Chronicle", author: "Haruki Murakami", isbn: "978-0-679-77543-0", category: "Contemporary Fiction", description: "A surreal mystery unfolds in modern Tokyo.", image: "https://covers.openlibrary.org/b/isbn/9780679775430-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.4, reviewCount: 2600 },
    { title: "Kafka on the Shore", author: "Haruki Murakami", isbn: "978-1-4000-7927-8", category: "Contemporary Fiction", description: "Two intertwined stories blend reality and dream.", image: "https://covers.openlibrary.org/b/isbn/9781400079278-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.3, reviewCount: 2400 },
    { title: "Norwegian Wood", author: "Haruki Murakami", isbn: "978-0-375-70402-4", category: "Contemporary Fiction", description: "A nostalgic coming-of-age story of love and loss.", image: "https://covers.openlibrary.org/b/isbn/9780375704024-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.2, reviewCount: 3000 },
    { title: "The God of Small Things", author: "Arundhati Roy", isbn: "978-0-679-45467-0", category: "Literary Fiction", description: "A richly written story of family and forbidden love in Kerala.", image: "https://covers.openlibrary.org/b/isbn/9780679454670-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.1, reviewCount: 1900 },
    { title: "Midnight's Children", author: "Salman Rushdie", isbn: "978-0-8129-7653-3", category: "Literary Fiction", description: "A magical realist novel tied to India's independence.", image: "https://covers.openlibrary.org/b/isbn/9780812976533-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.3, reviewCount: 2300 },
    { title: "The White Tiger", author: "Aravind Adiga", isbn: "978-1-4165-7781-5", category: "Contemporary Fiction", description: "A darkly humorous tale of class and ambition in modern India.", image: "https://covers.openlibrary.org/b/isbn/9781416577815-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.1, reviewCount: 2100 },
    { title: "A Fine Balance", author: "Rohinton Mistry", isbn: "978-0-679-74229-6", category: "Historical Fiction", description: "Four strangers navigate life during India's Emergency period.", image: "https://covers.openlibrary.org/b/isbn/9780679742296-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.6, reviewCount: 2500 },
    { title: "Train to Pakistan", author: "Khushwant Singh", isbn: "978-0-8021-3389-2", category: "Historical Fiction", description: "A poignant novel set during the Partition of India.", image: "https://covers.openlibrary.org/b/isbn/9780802133892-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.3, reviewCount: 1700 },
    { title: "The Guide", author: "R.K. Narayan", isbn: "978-0-14-303965-5", category: "Classic", description: "A charming and ironic story of a tour guide turned holy man.", image: "https://covers.openlibrary.org/b/isbn/9780143039655-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.2, reviewCount: 1400 },
    { title: "Malgudi Days", author: "R.K. Narayan", isbn: "978-0-14-333095-0", category: "Classic", description: "Beloved short stories from the fictional town of Malgudi.", image: "https://covers.openlibrary.org/b/isbn/9780143330950-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.5, reviewCount: 2200 },
    { title: "Interpreter of Maladies", author: "Jhumpa Lahiri", isbn: "978-0-395-92720-5", category: "Short Stories", description: "Stories exploring identity, migration, and belonging.", image: "https://covers.openlibrary.org/b/isbn/9780395927205-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.2, reviewCount: 1800 },
    { title: "The Namesake", author: "Jhumpa Lahiri", isbn: "978-0-618-48722-6", category: "Contemporary Fiction", description: "A family's immigrant journey and a son's search for identity.", image: "https://covers.openlibrary.org/b/isbn/9780618487226-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.3, reviewCount: 2000 },
    { title: "The Palace of Illusions", author: "Chitra Banerjee Divakaruni", isbn: "978-0-307-47569-4", category: "Mythological Fiction", description: "The Mahabharata retold through Draupadi's voice.", image: "https://covers.openlibrary.org/b/isbn/9780307475694-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.4, reviewCount: 1900 },
    { title: "The Immortals of Meluha", author: "Amish Tripathi", isbn: "978-9-38065-874-2", category: "Mythological Fiction", description: "A reimagined epic of Shiva in ancient India.", image: "https://covers.openlibrary.org/b/isbn/9789380658742-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.4, reviewCount: 3400 },
    { title: "The Secret of the Nagas", author: "Amish Tripathi", isbn: "978-9-38065-879-7", category: "Mythological Fiction", description: "Shiva's quest continues against a mysterious enemy.", image: "https://covers.openlibrary.org/b/isbn/9789380658797-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.3, reviewCount: 3000 },
    { title: "The Oath of the Vayuputras", author: "Amish Tripathi", isbn: "978-9-35136-505-2", category: "Mythological Fiction", description: "The trilogy concludes with a battle for dharma.", image: "https://covers.openlibrary.org/b/isbn/9789351365052-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.3, reviewCount: 2800 },
    { title: "The Lean Startup", author: "Eric Ries", isbn: "978-0-307-88789-4", category: "Business", description: "How continuous innovation creates successful businesses.", image: "https://covers.openlibrary.org/b/isbn/9780307887894-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.4, reviewCount: 4200 },
    { title: "Zero to One", author: "Peter Thiel", isbn: "978-0-8041-3929-8", category: "Business", description: "Building the future through bold startup thinking.", image: "https://covers.openlibrary.org/b/isbn/9780804139298-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.3, reviewCount: 5000 },
    { title: "The Intelligent Investor", author: "Benjamin Graham", isbn: "978-0-06-055566-5", category: "Finance", description: "The classic guide to value investing principles.", image: "https://covers.openlibrary.org/b/isbn/9780060555665-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.7, reviewCount: 5300 },
    { title: "Common Stocks and Uncommon Profits", author: "Philip A. Fisher", isbn: "978-0-471-44450-1", category: "Finance", description: "Timeless growth-investing insights from a legendary investor.", image: "https://covers.openlibrary.org/b/isbn/9780471444501-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.5, reviewCount: 1700 },
    { title: "The Millionaire Next Door", author: "Thomas J. Stanley", isbn: "978-1-58979-547-1", category: "Finance", description: "How ordinary people build extraordinary wealth habits.", image: "https://covers.openlibrary.org/b/isbn/9781589795471-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.4, reviewCount: 2900 },
    { title: "The 7 Habits of Highly Effective People", author: "Stephen R. Covey", isbn: "978-1-98213-727-4", category: "Self-Help", description: "Principles for personal and professional effectiveness.", image: "https://covers.openlibrary.org/b/isbn/9781982137274-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.7, reviewCount: 7400 },
    { title: "How to Win Friends and Influence People", author: "Dale Carnegie", isbn: "978-0-671-02703-2", category: "Self-Help", description: "Classic advice on communication and relationships.", image: "https://covers.openlibrary.org/b/isbn/9780671027032-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.8, reviewCount: 9300 },
    { title: "Man's Search for Meaning", author: "Viktor E. Frankl", isbn: "978-0-8070-1429-5", category: "Psychology", description: "A profound memoir and psychological exploration of meaning.", image: "https://covers.openlibrary.org/b/isbn/9780807014295-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.9, reviewCount: 8200 },
    { title: "Ikigai", author: "Hector Garcia and Francesc Miralles", isbn: "978-0-14-313072-7", category: "Self-Help", description: "Japanese wisdom for a long and meaningful life.", image: "https://covers.openlibrary.org/b/isbn/9780143130727-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.5, reviewCount: 6100 },
    { title: "Can't Hurt Me", author: "David Goggins", isbn: "978-1-5425-4512-1", category: "Memoir", description: "Master your mind and defy the odds.", image: "https://covers.openlibrary.org/b/isbn/9781542545121-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.8, reviewCount: 6400 },
    { title: "The Power of Habit", author: "Charles Duhigg", isbn: "978-0-8129-8160-5", category: "Self-Help", description: "Why habits exist and how they can be changed.", image: "https://covers.openlibrary.org/b/isbn/9780812981605-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.6, reviewCount: 5800 },
    { title: "Grit", author: "Angela Duckworth", isbn: "978-1-5011-1902-1", category: "Psychology", description: "The power of passion and perseverance.", image: "https://covers.openlibrary.org/b/isbn/9781501119021-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.5, reviewCount: 4500 },
    { title: "Start With Why", author: "Simon Sinek", isbn: "978-1-59184-280-4", category: "Leadership", description: "Inspiring others by communicating purpose first.", image: "https://covers.openlibrary.org/b/isbn/9781591842804-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.4, reviewCount: 4000 },
    { title: "Leaders Eat Last", author: "Simon Sinek", isbn: "978-1-59184-532-4", category: "Leadership", description: "How great leaders create trust and safety in teams.", image: "https://covers.openlibrary.org/b/isbn/9781591845324-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.3, reviewCount: 2800 },
    { title: "Good to Great", author: "Jim Collins", isbn: "978-0-06-662099-2", category: "Business", description: "What separates enduring great companies from good ones.", image: "https://covers.openlibrary.org/b/isbn/9780066620992-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.5, reviewCount: 5200 },
    { title: "The Hard Thing About Hard Things", author: "Ben Horowitz", isbn: "978-0-06-227320-8", category: "Business", description: "Practical truths about building and running startups.", image: "https://covers.openlibrary.org/b/isbn/9780062273208-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.5, reviewCount: 3000 },
    { title: "Thinking in Systems", author: "Donella H. Meadows", isbn: "978-1-60358-055-7", category: "Science", description: "An accessible primer on systems thinking.", image: "https://covers.openlibrary.org/b/isbn/9781603580557-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.6, reviewCount: 1800 },
    { title: "A Brief History of Time", author: "Stephen Hawking", isbn: "978-0-553-38016-3", category: "Science", description: "A landmark introduction to cosmology and the universe.", image: "https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.5, reviewCount: 6900 },
    { title: "Cosmos", author: "Carl Sagan", isbn: "978-0-345-53343-2", category: "Science", description: "A majestic journey through space, time, and life.", image: "https://covers.openlibrary.org/b/isbn/9780345533432-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.9, reviewCount: 6200 },
    { title: "The Selfish Gene", author: "Richard Dawkins", isbn: "978-0-19-929115-1", category: "Science", description: "A gene-centered view of evolution and behavior.", image: "https://covers.openlibrary.org/b/isbn/9780199291151-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.4, reviewCount: 2500 },
    { title: "The Gene", author: "Siddhartha Mukherjee", isbn: "978-1-4767-3361-6", category: "Science", description: "A history of genetic research and its human impact.", image: "https://covers.openlibrary.org/b/isbn/9781476733616-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.6, reviewCount: 2200 },
    { title: "The Emperor of All Maladies", author: "Siddhartha Mukherjee", isbn: "978-1-4391-0795-6", category: "Science", description: "A biography of cancer and the fight against it.", image: "https://covers.openlibrary.org/b/isbn/9781439107956-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.7, reviewCount: 2000 },
    { title: "Surely You're Joking, Mr. Feynman!", author: "Richard P. Feynman", isbn: "978-0-393-31604-9", category: "Memoir", description: "Adventures and anecdotes from a brilliant physicist.", image: "https://covers.openlibrary.org/b/isbn/9780393316049-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.8, reviewCount: 4500 },
    { title: "The Pragmatic Programmer", author: "Andrew Hunt and David Thomas", isbn: "978-0-13-595705-9", category: "Technology", description: "Practical principles for effective software development.", image: "https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.8, reviewCount: 5200 },
    { title: "Design Patterns", author: "Erich Gamma et al.", isbn: "978-0-201-63361-0", category: "Technology", description: "Foundational object-oriented software design patterns.", image: "https://covers.openlibrary.org/b/isbn/9780201633610-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.6, reviewCount: 4100 },
    { title: "Introduction to Algorithms", author: "Thomas H. Cormen et al.", isbn: "978-0-262-03384-8", category: "Technology", description: "Comprehensive reference on algorithms and data structures.", image: "https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.7, reviewCount: 4600 },
    { title: "Cracking the Coding Interview", author: "Gayle Laakmann McDowell", isbn: "978-0-9847828-5-7", category: "Technology", description: "Interview prep guide with coding questions and solutions.", image: "https://covers.openlibrary.org/b/isbn/9780984782857-L.jpg", totalCopies: 4, availableCopies: 4, rating: 4.7, reviewCount: 7200 },
    { title: "You Don't Know JS Yet", author: "Kyle Simpson", isbn: "978-1-09812-404-5", category: "Technology", description: "Deep dive into JavaScript core mechanisms and behavior.", image: "https://covers.openlibrary.org/b/isbn/9781098124045-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.6, reviewCount: 2600 },
    { title: "Eloquent JavaScript", author: "Marijn Haverbeke", isbn: "978-1-59327-950-9", category: "Technology", description: "A modern introduction to JavaScript programming.", image: "https://covers.openlibrary.org/b/isbn/9781593279509-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.5, reviewCount: 3100 },
    { title: "Refactoring", author: "Martin Fowler", isbn: "978-0-13-475759-9", category: "Technology", description: "Improving code design through disciplined refactoring.", image: "https://covers.openlibrary.org/b/isbn/9780134757599-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.7, reviewCount: 3400 },
    { title: "Code Complete", author: "Steve McConnell", isbn: "978-0-7356-1967-8", category: "Technology", description: "A practical handbook of software construction.", image: "https://covers.openlibrary.org/b/isbn/9780735619678-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.7, reviewCount: 3900 },
    { title: "The Clean Coder", author: "Robert C. Martin", isbn: "978-0-13-708107-3", category: "Technology", description: "A code of conduct for professional programmers.", image: "https://covers.openlibrary.org/b/isbn/9780137081073-L.jpg", totalCopies: 3, availableCopies: 3, rating: 4.5, reviewCount: 2500 },
    { title: "Deep Learning", author: "Ian Goodfellow, Yoshua Bengio, Aaron Courville", isbn: "978-0-262-03561-3", category: "Technology", description: "Comprehensive textbook on deep learning fundamentals.", image: "https://covers.openlibrary.org/b/isbn/9780262035613-L.jpg", totalCopies: 2, availableCopies: 2, rating: 4.6, reviewCount: 1900 }
  ];

  const fallbackCoverFor = (title: string) =>
    `https://placehold.co/400x600/E8E4D9/5A634D?text=${encodeURIComponent(title)}`;

  const initialBooks = [...coreBooks, ...additionalBooks].map((book) => ({
    ...book,
    image: typeof book.image === "string" && book.image.trim().length > 0
      ? book.image
      : fallbackCoverFor(book.title)
  }));

  for (const b of initialBooks) {
    const exists = await Book.findOne({ isbn: b.isbn });
    if (!exists) {
      await Book.create(b);
      console.log(`Seed: Book created (${b.title})`);
    } else if (!exists.image || (typeof exists.image === "string" && exists.image.trim().length === 0)) {
      exists.image = fallbackCoverFor(b.title);
      await exists.save();
      console.log(`Seed: Book cover backfilled (${b.title})`);
    }
  }
}

startServer().catch((err) => {
  console.error("Error starting Lumina Library server:", err);
});
