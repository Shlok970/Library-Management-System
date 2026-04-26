import mongoose from "mongoose";

const borrowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  bookTitle: { type: String, required: true },
  bookImage: { type: String },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  returnDate: { type: Date },
  status: { type: String, enum: ["pending", "borrowed", "returned", "overdue", "denied", "pending_return"], default: "pending" },
  fine: { type: Number, default: 0 },
  borrowFee: { type: Number, default: 0 }
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

export const Borrow = mongoose.model("Borrow", borrowSchema);
