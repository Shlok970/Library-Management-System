import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["member", "admin"], default: "member" },
  status: { type: String, default: "active" },
  borrowedCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: {
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export const User = mongoose.model("User", userSchema);
