import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getJob, getExtracted, generateFhir, getFhir, getValidation,
} from "../api/client";
import type {
  JobResponse, JobExtractedResponse, JobFhirResponse, JobValidationResponse,
} from "../types/api";
import ExtractionViewer from "../components/ExtractionViewer";
import FhirBundleViewer from "../components/FhirBundleViewer";
import ValidationReport from "../components/ValidationReport";
import HumanReviewEditor from "../components/HumanReviewEditor";

type Tab = "extraction" | "review" | "fhir" | "validation";

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  pending:    { label: "Queued",      dot: "bg-slate-400",  text: "text-slate-400" },
  processing: { label: "Processing…", dot: "bg-amber-400 animate-pulse", text: "text-amber-300" },
  completed:  { label: "Completed",   dot: "bg-emerald-400", text: "text-emerald-300" },
  failed:     { label: "Failed",      dot: "bg-red-400",     text: "text-red-300" },
};

export default function JobPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob]           = useState<JobResponse | null>(null);
  const [extracted, setExtracted] = useState<JobExtractedResponse | null>(null);
  const [fhir, setFhir]         = useState<JobFhirResponse | null>(null);
  const [validation, setValidation] = useState<JobValidationResponse | null>(null);
  const [tab, setTab]           = useState<Tab>("extraction");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadExtracted = useCallback(async () => {
    if (!jobId) return;
    try {
      const ext = await getExtracted(jobId);
      setExtracted(ext);
    } catch { /* 202 while still processing is expected */ }
  }, [jobId]);

  const pollStatus = useCallback(async () => {
    if (!jobId) return;
    try {
      const j = await getJob(jobId);
      setJob(j);
      if (j.status === "completed" || j.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        if (j.status === "completed") await loadExtracted();
      }
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : "Failed to load job");
    }
  }, [jobId, loadExtracted]);

  useEffect(() => {
    pollStatus();
    pollRef.current = setInterval(pollStatus, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollStatus]);

  // Pre-load existing FHIR/validation if job already has them
  useEffect(() => {
    if (!jobId || !job || job.status !== "completed") return;
    getFhir(jobId).then(setFhir).catch(() => {});
    getValidation(jobId).then(setValidation).catch(() => {});
  }, [jobId, job?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateFhir = async () => {
    if (!jobId) return;
    setGenError(null);
    setGenLoading(true);
    try {
      const bundle = await generateFhir(jobId);
      setFhir(bundle);
      const val = await getValidation(jobId);
      setValidation(val);
      setTab("fhir");
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenLoading(false);
    }
  };

  if (pageError) return (
    <div className="glass border border-red-500/30 bg-red-500/10 rounded-xl p-6 text-red-300">
      <p className="font-semibold mb-1">Error</p>
      <p className="text-sm">{pageError}</p>
      <Link to="/" className="btn-secondary mt-4 inline-block text-sm">← New Upload</Link>
    </div>
  );

  if (!job) return (
    <div className="flex justify-center items-center h-64">
      <div className="spinner w-8 h-8 border-2" />
    </div>
  );

  const st = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
  const isProcessing = job.status === "pending" || job.status === "processing";

  return (
    <div>
      {/* Job header */}
      <div className="glass p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
              <span className={`text-sm font-medium ${st.text}`}>{st.label}</span>
              {job.document_type && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs">
                  {job.document_type.replace(/_/g, " ")}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">{job.filename}</h1>
            <p className="text-slate-500 text-xs mt-1 font-mono">{job.job_id}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/" className="btn-secondary text-sm">← New Upload</Link>
            {job.status === "completed" && (
              <button
                onClick={handleGenerateFhir}
                disabled={genLoading}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {genLoading && <div className="spinner w-4 h-4" />}
                {genLoading ? "Generating…" : fhir ? "Regenerate FHIR" : "Generate FHIR Bundle"}
              </button>
            )}
          </div>
        </div>

        {/* Processing spinner */}
        {isProcessing && (
          <div className="mt-5 flex items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="spinner w-5 h-5 border-2 border-amber-400/30 border-t-amber-400" />
            <div className="text-sm text-amber-300">
              <p className="font-medium">Pipeline running…</p>
              <p className="text-xs opacity-70 mt-0.5">
                {job.status === "pending" ? "Queued — starting soon" : "OCR → Abbreviation expansion → LLM extraction"}
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {job.status === "failed" && job.error_message && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            <p className="font-semibold mb-1">Pipeline Error</p>
            <p className="text-xs opacity-80">{job.error_message}</p>
          </div>
        )}

        {genError && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{genError}</div>
        )}
      </div>

      {/* Tabs — only when extraction is available */}
      {extracted && (
        <>
          <div className="flex gap-1 mb-6 glass p-1 rounded-xl w-fit">
            {([ "extraction", "review", "fhir", "validation"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  tab === t
                    ? "bg-indigo-500/30 text-indigo-200 border border-indigo-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t === "fhir" ? "FHIR Bundle" : t === "validation" ? "Validation" : t === "review" ? "Edit / Review" : "Extraction"}
                {t === "fhir" && fhir && (
                  <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block align-middle" />
                )}
                {t === "validation" && validation && (
                  <span className={`ml-1.5 w-1.5 h-1.5 rounded-full inline-block align-middle ${
                    validation.is_valid ? "bg-emerald-400" : "bg-red-400"
                  }`} />
                )}
              </button>
            ))}
          </div>

          <div className="glass p-6">
            {tab === "extraction" && <ExtractionViewer data={extracted} />}
            {tab === "review" && (
              <HumanReviewEditor
                jobId={job.job_id}
                data={extracted}
                onSaved={updated => setExtracted(updated)}
              />
            )}
            {tab === "fhir" && (
              fhir
                ? <FhirBundleViewer data={fhir} />
                : <div className="text-center py-10 text-slate-500">
                    <p className="mb-3">No FHIR bundle yet.</p>
                    <button onClick={handleGenerateFhir} disabled={genLoading} className="btn-primary text-sm">
                      {genLoading ? "Generating…" : "Generate FHIR Bundle"}
                    </button>
                  </div>
            )}
            {tab === "validation" && (
              validation
                ? <ValidationReport data={validation} />
                : <p className="text-slate-500 text-center py-10">Generate a FHIR bundle first to see validation results.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
