import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { uploadFile, getJobs } from "../api/client";

type DocType = "discharge_summary" | "diagnostic_report";

interface DocCardProps {
  docType: DocType;
  title: string;
  description: string;
  onNavigate: (jobId: string) => void;
}

function DocCard({ docType, title, description, onNavigate }: DocCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    multiple: false,
    disabled: loading,
  });

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const job = await uploadFile(file, docType);
      onNavigate(job.job_id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-xl p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">{title}</h2>
        <p className="text-slate-400 text-sm">{description}</p>
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-indigo-400 bg-indigo-500/10"
              : "border-white/10 hover:border-white/25 hover:bg-white/3"
          }`}
        >
          <input {...getInputProps()} />
          <svg
            className="w-8 h-8 mx-auto mb-3 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm text-slate-400">
            {isDragActive ? "Drop the file here" : "Drop a file here or click to browse"}
          </p>
          <p className="text-xs text-slate-600 mt-2">PDF, JPEG, PNG</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className="flex items-center gap-3 rounded-lg px-3 py-2.5"
            style={{ background: "#0d1526", border: "1px solid #1a2740" }}
          >
            <svg
              className="w-4 h-4 text-slate-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <span className="text-sm text-slate-300 truncate flex-1">{file.name}</span>
            <button
              onClick={() => { setFile(null); setError(null); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
              disabled={loading}
            >
              Remove
            </button>
          </div>

          {error && (
            <p
              className="text-xs text-red-300 rounded-lg px-3 py-2"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
            >
              {error}
            </p>
          )}

          <button
            onClick={handleUpload}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading && <div className="spinner w-4 h-4" />}
            {loading ? "Uploading…" : "Upload"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
  const navigate = useNavigate();
  const [jobCount, setJobCount] = useState<number | null>(null);

  useEffect(() => {
    getJobs({ page_size: 1 }).then(res => setJobCount(res.total)).catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse-fast" />
          NHCX PS2 · Claim Submission · FHIR R4
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Clinical Documents to{" "}
          <span className="gradient-text">FHIR R4</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Upload discharge summaries and diagnostic reports. The AI pipeline extracts
          structured clinical data and generates NHCX-compliant FHIR R4 bundles
          for health insurance claim submission.
        </p>
      </div>

      {/* Two-card upload layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DocCard
          docType="discharge_summary"
          title="Discharge Summary"
          description="Hospital discharge notes including patient history, diagnoses, medications, vitals, and treatment course."
          onNavigate={id => navigate(`/jobs/${id}`)}
        />
        <DocCard
          docType="diagnostic_report"
          title="Diagnostic Report"
          description="Laboratory results, pathology reports, blood work, radiology findings, and test observations."
          onNavigate={id => navigate(`/jobs/${id}`)}
        />
      </div>

      {/* Recent activity */}
      {jobCount != null && jobCount > 0 && (
        <div className="text-center mt-5">
          <Link to="/history" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            {jobCount} job{jobCount !== 1 ? "s" : ""} in history — View History →
          </Link>
        </div>
      )}

      {/* Feature grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
        {[
          { icon: "🔍", title: "Scanned & Digital PDFs", desc: "Handles scanned & digital PDFs from any Indian hospital format (Surya OCR + PyMuPDF)" },
          { icon: "🧠", title: "AI Clinical Extraction", desc: "Extracts diagnoses, vitals, medications, lab results via Groq Llama 3.3 70B" },
          { icon: "🏥", title: "FHIR R4 Bundle Output", desc: "Generates ABDM-compliant bundles: Composition, DiagnosticReport, Observation" },
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
