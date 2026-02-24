import { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getJob, getExtracted, updateExtracted, generateFhir, getExcelUrl } from "../api/client";
import type { JobResponse, JobExtractedResponse, JobStatus } from "../types/api";

const STATUS_CONFIG: Record<JobStatus, { dot: string; text: string; label: string }> = {
  pending:               { dot: "bg-slate-400",   text: "text-slate-300",  label: "Queued" },
  processing:            { dot: "bg-amber-400",   text: "text-amber-300",  label: "Processing" },
  awaiting_verification: { dot: "bg-amber-400",   text: "text-amber-300",  label: "Awaiting Review" },
  completed:             { dot: "bg-emerald-400", text: "text-emerald-300", label: "Completed" },
  failed:                { dot: "bg-red-400",     text: "text-red-300",    label: "Failed" },
};

// Top-level keys to surface as editable sections (in display order).
// Keys not in this list (like _confidence) are silently preserved but not shown.
const SECTION_ORDER = [
  "patient", "encounter", "diagnoses", "medications",
  "vitals", "investigations", "procedures", "chief_complaints",
  "treating_doctor", "referring_doctor", "laboratory",
  "observations", "test_category", "report_date", "interpretation",
];

function sectionLabel(key: string): string {
  const map: Record<string, string> = {
    patient: "Patient", encounter: "Encounter", diagnoses: "Diagnoses",
    medications: "Medications", vitals: "Vitals", investigations: "Investigations",
    procedures: "Procedures", chief_complaints: "Chief Complaints",
    treating_doctor: "Treating Doctor", referring_doctor: "Referring Doctor",
    laboratory: "Laboratory", observations: "Observations",
    test_category: "Test Category", report_date: "Report Date",
    interpretation: "Interpretation",
  };
  return map[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

interface SectionEditorProps {
  sectionKey: string;
  value: unknown;
  onSave: (updated: unknown) => Promise<void>;
}

function SectionEditor({ sectionKey, value, onSave }: SectionEditorProps) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    let parsed: unknown;
    try { parsed = JSON.parse(text); }
    catch { setError("Invalid JSON — fix the syntax before saving."); return; }
    setSaving(true);
    try {
      await onSave(parsed);
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">
          Edit the JSON for this section, then click Save Changes.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => { setText(JSON.stringify(value, null, 2)); setDirty(false); setError(null); }}
            className="btn-secondary text-xs"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className={`btn-primary text-xs flex items-center gap-2 ${!dirty && !saving ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {saving && <div className="spinner w-3 h-3" />}
            {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>
      )}

      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setDirty(true); setSaved(false); }}
        className="w-full h-72 font-mono text-xs bg-black/30 border border-white/10 rounded-xl
                   p-4 text-emerald-300 resize-y focus:outline-none focus:ring-2
                   focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
        spellCheck={false}
        data-testid={`section-editor-${sectionKey}`}
      />
    </div>
  );
}

export default function ReviewPage() {
  const { jobId }   = useParams<{ jobId: string }>();
  const navigate    = useNavigate();
  const [job, setJob]             = useState<JobResponse | null>(null);
  const [extracted, setExtracted] = useState<JobExtractedResponse | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]   = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!jobId) return;
    try {
      const [j, ext] = await Promise.all([getJob(jobId), getExtracted(jobId)]);
      setJob(j);
      setExtracted(ext);
      // Pick first visible section as default tab
      const data = ext.extracted_data ?? {};
      const sections = SECTION_ORDER.filter(k => k in data);
      if (sections.length > 0 && !activeTab) setActiveTab(sections[0]);
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : "Failed to load job data");
    }
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleSaveSection = async (sectionKey: string, newValue: unknown) => {
    if (!jobId || !extracted) return;
    const updated = { ...(extracted.extracted_data ?? {}), [sectionKey]: newValue };
    const response = await updateExtracted(jobId, updated);
    setExtracted(response);
  };

  const handleGenerateFhir = async () => {
    if (!jobId) return;
    setShowConfirm(false);
    setGenError(null);
    setGenerating(true);
    try {
      await generateFhir(jobId);
      navigate(`/jobs/${jobId}/output`);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "FHIR generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (pageError) return (
    <div className="glass border border-red-500/30 bg-red-500/10 rounded-xl p-6 text-red-300">
      <p className="font-semibold mb-1">Error</p>
      <p className="text-sm">{pageError}</p>
      <Link to="/" className="btn-secondary mt-4 inline-block text-sm">← New Upload</Link>
    </div>
  );

  if (!job || !extracted) return (
    <div className="flex justify-center items-center h-64">
      <div className="spinner w-8 h-8 border-2" />
    </div>
  );

  const data = extracted.extracted_data ?? {};
  const sections = SECTION_ORDER.filter(k => k in data);

  return (
    <div>
      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass rounded-2xl p-6 max-w-md w-full border border-indigo-500/30">
            <h3 className="text-lg font-bold text-white mb-2">Generate FHIR Bundle?</h3>
            <p className="text-slate-400 text-sm mb-6">
              This will create the FHIR R4 bundle from the current extracted data.
              Make sure you have saved all your corrections before proceeding.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleGenerateFhir} disabled={generating} className="btn-primary text-sm flex items-center gap-2">
                {generating && <div className="spinner w-4 h-4" />}
                {generating ? "Generating…" : "Confirm & Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6 flex-col lg:flex-row">

        {/* ── Left sidebar ── */}
        <div className="lg:w-72 flex-shrink-0 space-y-4">

          {/* Document metadata */}
          <div className="glass p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              {(() => {
                const cfg = STATUS_CONFIG[job.status as JobStatus] ?? STATUS_CONFIG.pending;
                return (
                  <>
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className={`text-xs font-medium ${cfg.text} uppercase tracking-wide`}>{cfg.label}</span>
                  </>
                );
              })()}
            </div>
            <h1 className="text-base font-bold text-white break-all mb-1">{job.filename}</h1>
            {job.document_type && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs mb-3">
                {job.document_type.replace(/_/g, " ")}
              </span>
            )}
            <div className="space-y-1 text-xs text-slate-500">
              <p><span className="text-slate-400">Job ID:</span> <span className="font-mono text-slate-500">{job.job_id.slice(0, 8)}…</span></p>
              <p><span className="text-slate-400">Submitted:</span> {new Date(job.created_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Excel workbook download */}
          {job.excel_export_path && (
            <div className="glass p-5 rounded-xl">
              <p className="text-sm font-semibold text-white mb-1">Verification Report</p>
              <p className="text-xs text-slate-500 mb-3">Download the cross-verification workbook to review all extracted fields.</p>
              <a
                href={getExcelUrl(job.job_id)}
                download
                className="btn-secondary text-xs w-full flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Excel (.xlsx)
              </a>
            </div>
          )}

          {/* FHIR generation gate */}
          <div className="glass p-5 rounded-xl border border-indigo-500/20">
            <p className="text-sm font-semibold text-white mb-1">FHIR Generation</p>
            <p className="text-xs text-slate-500 mb-3">
              {job.status === "completed"
                ? "FHIR bundle already generated. You can regenerate after saving corrections."
                : "Review and correct extracted data above, then generate the FHIR R4 bundle."}
            </p>
            {genError && (
              <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{genError}</div>
            )}
            {job.status === "completed" && (
              <Link
                to={`/jobs/${jobId}/output`}
                className="btn-secondary text-sm w-full flex items-center justify-center gap-2 mb-2"
              >
                View Output →
              </Link>
            )}
            <button
              onClick={() => setShowConfirm(true)}
              disabled={generating}
              className="btn-primary text-sm w-full flex items-center justify-center gap-2"
            >
              {generating && <div className="spinner w-4 h-4" />}
              {generating ? "Generating…" : job.status === "completed" ? "Regenerate FHIR Bundle →" : "Generate FHIR Bundle →"}
            </button>
          </div>

          <Link to="/" className="btn-secondary text-sm w-full flex items-center justify-center">
            ← New Upload
          </Link>
        </div>

        {/* ── Right panel — tabbed section editor ── */}
        <div className="flex-1 min-w-0">
          {sections.length === 0 ? (
            <div className="glass p-6 rounded-xl text-slate-500 text-center">No extracted data available.</div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex flex-wrap gap-1 mb-4 glass p-1 rounded-xl">
                {sections.map(key => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === key
                        ? "bg-indigo-500/30 text-indigo-200 border border-indigo-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {sectionLabel(key)}
                  </button>
                ))}
              </div>

              {/* Active section editor */}
              {activeTab && activeTab in data && (
                <div className="glass p-5 rounded-xl">
                  <h2 className="text-base font-semibold text-white mb-4">{sectionLabel(activeTab)}</h2>
                  <SectionEditor
                    key={activeTab}
                    sectionKey={activeTab}
                    value={data[activeTab]}
                    onSave={v => handleSaveSection(activeTab, v)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
