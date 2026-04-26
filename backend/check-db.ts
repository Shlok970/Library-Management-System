import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: String
}, { strict: false });

const User = mongoose.model("User", userSchema);

async function run() {
  const user = await User.findOne({ email: "shloknagda11@gmail.com" }).lean();
  console.log("User in DB:", JSON.stringify(user, null, 2));
  process.exit(0);
}

run().catch(console.error);
