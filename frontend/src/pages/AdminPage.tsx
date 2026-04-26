import React from "react";
import axios from "axios";
import { Plus, Users, Library, BarChart3, Trash2, Edit3, Save, X, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { bookService } from "../services/books";
import { authService } from "../services/auth";
import { adminService } from "../services/admin";
import { Book, UserProfile, UserRole } from "../types";
import { cn } from "../lib/utils";

export default function AdminPage() {
  const [books, setBooks] = React.useState<Book[]>([]);
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = React.useState<"inventory" | "members" | "requests" | "analytics" | "reports">("inventory");
  const [loading, setLoading] = React.useState(true);
  
  // Book Form
  const [isEditing, setIsEditing] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<Partial<Book>>({});

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${authService.getToken()}` }
  });
  
  const categories = React.useMemo(() => {
    const counts = books.reduce<Record<string, number>>((acc, book) => {
      const category = book.category?.trim() || "Uncategorized";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, count], index) => ({ id: `${index + 1}`, name, count: Number(count) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [books]);

  const [pendingRequests, setPendingRequests] = React.useState<any[]>([]);
  const [revenue, setRevenue] = React.useState(0);
  const [dueDates, setDueDates] = React.useState<Record<string, string>>({});

  // Stats for analytics
  const stats = {
    totalBooks: books.reduce((acc, b) => acc + b.totalCopies, 0),
    totalUsers: users.length,
    activeBorrows: books.reduce((acc, b) => acc + (b.totalCopies - b.availableCopies), 0),
    revenue,
    inventoryValue: books.reduce((acc, b) => acc + (b.totalCopies * 25), 0),
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const booksData = await bookService.getAllBooks();
      setBooks(booksData);
      
      const usersRes = await axios.get("/api/admin/users", getHeaders());
      setUsers(usersRes.data.map((u: any) => ({ ...u, uid: u.id || u._id })));

      const pending = await adminService.getPendingRequests();
      setPendingRequests(pending);

      const statsRes = await adminService.getStats();
      setRevenue(statsRes.revenue || 0);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantRequest = async (id: string) => {
    try {
      const request = pendingRequests.find((req) => (req.id || req._id) === id);
      const dueDate = dueDates[id];
      if (request?.status === "pending" && !dueDate) {
        alert("Please select a due date before approving this borrow request.");
        return;
      }

      await adminService.approveRequest(id, dueDate);
      setPendingRequests(prev => prev.filter(req => (req.id || req._id) !== id));
      alert("Request granted successfully.");
      fetchData(); // Refresh to update inventory stats
    } catch (err: any) {
      alert("Failed to grant request: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDenyRequest = async (id: string) => {
    try {
      await adminService.denyRequest(id);
      setPendingRequests(prev => prev.filter(req => (req.id || req._id) !== id));
      alert("Request denied.");
    } catch (err: any) {
      alert("Failed to deny request: " + (err.response?.data?.message || err.message));
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleSaveBook = async () => {
    try {
      if (isEditing && isEditing !== "new") {
        await bookService.updateBook(isEditing, formData);
      } else {
        await bookService.addBook({
          ...formData,
          rating: 4.5,
          reviewCount: 0
        });
      }
      setIsEditing(null);
      setFormData({});
      fetchData();
    } catch (err) {
      console.error("Save book error:", err);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this book?")) {
      try {
        await bookService.deleteBook(id);
        fetchData();
      } catch (err) {
        console.error("Delete book error:", err);
      }
    }
  };

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
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-2">Curator Mastery</p>
            <h1 className="font-serif font-bold text-5xl md:text-7xl text-[#33302C] tracking-tighter uppercase leading-[0.85]">
              System<br /><span className="text-stone-400 tracking-normal italic normal-case text-4xl font-normal font-serif">Governance.</span>
            </h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => { setIsEditing("new"); setFormData({ totalCopies: 1, availableCopies: 1 }); }}
              className="px-8 py-4 bg-[#33302C] text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-stone-800 transition-all premium-shadow"
            >
              <Plus size={16} /> Catalog New Work
            </button>
            <button 
              onClick={() => window.print()}
              className="px-8 py-4 border-2 border-[#E8E4D9] text-[#33302C] rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:border-[#33302C] transition-all"
            >
              Export Report
            </button>
          </div>
        </header>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-12">
           {[
             { label: "Total Asset Count", value: stats.totalBooks, color: "bg-white" },
             { label: "Active Registry", value: stats.totalUsers, color: "bg-white" },
             { label: "Current Borrowing", value: stats.activeBorrows, color: "bg-white" },
             { label: "Revenue (YTD)", value: `$${stats.revenue.toLocaleString()}`, color: "bg-green-50" },
             { label: "Inventory Value", value: `$${stats.inventoryValue.toLocaleString()}`, color: "bg-stone-100" },
           ].map((stat, i) => (
             <div key={i} className={cn("p-6 rounded-3xl border border-[#E8E4D9] premium-shadow", stat.color)}>
               <p className="text-[8px] font-bold uppercase tracking-widest text-stone-400 mb-2">{stat.label}</p>
               <p className="text-xl font-serif font-bold text-[#33302C]">{stat.value}</p>
             </div>
           ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-[#E8E4D9] mb-12 overflow-x-auto no-scrollbar">
          {[
            { id: "inventory", label: "Inventory", icon: <Library size={16} /> },
            { id: "members", label: "Members", icon: <Users size={16} /> },
            { id: "requests", label: "Approvals", icon: <CheckCircle2 size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "pb-4 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 border-b-2 transition-all whitespace-nowrap",
                activeTab === tab.id ? "border-[#33302C] text-[#33302C]" : "border-transparent text-stone-400 hover:text-stone-600"
              )}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "inventory" && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
               <div className="lg:col-span-3">
                  <div className="bg-white rounded-[40px] border border-[#E8E4D9] premium-shadow overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-[#F4F1EA] border-b border-[#E8E4D9]">
                        <tr>
                          <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Work Portfolio</th>
                          <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Classification</th>
                          <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Circulation</th>
                          <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Management</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {books.map(book => (
                          <tr key={book.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <div className="flex gap-4 items-center">
                                <div className="w-12 h-16 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-[#E8E4D9]">
                                  <img src={book.image} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <p className="font-serif font-bold text-[#33302C] text-sm leading-tight">{book.title.toUpperCase()}</p>
                                  <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-1 italic">{book.author} • {book.isbn}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className="px-3 py-1 rounded-full bg-[#F4F1EA] text-[#5A634D] text-[9px] font-bold uppercase tracking-widest border border-[#E8E4D9]">{book.category}</span>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-[10px] font-bold text-[#33302C] tracking-widest mb-1">{book.availableCopies} available of {book.totalCopies}</p>
                              <div className="w-24 h-1.5 bg-[#F4F1EA] rounded-full overflow-hidden border border-stone-200">
                                <div 
                                  className="h-full bg-[#5A634D] transition-all duration-500" 
                                  style={{ width: `${(book.availableCopies / book.totalCopies) * 100}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex gap-2">
                                <button onClick={() => { setIsEditing(book.id); setFormData(book); }} className="p-3 bg-stone-100 rounded-xl text-stone-400 hover:text-[#33302C] hover:bg-stone-200 transition-all">
                                  <Edit3 size={16} />
                                </button>
                                <button onClick={() => handleDeleteBook(book.id)} className="p-3 bg-red-50 rounded-xl text-red-300 hover:text-red-500 hover:bg-red-100 transition-all">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
               
               <div className="space-y-8">
                  <div className="bg-[#33302C] text-white p-8 rounded-[40px] premium-shadow">
                    <h4 className="font-serif font-bold text-xl mb-6 uppercase tracking-tight leading-none">Classifications</h4>
                    <div className="space-y-4">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between group cursor-pointer">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 group-hover:text-white transition-colors">{cat.name}</p>
                          <span className="text-[10px] font-mono py-1 px-2 bg-white/10 rounded-lg">{cat.count}</span>
                        </div>
                      ))}
                      {categories.length === 0 && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                          No categories yet.
                        </p>
                      )}
                      <button className="w-full py-4 mt-4 border border-white/20 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">
                        Manage Categories
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white p-8 rounded-[40px] border border-[#E8E4D9] premium-shadow">
                     <h4 className="font-serif font-bold text-xl text-[#33302C] mb-4 uppercase tracking-tight leading-none">Inventory Health</h4>
                     <div className="space-y-6">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Total Stock Capacity</span>
                            <span className="text-[10px] font-bold text-[#33302C]">85%</span>
                          </div>
                          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#5A634D] w-[85%]" />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Categorical Diversity</span>
                            <span className="text-[10px] font-bold text-[#33302C]">12 Sectors</span>
                          </div>
                          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#33302C] w-[60%]" />
                          </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === "members" && (
           <div className="bg-white rounded-[40px] border border-[#E8E4D9] premium-shadow overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#F4F1EA] border-b border-[#E8E4D9]">
                <tr>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Participant Identity</th>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Grade</th>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Registry Status</th>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Active Allocations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {users.filter(u => u.role !== 'admin').map(u => (
                  <tr key={u.uid} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-serif font-bold text-[#33302C] text-sm uppercase">{u.name}</p>
                      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">{u.role}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-green-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {u.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-serif font-bold text-[#33302C] tracking-tight">{u.borrowedCount} Volumes</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
           </div>
        )}

        {activeTab === "requests" && (
          <div className="bg-white rounded-[40px] border border-[#E8E4D9] premium-shadow overflow-hidden">
             <table className="w-full text-left">
              <thead className="bg-[#F4F1EA] border-b border-[#E8E4D9]">
                <tr>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Applicant</th>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Request Type</th>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Requested Work</th>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Due Date</th>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[10px] text-stone-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {pendingRequests.map(req => (
                  <tr key={req.id || req._id} className="hover:bg-stone-50/50">
                    <td className="px-8 py-6">
                      <p className="font-serif font-bold text-sm text-[#33302C] uppercase">{req.user?.name || "Unknown"}</p>
                      <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-1">Dues: ${(req.totalFine || 0).toFixed(2)}</p>
                    </td>
                    <td className="px-8 py-6">
                       <span className={cn(
                         "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                         req.status === "pending_return" 
                           ? "bg-purple-50 text-purple-600 border-purple-100"
                           : "bg-blue-50 text-blue-600 border-blue-100"
                       )}>
                         {req.status === "pending_return" ? "Return" : "Borrow"}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-stone-700">{req.bookTitle?.toUpperCase()}</td>
                    <td className="px-8 py-6">
                      {req.status === "pending" ? (
                        <input
                          type="date"
                          value={dueDates[req.id || req._id] || ""}
                          onChange={(e) => setDueDates((prev) => ({ ...prev, [req.id || req._id]: e.target.value }))}
                          className="px-3 py-2 rounded-lg border border-[#E8E4D9] text-[10px] font-bold uppercase tracking-widest text-[#33302C] bg-white"
                        />
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          Existing: {req.dueDate ? new Date(req.dueDate).toLocaleDateString() : "-"}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex gap-2">
                          <button onClick={() => handleGrantRequest(req.id || req._id)} className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-green-100 hover:bg-green-100 transition-colors">Grant</button>
                          <button onClick={() => handleDenyRequest(req.id || req._id)} className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-colors">Deny</button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
             </table>
          </div>
        )}



      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#33302C]/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-[40px] p-10 premium-shadow relative overflow-hidden border border-[#E8E4D9]"
          >
             <button onClick={() => setIsEditing(null)} className="absolute top-8 right-8 text-stone-400 hover:text-[#33302C]">
                <X size={24} />
             </button>
             <h2 className="font-serif font-bold text-3xl text-[#33302C] mb-8 uppercase tracking-tight">
               {isEditing === "new" ? "ADD NEW WORK" : "EDIT WORK"}
             </h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
               <div className="space-y-4">
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">Title</label>
                 <input 
                   type="text" 
                   value={formData.title || ""} 
                   onChange={e => setFormData({...formData, title: e.target.value})}
                   className="w-full bg-stone-50 border border-[#E8E4D9] rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A634D]/20"
                 />
               </div>
               <div className="space-y-4">
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">Author</label>
                 <input 
                   type="text" 
                   value={formData.author || ""} 
                   onChange={e => setFormData({...formData, author: e.target.value})}
                   className="w-full bg-stone-50 border border-[#E8E4D9] rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A634D]/20"
                 />
               </div>
               <div className="space-y-4">
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">Category</label>
                 <select 
                   value={formData.category || ""} 
                   onChange={e => setFormData({...formData, category: e.target.value})}
                   className="w-full bg-stone-50 border border-[#E8E4D9] rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A634D]/20"
                 >
                   <option value="Fiction">Fiction</option>
                   <option value="Non-Fiction">Non-Fiction</option>
                   <option value="Science">Science</option>
                   <option value="Technology">Technology</option>
                   <option value="History">History</option>
                   <option value="Classic">Classic</option>
                 </select>
               </div>
               <div className="space-y-4">
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">ISBN</label>
                 <input 
                   type="text" 
                   value={formData.isbn || ""} 
                   onChange={e => setFormData({...formData, isbn: e.target.value})}
                   className="w-full bg-stone-50 border border-[#E8E4D9] rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A634D]/20"
                 />
               </div>
               <div className="space-y-4">
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">Total Copies</label>
                 <input 
                   type="number" 
                   value={formData.totalCopies || 1} 
                   onChange={e => setFormData({...formData, totalCopies: parseInt(e.target.value), availableCopies: parseInt(e.target.value)})}
                   className="w-full bg-stone-50 border border-[#E8E4D9] rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A634D]/20"
                 />
               </div>
               <div className="space-y-4">
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">Cover URL</label>
                 <input 
                   type="text" 
                   value={formData.image || ""} 
                   onChange={e => setFormData({...formData, image: e.target.value})}
                   className="w-full bg-stone-50 border border-[#E8E4D9] rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A634D]/20"
                 />
               </div>
             </div>
             <div className="space-y-4 mb-10">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">Description</label>
                <textarea 
                  rows={3}
                  value={formData.description || ""} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-stone-50 border border-[#E8E4D9] rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A634D]/20 resize-none font-sans"
                />
             </div>
             
             <button 
              onClick={handleSaveBook}
              className="w-full h-16 bg-[#5A634D] text-white rounded-3xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#4A533D] transition-all premium-shadow"
             >
                <Save size={18} /> Save Work
             </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
