import { Star, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Book } from "../../types";
import { cn } from "../../lib/utils";

interface BookCardProps {
  book: Book;
  key?: string | number;
}

export default function BookCard({ book }: BookCardProps) {
  const fallbackCover = `https://placehold.co/400x600/E8E4D9/5A634D?text=${encodeURIComponent(book.title)}`;

  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="group relative bg-white rounded-3xl p-4 premium-shadow border border-[#E8E4D9] flex flex-col h-full"
    >
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-5 bg-stone-100">
        <img 
          src={book.image || fallbackCover}
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src !== fallbackCover) img.src = fallbackCover;
          }}
        />
        <div className="absolute top-3 right-3 glass rounded-full px-2 py-1 flex items-center gap-1">
          <Star className="w-3 h-3 text-[#5A634D] fill-[#5A634D]" />
          <span className="text-[10px] font-bold text-[#33302C]">{book.rating}</span>
        </div>
        {book.availableCopies === 0 && (
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
            <span className="bg-white/90 text-zinc-900 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Out of Stock</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest text-[#5A634D] font-bold mb-1">{book.category}</p>
          <h3 className="font-serif font-bold text-[#33302C] line-clamp-1 group-hover:text-[#5A634D] transition-colors uppercase tracking-tight">
            {book.title}
          </h3>
          <p className="text-xs text-stone-500">{book.author}</p>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-xs font-bold",
              book.availableCopies > 0 ? "text-[#5A634D]" : "text-stone-400"
            )}>
              {book.availableCopies}
            </span>
            <span className="text-[10px] text-stone-400 font-medium">available</span>
          </div>
          <Link 
            to={`/book/${book.id}`}
            className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center text-stone-400 hover:bg-[#5A634D] hover:text-white transition-all"
          >
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
