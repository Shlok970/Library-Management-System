import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Star, Clock, Library, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { bookService } from "../services/books";
import { borrowService } from "../services/borrows";
import { Book, UserProfile } from "../types";
import { cn } from "../lib/utils";

interface BookDetailsPageProps {
  user: UserProfile | null;
}

export default function BookDetailsPage({ user }: BookDetailsPageProps) {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = React.useState<Book | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [borrowing, setBorrowing] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [existingStatus, setExistingStatus] = React.useState<"pending" | "borrowed" | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (id) {
      bookService.getBookById(id).then(data => {
        setBook(data);
        setLoading(false);
      });
      if (user && user.uid !== "guest") {
        borrowService.getUserBorrows(user.uid).then(borrows => {
          const existing = borrows.find(b => b.bookId === id && ["pending", "borrowed", "overdue"].includes(b.status));
          if (existing) {
            setExistingStatus(existing.status === "pending" ? "pending" : "borrowed");
          }
        });
      }
    }
  }, [id, user]);

  const handleBorrow = async () => {
    if (!user || user.uid === "guest") {
      navigate("/login");
      return;
    }
    if (!book) return;

    const confirmPayment = window.confirm(
      "Borrowing this book requires a $2 payment. Click OK to pay $2 and send your request to admin."
    );
    if (!confirmPayment) return;

    setBorrowing(true);
    try {
      await borrowService.borrowBook(user, book);
      setSuccess(true);
      // Refresh book data to update available copies
      const updatedBook = await bookService.getBookById(book.id);
      setBook(updatedBook);
    } catch (err) {
      console.error(err);
    } finally {
      setBorrowing(false);
    }
  };

  if (loading) return (
    <div className="pt-40 flex justify-center">
      <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  );

  if (!book) return (
    <div className="pt-40 text-center">
      <h2 className="text-2xl font-bold">Book not found</h2>
      <button onClick={() => navigate("/catalog")} className="mt-4 text-zinc-500 underline">Back to catalog</button>
    </div>
  );

  const isGuest = user?.uid === "guest";
  const fallbackCover = `https://placehold.co/400x600/E8E4D9/5A634D?text=${encodeURIComponent(book.title)}`;

  return (
    <div className="pt-32 pb-24 px-6">
      <div className="container max-w-7xl mx-auto">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-stone-400 font-bold uppercase tracking-widest text-xs mb-12 hover:text-[#5A634D] transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left: Image */}
          <div className="lg:col-span-5">
            <div className="sticky top-32">
              <div className="rounded-[40px] overflow-hidden premium-shadow bg-stone-100 aspect-[3/4] border border-[#E8E4D9]">
                <img 
                  src={book.image || fallbackCover} 
                  alt={book.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src !== fallbackCover) img.src = fallbackCover;
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right: Info */}
          <div className="lg:col-span-7">
            <header className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <span className="px-3 py-1 rounded-full bg-[#5A634D]/10 text-[#5A634D] text-[10px] font-bold uppercase tracking-widest">{book.category}</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#5A634D] fill-[#5A634D]" />
                  <span className="text-sm font-bold text-[#33302C]">{book.rating}</span>
                  <span className="text-xs text-stone-400 font-medium">({book.reviewCount || 0} reviews)</span>
                </div>
              </div>
              <h1 className="font-serif font-bold text-5xl md:text-7xl text-[#33302C] tracking-tighter mb-4 leading-[0.9]">
                {book.title.toUpperCase()}
              </h1>
              <p className="text-xl text-stone-500 font-medium font-serif italic">by {book.author}</p>
            </header>

            <div className="space-y-12">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-widest text-[#5A634D] mb-4">Description</h3>
                <p className="text-stone-500 leading-relaxed font-medium text-lg">
                  {book.description || "No description available for this masterpiece."}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 p-8 rounded-[32px] bg-[#F4F1EA] border border-[#E8E4D9]">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1">Status</p>
                  <p className={cn(
                    "font-bold text-sm",
                    book.availableCopies > 0 ? "text-[#5A634D]" : "text-red-500"
                  )}>
                    {book.availableCopies > 0 ? "Available" : "Checked Out"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1">Copies</p>
                  <p className="font-bold text-sm text-[#33302C]">{book.availableCopies} of {book.totalCopies}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1">ISBN</p>
                  <p className="font-bold text-sm text-[#33302C]">{book.isbn}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                {success || existingStatus === "pending" ? (
                  <div className="flex-1 bg-blue-50 text-blue-700 p-6 rounded-3xl border border-blue-100 flex items-center gap-4">
                    <CheckCircle2 className="w-8 h-8" />
                    <div>
                      <p className="font-bold">Request Sent!</p>
                      <p className="text-sm opacity-90">Pending admin approval. You will see it in your dashboard once approved.</p>
                    </div>
                  </div>
                ) : existingStatus === "borrowed" ? (
                  <div className="flex-1 bg-green-50 text-green-700 p-6 rounded-3xl border border-green-100 flex items-center gap-4">
                    <CheckCircle2 className="w-8 h-8" />
                    <div>
                      <p className="font-bold">Currently Borrowing</p>
                      <p className="text-sm opacity-90">You already have this book in your active works.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-3">
                    <button
                      onClick={handleBorrow}
                      disabled={borrowing || book.availableCopies === 0}
                      className={cn(
                        "w-full h-20 rounded-3xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all",
                        book.availableCopies > 0 
                          ? "bg-[#5A634D] text-white hover:bg-[#4A533D] premium-shadow" 
                          : "bg-stone-50 text-stone-400 cursor-not-allowed border border-[#E8E4D9]"
                      )}
                    >
                      {borrowing ? (
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck size={20} />
                          {isGuest ? "Sign in to Request" : "Request to Borrow"}
                        </>
                      )}
                    </button>
                    {isGuest && (
                      <p className="text-[10px] text-center text-stone-400 uppercase tracking-widest font-bold">
                        Guest mode is read-only. Access restricted.
                      </p>
                    )}
                  </div>
                )}
                
                <button className="h-20 px-8 rounded-3xl border border-[#E8E4D9] font-bold uppercase tracking-widest text-xs text-stone-400 hover:text-[#33302C] hover:border-stone-400 transition-colors">
                  Add to Wishlist
                </button>
              </div>

              <div className="pt-12 border-t border-[#E8E4D9] space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#F4F1EA] flex items-center justify-center text-[#5A634D]">
                    <Clock size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#33302C]">Borrow Duration: 14 Days</p>
                    <p className="text-xs text-stone-500 italic">Standard membership period applies.</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#F4F1EA] flex items-center justify-center text-[#5A634D]">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#33302C]">Borrow Fee: $2.00</p>
                    <p className="text-xs text-stone-500 italic">Late return after due date adds a fixed $5.00 fine.</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#F4F1EA] flex items-center justify-center text-[#5A634D]">
                    <Library size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#33302C]">Instant Access (Digital)</p>
                    <p className="text-xs text-stone-500 italic">E-book version available if supported.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
