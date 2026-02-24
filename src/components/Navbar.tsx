import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const { pathname } = useLocation();

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm transition-colors duration-150 ${
        pathname === to
          ? "text-white font-medium"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50" style={{ background: "rgba(6,11,24,0.92)", borderBottom: "1px solid #1a2740", backdropFilter: "blur(12px)" }}>
      <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-15 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="font-bold text-base gradient-text tracking-tight">IntelliCliniq</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-7">
          {navLink("/", "Upload")}
          {navLink("/history", "History")}
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150 flex items-center gap-1"
          >
            API Docs
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide"
                style={{ background: "rgba(14,165,233,0.12)", color: "#38bdf8", border: "1px solid rgba(14,165,233,0.25)" }}>
            NHCX PS2
          </span>
        </div>
      </div>
    </nav>
  );
}
