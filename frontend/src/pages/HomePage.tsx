import React from "react";
import { motion } from "motion/react";
import { Search, ArrowRight, ShieldCheck, Zap, Globe } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BookCard from "../components/common/BookCard";
import { bookService } from "../services/books";
import { Book } from "../types";

export default function HomePage() {
  const [featuredBooks, setFeaturedBooks] = React.useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const navigate = useNavigate();

  React.useEffect(() => {
    bookService.getFeaturedBooks().then(setFeaturedBooks);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-[#5A634D]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-[#F4F1EA]/50 rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        <div className="container max-w-5xl mx-auto text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#5A634D]/5 text-[#5A634D] text-xs font-bold uppercase tracking-widest mb-6">
              Next-Gen Library Sanctuary
            </span>
            <h1 className="font-serif font-bold text-6xl md:text-8xl text-[#33302C] tracking-tighter leading-[0.9] mb-8">
              WISDOM, <br />
              <span className="text-stone-400">CURATED FOR YOU.</span>
            </h1>
            <p className="text-lg md:text-xl text-stone-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
              Experience the pinnacle of knowledge management. Search, borrow, and read with unparalleled elegance.
            </p>

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group">
              <input
                type="text"
                placeholder="Search by title, author, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-[#E8E4D9] h-20 pl-8 pr-32 rounded-3xl text-lg focus:outline-none focus:ring-4 focus:ring-[#5A634D]/5 transition-all primitive-shadow group-hover:border-stone-300 shadow-sm"
              />
              <button
                type="submit"
                className="absolute right-3 top-3 bottom-3 px-8 bg-[#5A634D] text-white rounded-2xl flex items-center gap-2 hover:bg-[#4A533D] transition-colors"
              >
                <Search size={20} />
                <span className="hidden sm:inline font-bold uppercase tracking-widest text-xs">Search</span>
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-[#33302C] text-[#FDFCF9]">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: "Total Books", value: "12,400+" },
              { label: "Active Members", value: "8,200+" },
              { label: "Daily Issues", value: "450+" },
              { label: "Reviews", value: "25,000+" }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <p className="text-4xl md:text-5xl font-serif font-bold mb-2 tracking-tighter">{stat.value}</p>
                <p className="text-stone-500 text-[10px] font-bold uppercase tracking-[0.2em]">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="py-32 px-6">
        <div className="container max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="font-serif font-bold text-4xl md:text-6xl text-[#33302C] tracking-tighter mb-4">
                THE CURATED <br /><span className="text-stone-400">SELECTION.</span>
              </h2>
              <p className="text-stone-500 font-medium">Exceptional works for exceptional minds. Our most borrowed and highly-rated pieces.</p>
            </div>
            <Link to="/catalog" className="flex items-center gap-2 text-[#5A634D] font-bold uppercase tracking-widest text-sm group">
              View Full Catalog <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
            {featuredBooks.length === 0 && Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-96 rounded-3xl bg-stone-50 animate-pulse border border-[#E8E4D9]" />
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 bg-[#F4F1EA] flex items-center justify-center">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <ShieldCheck className="w-8 h-8" />,
                title: "PREMIUM ACCESS",
                desc: "Secure role-based authentication and membership tiering for exclusive content."
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "AI POWERED",
                desc: "Intelligent book recommendations tailored to your unique reading patterns."
              },
              {
                icon: <Globe className="w-8 h-8" />,
                title: "ANYWHERE",
                desc: "Access your library sanctuary from any device with our fully responsive design."
              }
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-start bg-white p-12 rounded-[40px] border border-[#E8E4D9] premium-shadow">
                <div className="w-16 h-16 bg-[#5A634D] text-white rounded-2xl flex items-center justify-center mb-8">
                  {f.icon}
                </div>
                <h3 className="font-serif font-bold text-2xl text-[#33302C] mb-4">{f.title}</h3>
                <p className="text-stone-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
