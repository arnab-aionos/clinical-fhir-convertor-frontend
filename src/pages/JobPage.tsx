import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { subscribeJobStatus } from "../api/client";
import type { JobResponse } from "../types/api";

// Pipeline stage configuration shown during processing
const PIPELINE_STAGES = [
  { key: "text",       label: "Text Extraction",   hint: "OCR & text parsing",          delay: 0 },
  { key: "clinical",   label: "Clinical Extraction", hint: "Structured data via LLM",   delay: 6 },
  { key: "excel",      label: "Generating Report",  hint: "Building verification report", delay: 14 },
];

function PipelineIndicator({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <div className="mt-5 p-5 rounded-xl bg-amber-500/5 border border-amber-500/20">
      <p className="text-xs text-amber-400/70 mb-4 font-medium tracking-wide uppercase">Pipeline Running</p>
      <div className="space-y-3">
        {PIPELINE_STAGES.map((stage, idx) => {
          const active = elapsed >= stage.delay;
          const done   = idx < PIPELINE_STAGES.length - 1 && elapsed >= PIPELINE_STAGES[idx + 1].delay;
          return (
            <div key={stage.key} className="flex items-center gap-3">
              {/* indicator dot */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-700 ${
                done   ? "bg-emerald-500/30 border border-emerald-500/50"
                : active ? "bg-amber-500/20 border border-amber-400/40"
                : "bg-slate-800 border border-slate-700"
              }`}>
                {done ? (
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : active ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                )}
              </div>
              {/* label */}
              <div>
                <p className={`text-sm font-medium transition-colors duration-500 ${
                  done ? "text-emerald-300" : active ? "text-amber-300" : "text-slate-600"
                }`}>{stage.label}</p>
                {active && !done && (
                  <p className="text-xs text-amber-400/60 mt-0.5">{stage.hint}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function JobPage() {
  const { jobId }       = useParams<{ jobId: string }>();
  const navigate        = useNavigate();
  const [job, setJob]   = useState<JobResponse | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const esRef           = useRef<EventSource | null>(null);
  const processingStart = useRef<number>(Date.now());

  useEffect(() => {
    if (!jobId) return;
    processingStart.current = Date.now();

    const es = subscribeJobStatus(
      jobId,
      (j) => {
        setJob(j);
        if (j.status === "awaiting_verification") {
          es.close();
          navigate(`/jobs/${jobId}/review`, { replace: true });
        } else if (j.status === "completed") {
          es.close();
          navigate(`/jobs/${jobId}/output`, { replace: true });
        } else if (j.status === "failed") {
          es.close();
        }
      },
      () => setPageError("Connection lost — please refresh the page"),
    );
    esRef.current = es;
    return () => es.close();
  }, [jobId, navigate]);

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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-slate-500 text-xs mb-1 font-mono">{job.job_id}</p>
            <h1 className="text-xl font-bold text-white break-all">{job.filename}</h1>
            {job.document_type && (
              <span className="mt-2 inline-block px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs">
                {job.document_type.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <Link to="/" className="btn-secondary text-sm flex-shrink-0">← New Upload</Link>
        </div>

        {/* Processing animation */}
        {(job.status === "pending" || job.status === "processing") && (
          <PipelineIndicator startedAt={processingStart.current} />
        )}

        {/* Failed state */}
        {job.status === "failed" && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
            <p className="font-semibold mb-1">Pipeline Error</p>
            <p className="text-sm opacity-80">{job.error_message ?? "An unknown error occurred."}</p>
            <Link to="/" className="btn-secondary mt-4 inline-block text-sm">← Try Another File</Link>
          </div>
        )}
      </div>
    </div>
  );
}
