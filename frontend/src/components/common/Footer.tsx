import { BookOpen, Github, Twitter, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-zinc-100 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <BookOpen className="text-white w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight">Lumina</span>
            </Link>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Redefining the library experience with a premium digital sanctum for knowledge seekers.
            </p>
          </div>
          
          <div>
            <h4 className="font-display font-semibold text-zinc-900 mb-6">Platform</h4>
            <ul className="space-y-4">
              <li><Link to="/catalog" className="text-zinc-500 hover:text-zinc-900 text-sm transition-colors">Catalog</Link></li>
              <li><Link to="/search" className="text-zinc-500 hover:text-zinc-900 text-sm transition-colors">Global Search</Link></li>
              <li><Link to="/categories" className="text-zinc-500 hover:text-zinc-900 text-sm transition-colors">Categories</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-zinc-900 mb-6">Company</h4>
            <ul className="space-y-4">
              <li><Link to="/about" className="text-zinc-500 hover:text-zinc-900 text-sm transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-zinc-500 hover:text-zinc-900 text-sm transition-colors">Contact</Link></li>
              <li><Link to="/terms" className="text-zinc-500 hover:text-zinc-900 text-sm transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-zinc-900 mb-6">Connect</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 transition-all">
                <Github size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 transition-all">
                <Twitter size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 transition-all">
                <Instagram size={20} />
              </a>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-zinc-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-zinc-400 text-xs">© 2026 Lumina Library Management System. All rights reserved.</p>
          <div className="flex gap-8">
            <Link to="/privacy" className="text-zinc-400 hover:text-zinc-900 text-xs transition-colors">Privacy Policy</Link>
            <Link to="/cookies" className="text-zinc-400 hover:text-zinc-900 text-xs transition-colors">Cookie Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
