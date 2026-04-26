import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string);

const userSchema = new mongoose.Schema({
  email: String,
  role: String
}, { strict: false });

const User = mongoose.model("User", userSchema);

async function run() {
  await User.updateOne({ email: "shloknagda11@gmail.com" }, { $set: { role: "admin" } });
  console.log("User role updated to admin!");
  process.exit(0);
}

run().catch(console.error);
