import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { BookOpen, User, LogOut, Menu, X } from "lucide-react";
import { UserProfile, UserRole } from "../../types";
import { cn } from "../../lib/utils";

interface NavbarProps {
  user: UserProfile | null;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: "Catalog", path: "/catalog" },
  ];

  if (user && user.role !== UserRole.GUEST) {
    navLinks.push({ name: "My Library", path: "/dashboard" });
  }
  if (user?.role === UserRole.ADMIN) {
    navLinks.push({ name: "Admin", path: "/admin" });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4 pointer-events-none">
      <div className="max-w-7xl mx-auto pointer-events-auto">
        <div className="glass rounded-2xl px-6 py-3 flex items-center justify-between border border-[#E8E4D9]/20 shadow-lg">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-[#5A634D] rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-[#33302C]">Lumina</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "text-xs font-bold uppercase tracking-widest transition-colors hover:text-[#5A634D]",
                  location.pathname === link.path ? "text-[#5A634D]" : "text-stone-500"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                {user.role !== UserRole.GUEST ? (
                  <Link to="/dashboard" className="flex items-center gap-2 group">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-[#33302C] leading-none">{user.name}</p>
                      <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mt-1">{user.role}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center border border-[#E8E4D9] overflow-hidden">
                      <User className="w-4 h-4 text-stone-600" />
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-[#33302C] leading-none">{user.name}</p>
                      <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mt-1">{user.role}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center border border-[#E8E4D9] overflow-hidden">
                      <User className="w-4 h-4 text-stone-600" />
                    </div>
                  </div>
                )}
                <button
                  onClick={onLogout}
                  className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2 bg-[#5A634D] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#4A533D] transition-colors premium-shadow"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-[#33302C]"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-20 left-4 right-4 glass rounded-2xl p-6 pointer-events-auto md:hidden border border-[#E8E4D9]/20"
        >
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="text-sm font-bold uppercase tracking-widest text-[#33302C]"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-[#E8E4D9]/20">
              {user ? (
                <button onClick={onLogout} className="text-red-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                  <LogOut className="w-5 h-5" /> Logout
                </button>
              ) : (
                <Link 
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3 bg-[#5A634D] text-white rounded-xl font-bold uppercase tracking-widest text-xs text-center"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
}
