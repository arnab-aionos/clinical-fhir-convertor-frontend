import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import UploadPage from "./pages/UploadPage";
import JobPage from "./pages/JobPage";
import ReviewPage from "./pages/ReviewPage";
import OutputPage from "./pages/OutputPage";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/jobs/:jobId" element={<JobPage />} />
            <Route path="/jobs/:jobId/review" element={<ReviewPage />} />
            <Route path="/jobs/:jobId/output" element={<OutputPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={
              <div className="text-center mt-20">
                <p className="text-5xl mb-4">404</p>
                <p className="text-slate-400">Page not found</p>
              </div>
            } />
          </Routes>
        </main>
        <footer className="text-center py-4 text-xs text-slate-600">
          NHCX Hackathon PS2 · Clinical FHIR Convertor
        </footer>
      </div>
    </BrowserRouter>
  );
}
