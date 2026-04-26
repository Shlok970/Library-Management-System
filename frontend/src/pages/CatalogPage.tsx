import React from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Filter, SlidersHorizontal, Book as BookIcon } from "lucide-react";
import { motion } from "motion/react";
import { bookService } from "../services/books";
import { Book } from "../types";
import BookCard from "../components/common/BookCard";

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = React.useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = React.useState<Book[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const searchQuery = searchParams.get("search") || "";
  const categoryFilter = searchParams.get("category") || "All";

  const categories = React.useMemo(
    () => ["All", ...Array.from(new Set(books.map((b) => b.category))).sort((a, b) => a.localeCompare(b))],
    [books]
  );

  React.useEffect(() => {
    setLoading(true);
    bookService.getAllBooks().then(data => {
      setBooks(data);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => {
    let result = books;
    
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(term) || 
        b.author.toLowerCase().includes(term) || 
        b.isbn.includes(term)
      );
    }

    if (categoryFilter !== "All") {
      result = result.filter(b => b.category === categoryFilter);
    }

    setFilteredBooks(result);
  }, [searchQuery, categoryFilter, books]);

  return (
    <div className="pt-32 pb-24 px-6 min-h-screen">
      <div className="container max-w-7xl mx-auto">
        <header className="mb-16">
          <h1 className="font-serif font-bold text-5xl md:text-7xl text-[#33302C] tracking-tighter mb-4">
            LIBRARY <br /><span className="text-stone-400">CATALOG.</span>
          </h1>
          <p className="text-stone-500 font-medium max-w-xl">
            Browse through our collection of physical and digital wisdom.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-64 space-y-8">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-6 flex items-center gap-2">
                <Search size={14} /> Search
              </h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ISBN or title..."
                  className="w-full bg-white border border-[#E8E4D9] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A634D]/5 transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchParams({ search: e.target.value, category: categoryFilter })}
                />
              </div>
            </div>

            <div>
              <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-6 flex items-center gap-2">
                <Filter size={14} /> Categories
              </h3>
              <div className="flex flex-col gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSearchParams({ search: searchQuery, category: cat })}
                    className={`text-left px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      categoryFilter === cat 
                        ? "bg-[#5A634D] text-white premium-shadow" 
                        : "text-stone-500 hover:bg-[#F4F1EA]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-8">
              <p className="text-sm font-medium text-stone-500">
                Showing <span className="text-[#33302C]">{filteredBooks.length}</span> results
              </p>
              <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-[#5A634D]">
                <SlidersHorizontal size={14} /> Sort By: Newest
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="h-96 rounded-3xl bg-stone-50 animate-pulse border border-[#E8E4D9]" />
                ))}
              </div>
            ) : filteredBooks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mb-6 border border-[#E8E4D9]">
                  <BookIcon className="text-stone-300 w-10 h-10" />
                </div>
                <h3 className="font-serif font-bold text-2xl text-[#33302C] mb-2">No books found</h3>
                <p className="text-stone-500 max-w-xs mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
                <button 
                  onClick={() => setSearchParams({ search: "", category: "All" })}
                  className="mt-8 px-6 py-2 bg-[#5A634D] text-white rounded-xl text-sm font-bold uppercase tracking-widest"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
