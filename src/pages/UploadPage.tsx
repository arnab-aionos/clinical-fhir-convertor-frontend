import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadFile } from "../api/client";
import UploadZone from "../components/UploadZone";

export default function UploadPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const job = await uploadFile(file);
      navigate(`/jobs/${job.job_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse-fast" />
          NHCX Hackathon PS2 · AI-Powered FHIR R4 Conversion
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Clinical Documents to{" "}
          <span className="gradient-text">FHIR R4</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Upload a discharge summary or diagnostic report. Our AI pipeline (Surya OCR + Llama 3.3 70B)
          extracts structured data and generates ABDM/NHCX-compliant FHIR bundles.
        </p>
      </div>

      {/* Upload zone */}
      <div className="glass p-2 mb-6">
        <UploadZone onFile={handleFile} loading={loading} />
      </div>

      {/* Error */}
      {error && (
        <div className="glass border border-red-500/30 bg-red-500/10 rounded-xl p-4 text-red-300 text-sm flex gap-3">
          <span className="mt-0.5">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Feature grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
        {[
          { icon: "🔍", title: "Surya OCR", desc: "Handles scanned & digital PDFs from any Indian hospital format" },
          { icon: "🧠", title: "Llama 3.3 70B", desc: "Free Groq API extracts diagnoses, vitals, medications, lab results" },
          { icon: "🏥", title: "NHCX FHIR R4", desc: "Generates ABDM-compliant bundles: Composition, DiagnosticReport, Observation" },
        ].map(f => (
          <div key={f.title} className="glass p-5 hover:bg-white/8 transition-all">
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-white mb-1">{f.title}</h3>
            <p className="text-slate-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
