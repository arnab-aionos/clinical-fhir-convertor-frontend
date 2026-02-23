import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <span className="font-bold text-lg gradient-text">CliniFHIR</span>
        </Link>

        <div className="flex items-center gap-6 text-sm text-slate-400">
          <Link to="/" className="hover:text-white transition-colors">Upload</Link>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors"
          >
            API Docs ↗
          </a>
          <span className="px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
            NHCX PS2
          </span>
        </div>
      </div>
    </nav>
  );
}
