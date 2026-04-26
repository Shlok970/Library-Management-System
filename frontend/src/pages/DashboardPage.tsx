import React from "react";
import { motion } from "motion/react";
import { BookOpen, Calendar, AlertCircle, CheckCircle2, History, CreditCard, Clock, User } from "lucide-react";
import { borrowService } from "../services/borrows";
import { bookService } from "../services/books";
import { UserProfile, BorrowRecord, Book } from "../types";
import { cn, formatDate } from "../lib/utils";

interface DashboardPageProps {
  user: UserProfile;
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stopWords = new Set([
  "the",
  "and",
  "of",
  "a",
  "an",
  "to",
  "in",
  "on",
  "for",
  "with",
  "at",
  "by",
  "from"
]);

const tokenSet = (text: string) =>
  new Set(normalize(text).split(" ").filter((t) => t.length > 2 && !stopWords.has(t)));

const hpPattern = /^harry potter\b/i;

const getSeriesKey = (title: string) => {
  if (hpPattern.test(title)) return "harry potter";
  const normalized = normalize(title);
  return normalized.split(":")[0].split("-")[0].trim();
};

const buildRecommendations = (allBooks: Book[], userBorrows: BorrowRecord[]) => {
  const readableBorrows = userBorrows.filter((b) => b.status !== "denied");
  const readTitleSet = new Set(readableBorrows.map((b) => normalize(b.bookTitle)));
  const readTitleTokens = new Set<string>();
  const readBookIds = new Set(readableBorrows.map((b) => b.bookId));

  const readBooks = allBooks.filter((book) => readTitleSet.has(normalize(book.title)) || readBookIds.has(book.id));
  const readAuthors = new Set(readBooks.map((b) => b.author.toLowerCase()));
  const readCategories = new Set(readBooks.map((b) => b.category.toLowerCase()));
  const readSeries = new Set(readBooks.map((b) => getSeriesKey(b.title)));

  readBooks.forEach((book) => {
    tokenSet(book.title).forEach((token) => readTitleTokens.add(token));
  });

  const scored = allBooks
    .filter((book) => !readBookIds.has(book.id) && !readTitleSet.has(normalize(book.title)))
    .map((book) => {
      let score = 0;
      let reason = "Popular among readers with similar interests.";
      const authorMatch = readAuthors.has(book.author.toLowerCase());
      const categoryMatch = readCategories.has(book.category.toLowerCase());
      const seriesKey = getSeriesKey(book.title);
      const seriesMatch = readSeries.has(seriesKey);
      const overlap = [...tokenSet(book.title)].filter((t) => readTitleTokens.has(t)).length;

      if (seriesMatch) {
        score += 80;
        reason = "Another book from the same series you already enjoy.";
      } else if (authorMatch) {
        score += 55;
        reason = "By the same author as books you've already read.";
      } else if (categoryMatch) {
        score += 30;
        reason = `Matches your interest in ${book.category}.`;
      }

      if (overlap > 0) {
        score += Math.min(20, overlap * 6);
        if (!seriesMatch && !authorMatch) {
          reason = "Similar themes to titles you've read recently.";
        }
      }

      score += Math.round((book.rating || 0) * 4);
      score += Math.min(10, Math.floor((book.reviewCount || 0) / 1000));

      return { book, reason, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ book, reason }) => ({ book, reason }));

  if (scored.length > 0) return scored;

  return allBooks
    .slice()
    .sort((a, b) => (b.rating + b.reviewCount / 1000) - (a.rating + a.reviewCount / 1000))
    .slice(0, 3)
    .map((book) => ({
      book,
      reason: "Start here: highly rated and loved by many readers."
    }));
};

export default function DashboardPage({ user }: DashboardPageProps) {
  const [activeTab, setActiveTab] = React.useState<"overview" | "borrows" | "history" | "wishlist" | "notifications" | "profile">("overview");
  const [borrows, setBorrows] = React.useState<BorrowRecord[]>([]);
  const [recommendations, setRecommendations] = React.useState<{book: Book, reason: string}[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const userBorrows = await borrowService.getUserBorrows(user.uid);
        setBorrows(userBorrows);
        const allBooks = await bookService.getAllBooks();
        setRecommendations(buildRecommendations(allBooks, userBorrows));
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.uid]);

  const currentBorrows = borrows.filter(b => b.status === "borrowed" || b.status === "overdue" || b.status === "pending_return");
  const borrowHistory = borrows.filter(b => b.status === "returned");
  const overdueCount = borrows.filter(b => b.status === "overdue").length;
  const totalFine = borrows.reduce((acc, curr) => acc + (curr.fine || 0), 0);

  const tabs = [
    { id: "overview", name: "Overview", icon: BookOpen },
    { id: "borrows", name: "Borrowing", icon: Calendar },
    { id: "history", name: "History", icon: History },
    { id: "wishlist", name: "Wishlist", icon: CheckCircle2 },
    { id: "notifications", name: "Notices", icon: AlertCircle },
    { id: "profile", name: "Profile", icon: User },
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FDFCF9]">
        <div className="w-12 h-12 border-2 border-[#5A634D]/20 border-t-[#5A634D] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-[#FDFCF9]">
      <div className="container max-w-7xl mx-auto">
        <header className="mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-2">Member Sanctum</p>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <h1 className="font-serif font-bold text-5xl md:text-7xl text-[#33302C] tracking-tighter uppercase leading-[0.85]">
              {user.name.split(' ')[0]}<br /><span className="text-stone-400 tracking-normal italic normal-case text-4xl font-normal font-serif">Dashboards.</span>
            </h1>
            
            <nav className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    activeTab === tab.id 
                      ? "bg-[#33302C] text-white premium-shadow" 
                      : "text-stone-400 hover:bg-[#F4F1EA] hover:text-[#33302C]"
                  )}
                >
                  <tab.icon size={14} />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8">
            {activeTab === "overview" && (
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[40px] border border-[#E8E4D9] premium-shadow">
                    <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-4">Borrowed</p>
                    <p className="text-4xl font-serif font-bold text-[#33302C]">{currentBorrows.length}</p>
                    <p className="text-[10px] text-[#5A634D] font-bold uppercase tracking-widest mt-2 underline cursor-pointer" onClick={() => setActiveTab("borrows")}>View Details</p>
                  </div>
                  <div className="bg-white p-8 rounded-[40px] border border-[#E8E4D9] premium-shadow">
                    <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-4">Overdue</p>
                    <p className={cn("text-4xl font-serif font-bold", overdueCount > 0 ? "text-red-500" : "text-[#33302C]")}>{overdueCount}</p>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-2">{overdueCount > 0 ? "Immediate Action Required" : "Account in Good Standing"}</p>
                  </div>
                  <div className="bg-white p-8 rounded-[40px] border border-[#E8E4D9] premium-shadow">
                    <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-4">Balance</p>
                    <p className="text-4xl font-serif font-bold text-[#33302C] tracking-tighter">${totalFine.toFixed(2)}</p>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-2">Accrued Fines (USD)</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-serif font-bold text-2xl text-[#33302C] mb-8 flex items-center gap-3">
                    <History size={24} className="text-stone-300" /> Recent Activity
                  </h3>
                  <div className="space-y-4">
                    {borrows.slice(0, 3).map(borrow => (
                      <div key={borrow.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-[#E8E4D9]">
                        <div className="w-10 h-10 rounded-full bg-[#F4F1EA] flex items-center justify-center flex-shrink-0">
                          {borrow.status === "returned" ? <CheckCircle2 className="text-green-600" size={18} /> : <Clock className="text-[#5A634D]" size={18} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-[#33302C]">
                             {borrow.status === "returned" ? "Returned" : 
                              borrow.status === "pending" ? "Requested" :
                              borrow.status === "pending_return" ? "Return Pending" :
                              borrow.status === "denied" ? "Denied" : "Borrowed"} <span className="font-serif italic font-medium">{borrow.bookTitle}</span>
                          </p>
                          <p className="text-[10px] text-stone-400 font-medium uppercase tracking-widest">{formatDate(borrow.status === "returned" ? borrow.returnDate! : borrow.issueDate)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "borrows" && (
              <div className="space-y-6">
                <h3 className="font-serif font-bold text-2xl text-[#33302C] mb-8">Active Works</h3>
                {currentBorrows.length > 0 ? currentBorrows.map(borrow => (
                  <div key={borrow.id} className="bg-white p-8 rounded-[40px] border border-[#E8E4D9] flex flex-col md:flex-row gap-8 items-center premium-shadow group">
                    <div className="w-24 aspect-[3/4] rounded-2xl overflow-hidden flex-shrink-0 bg-stone-50 border border-[#E8E4D9] group-hover:scale-105 transition-transform">
                      <img src={borrow.bookImage} alt={borrow.bookTitle} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h4 className="font-serif font-bold text-xl text-[#33302C] mb-2 leading-tight uppercase">{borrow.bookTitle}</h4>
                      <div className="flex flex-wrap justify-center md:justify-start gap-6 text-[10px] font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-2 text-stone-400">
                          <Calendar size={14} /> Issued: {formatDate(borrow.issueDate)}
                        </div>
                        <div className={cn(
                          "flex items-center gap-2",
                          borrow.status === "overdue" ? "text-red-500" : "text-[#5A634D]"
                        )}>
                          <Clock size={14} /> Due: {formatDate(borrow.dueDate)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => alert("Renewal request submitted to librarian.")}
                        className="px-6 py-4 bg-[#F4F1EA] text-[#33302C] rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#E8E4D9] transition-all"
                      >
                        Renew
                      </button>
                      {borrow.status === "pending_return" ? (
                        <button 
                          disabled
                          className="px-6 py-4 bg-stone-100 text-stone-400 border border-[#E8E4D9] rounded-2xl text-[10px] font-bold uppercase tracking-widest cursor-not-allowed"
                        >
                          Return Pending
                        </button>
                      ) : (
                        <button 
                          onClick={() => borrowService.returnBook(borrow.id).then(() => window.location.reload())}
                          className="px-6 py-4 bg-[#5A634D] text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#4A533D] transition-all premium-shadow"
                        >
                          Return
                        </button>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="bg-[#F4F1EA]/50 p-20 rounded-[40px] border border-dashed border-[#E8E4D9] text-center">
                    <p className="text-stone-400 font-bold uppercase tracking-widest text-xs italic">No active works found.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="bg-white rounded-[40px] border border-[#E8E4D9] overflow-hidden premium-shadow">
                <table className="w-full text-left">
                  <thead className="bg-[#F4F1EA] border-b border-[#E8E4D9]">
                    <tr>
                      <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Archived Work</th>
                      <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Returned On</th>
                      <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Fines Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F1EA]">
                    {borrowHistory.map(row => (
                      <tr key={row.id} className="hover:bg-[#FDFCF9] transition-colors">
                        <td className="px-8 py-6 font-bold text-[#33302C] font-serif uppercase text-sm">{row.bookTitle}</td>
                        <td className="px-8 py-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest">{row.returnDate ? formatDate(row.returnDate) : "-"}</td>
                        <td className="px-8 py-6 text-[10px] font-bold text-green-700 uppercase tracking-widest">${(row.fine || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "wishlist" && (
              <div className="bg-[#F4F1EA]/50 p-20 rounded-[40px] border border-dashed border-[#E8E4D9] text-center">
                <p className="text-stone-400 font-bold uppercase tracking-widest text-xs italic">Your literary desiderata is currently empty.</p>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-4">
                <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100 flex gap-4">
                  <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-amber-900 mb-1">Overdue Notice</h5>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">Please return your overdue works to avoid further fine accumulation.</p>
                  </div>
                </div>
                <div className="p-6 rounded-3xl bg-green-50 border border-green-100 flex gap-4">
                  <CheckCircle2 className="text-green-600 flex-shrink-0" size={20} />
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-green-900 mb-1">Membership Renewed</h5>
                    <p className="text-xs text-green-800 leading-relaxed font-medium">Your annual selection status has been verified for the current cycle.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="bg-white p-10 rounded-[40px] border border-[#E8E4D9] premium-shadow space-y-10">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-[32px] bg-[#F4F1EA] flex items-center justify-center text-[#5A634D] border border-[#E8E4D9]">
                    <User size={48} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-3xl text-[#33302C] leading-none uppercase">{user.name}</h3>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2">{user.role} Status: {user.status}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-[#F4F1EA]">
                  <div className="space-y-1">
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Email Address</p>
                    <p className="text-sm font-medium text-[#33302C]">{user.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Member Since</p>
                    <p className="text-sm font-medium text-[#33302C]">Lumina Selection Cycle 2024</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Digital ID</p>
                    <p className="text-sm font-mono font-medium text-[#33302C]">{user.uid}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Total Works Borrowed</p>
                     <p className="text-sm font-medium text-[#33302C]">{borrows.length} volumes</p>
                  </div>
                </div>

                <div className="pt-6">
                  <button className="px-8 py-4 border-2 border-[#E8E4D9] text-[#33302C] rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#33302C] hover:text-white hover:border-[#33302C] transition-all">
                    Modify Registry Details
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit">
            <div className="bg-[#33302C] text-[#FDFCF9] p-10 rounded-[40px] premium-shadow overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#5A634D]/20 blur-3xl -mr-16 -mt-16" />
              <h2 className="font-serif font-bold text-2xl mb-10 relative z-10 uppercase tracking-tighter leading-tight">
                AI INSIGHTS <br /><span className="text-stone-500 italic font-normal">the curated selection.</span>
              </h2>
              
              <div className="space-y-10 relative z-10">
                {recommendations.length > 0 ? recommendations.map((rec, i) => (
                  <motion.div 
                    key={rec.book.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group cursor-pointer"
                    onClick={() => window.location.href = `/book/${rec.book.id}`}
                  >
                    <div className="flex gap-4 items-center mb-4">
                      <div className="w-14 h-20 rounded-xl overflow-hidden bg-stone-800 flex-shrink-0 border border-white/5">
                        <img
                          src={rec.book.image || `https://placehold.co/400x600/E8E4D9/5A634D?text=${encodeURIComponent(rec.book.title)}`}
                          alt={rec.book.title}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                          onError={(e) => {
                            const fallback = `https://placehold.co/400x600/E8E4D9/5A634D?text=${encodeURIComponent(rec.book.title)}`;
                            const img = e.currentTarget;
                            if (img.src !== fallback) img.src = fallback;
                          }}
                        />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-xs text-[#FDFCF9] group-hover:text-[#5A634D] transition-colors leading-[1.1] uppercase mb-1">{rec.book.title}</h4>
                        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-[0.2em]">{rec.book.author}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-stone-400 italic leading-relaxed pl-1 border-l border-stone-800">"{rec.reason}"</p>
                  </motion.div>
                )) : (
                  <div className="animate-pulse space-y-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-4">
                        <div className="w-14 h-20 bg-stone-800 rounded-xl" />
                        <div className="flex-1 space-y-3 mt-3">
                          <div className="h-2 bg-stone-800 rounded w-5/6" />
                          <div className="h-2 bg-stone-800 rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
