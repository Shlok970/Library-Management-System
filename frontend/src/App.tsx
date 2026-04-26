import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { authService } from "./services/auth";
import { UserProfile, UserRole } from "./types";

import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import BookDetailsPage from "./pages/BookDetailsPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Force sign-out on every fresh site load as requested.
    authService.clearSession();
    setUser(null);
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-[#5A634D] rounded-full animate-spin" />
          <p className="text-stone-400 font-serif font-medium uppercase tracking-[0.2em] text-xs">Initializing Sanctuary</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-stone-50">
        <Navbar user={user} onLogout={handleLogout} />
        
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/book/:id" element={<BookDetailsPage user={user} />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/register" element={<RegisterPage onLogin={handleLogin} />} />
            
            <Route 
              path="/dashboard" 
              element={user && user.role !== UserRole.GUEST ? <DashboardPage user={user} /> : <Navigate to="/login" />} 
            />
            
            <Route 
              path="/admin" 
              element={user?.role === UserRole.ADMIN ? <AdminPage /> : <Navigate to="/login" />} 
            />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}
