import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string);

const bookSchema = new mongoose.Schema({}, { strict: false });
const Book = mongoose.model("Book", bookSchema);

async function run() {
  const books = await Book.find().lean();
  let badBooks = books.filter(b => !b.title);
  console.log(`Found ${books.length} total books. Bad books: ${badBooks.length}`);
  if (badBooks.length > 0) {
    console.log(badBooks);
  }
  process.exit(0);
}

run().catch(console.error);
