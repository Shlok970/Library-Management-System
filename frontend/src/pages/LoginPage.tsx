import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/auth";
import { Mail, Lock, LogIn, ArrowRight, User } from "lucide-react";
import { motion } from "motion/react";
import { UserProfile, UserRole } from "../types";
import { cn } from "../lib/utils";

interface LoginPageProps {
  onLogin: (user: UserProfile) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [activeTab, setActiveTab] = React.useState<"member" | "admin">("member");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await authService.login(email, password);
      
      // If logging in as admin, verify role
      if (activeTab === "admin" && user.role !== "admin") {
        throw new Error("This account does not have administrative privileges.");
      }
      
      onLogin(user);
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestUser: UserProfile = {
      uid: "guest",
      name: "Guest Explorer",
      email: "guest@lumina.com",
      role: UserRole.GUEST,
      status: "active",
      borrowedCount: 0
    };
    onLogin(guestUser);
    localStorage.setItem("user", JSON.stringify(guestUser));
    navigate("/catalog");
  };

  return (
    <div className="pt-32 pb-24 px-6 min-h-[90vh] flex items-center justify-center bg-[#FDFCF9]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <h1 className="font-serif font-bold text-4xl text-[#33302C] mb-3 uppercase tracking-tight">Access Sanctuary</h1>
          <p className="text-stone-500 font-medium italic">Select your path to wisdom.</p>
        </div>

        {/* Guest Option */}
        <button
          onClick={handleGuestLogin}
          className="w-full h-16 mb-8 border-2 border-dashed border-[#E8E4D9] rounded-2xl flex items-center justify-center gap-3 text-stone-400 font-bold uppercase tracking-widest text-xs hover:bg-[#F4F1EA] hover:text-[#5A634D] hover:border-[#5A634D] transition-all group"
        >
          <User size={18} className="group-hover:scale-110 transition-transform" /> Continue as Guest
        </button>

        <div className="bg-white p-8 md:p-10 rounded-[40px] border border-[#E8E4D9] premium-shadow">
          {/* Tabs */}
          <div className="flex gap-6 mb-8 border-b border-[#E8E4D9]">
            <button 
              onClick={() => setActiveTab("member")}
              className={cn(
                "pb-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2",
                activeTab === "member" ? "text-[#5A634D] border-[#5A634D]" : "text-stone-300 border-transparent"
              )}
            >
              Member Login
            </button>
            <button 
              onClick={() => setActiveTab("admin")}
              className={cn(
                "pb-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2",
                activeTab === "admin" ? "text-red-800 border-red-800" : "text-stone-300 border-transparent"
              )}
            >
              Admin Portal
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (activeTab === "member" || activeTab === "admin") && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-2xl uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-4">
                {activeTab === "admin" ? "Admin ID / Email" : "Email Address"}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 w-5 h-5" />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 h-16 bg-[#F4F1EA] border-none rounded-2xl focus:ring-2 focus:ring-[#5A634D]/20 outline-none text-[#33302C] font-medium"
                  placeholder={activeTab === "admin" ? "admin@lumina.com" : "you@example.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-4">Passkey</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 w-5 h-5" />
                <input
                  type="password"
                  required
                  className="w-full pl-12 pr-4 h-16 bg-[#F4F1EA] border-none rounded-2xl focus:ring-2 focus:ring-[#5A634D]/20 outline-none text-[#33302C] font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full h-16 text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all premium-shadow disabled:opacity-50",
                activeTab === "admin" ? "bg-red-900 hover:bg-red-950" : "bg-[#5A634D] hover:bg-[#4A533D]"
              )}
            >
              {loading ? "Authenticating..." : <><LogIn size={20} /> Access Sanctuary</>}
            </button>
          </form>

          {activeTab === "member" && (
            <div className="mt-8 pt-8 border-t border-[#E8E4D9] text-center">
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-4 text-xs">New to the Library?</p>
              <Link 
                to="/register" 
                className="text-[#5A634D] font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:underline"
              >
                Apply for Membership <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
