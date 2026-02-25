import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import { getJob, getExtracted, getFhir, getValidation, getExcelUrl } from "../api/client";
import type {
  JobResponse, JobExtractedResponse, JobFhirResponse, JobValidationResponse,
} from "../types/api";

// Helpers

function toArr(x: unknown): unknown[] {
  return Array.isArray(x) ? (x as unknown[]) : [];
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-baseline py-2.5 border-b last:border-0" style={{ borderColor: "#1a2740" }}>
      <span className="text-xs text-slate-500 uppercase tracking-wide flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-200 text-right max-w-[58%]">{value}</span>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="card p-5 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CollapsibleJson({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);
  const handleCopy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="card rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/3"
      >
        <span className="flex items-center gap-2">
          <span className="text-sky-400 font-mono text-xs font-bold">{"{}"}</span>
          FHIR R4 Bundle — Raw JSON
        </span>
        <svg className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5">
          <div className="flex justify-end mb-2">
            <button onClick={handleCopy} className="btn-secondary text-xs">
              {copied ? "✓ Copied" : "Copy JSON"}
            </button>
          </div>
          <pre className="json-block">{json}</pre>
        </div>
      )}
    </div>
  );
}

function CodeBadge({ system, code }: { system: "ICD-10" | "LOINC"; code: string }) {
  const style = system === "ICD-10"
    ? { background: "rgba(99,102,241,0.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.28)" }
    : { background: "rgba(6,182,212,0.12)",  color: "#67e8f9", border: "1px solid rgba(6,182,212,0.28)" };
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs rounded px-1.5 py-0.5" style={style}>
      <span className="font-sans opacity-60" style={{ fontSize: "10px" }}>{system}</span>
      {code}
    </span>
  );
}

function RenderList({ items }: { items: unknown[] }) {
  if (!items.length) return <p className="text-slate-600 text-xs italic">None recorded</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i}>
          {typeof item === "string" ? (
            <span className="flex items-start gap-2 text-sm text-slate-300">
              <span className="text-sky-500 mt-0.5 flex-shrink-0">•</span>{item}
            </span>
          ) : typeof item === "object" && item !== null ? (
            <div className="rounded-lg p-3" style={{ background: "#0d1526", border: "1px solid #1a2740" }}>
              {/* Clinical code badges */}
              {(!!(item as Record<string, unknown>).icd_code || !!(item as Record<string, unknown>).loinc_code) && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {!!(item as Record<string, unknown>).icd_code && (
                    <CodeBadge system="ICD-10" code={String((item as Record<string, unknown>).icd_code)} />
                  )}
                  {!!(item as Record<string, unknown>).loinc_code && (
                    <CodeBadge system="LOINC" code={String((item as Record<string, unknown>).loinc_code)} />
                  )}
                </div>
              )}
              <div className="space-y-1">
                {Object.entries(item as Record<string, unknown>)
                  .filter(([k, v]) => k !== "icd_code" && k !== "loinc_code" && v != null && v !== "")
                  .map(([k, v]) => (
                    <div key={k} className="flex gap-3 text-xs">
                      <span className="text-slate-500 capitalize min-w-[5.5rem] flex-shrink-0">{k.replace(/_/g, " ")}</span>
                      <span className="text-slate-300">{String(v)}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ListSection({ title, icon, data }: { title: string; icon: string; data: unknown }) {
  const items = toArr(data);
  if (!items.length) return null;
  return (
    <SectionCard title={title} icon={icon}>
      <RenderList items={items} />
    </SectionCard>
  );
}

function RenderVitals({ vitals }: { vitals: Record<string, unknown> }) {
  const entries = Object.entries(vitals).filter(([, v]) => v != null && v !== "");
  if (!entries.length) return <p className="text-slate-600 text-xs italic">No vitals recorded</p>;
  const labelMap: Record<string, string> = {
    bp: "Blood Pressure", pulse: "Pulse", temp: "Temperature",
    spo2: "SpO₂", rr: "Resp. Rate", weight: "Weight", height: "Height",
  };
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-lg p-3 text-center" style={{ background: "#0d1526", border: "1px solid #1a2740" }}>
          <p className="text-xs text-slate-500 mb-1">{labelMap[k] ?? k.replace(/_/g, " ")}</p>
          <p className="text-sm font-bold text-white">{String(v)}</p>
        </div>
      ))}
    </div>
  );
}

// Main page

export default function OutputPage() {
  const { jobId }               = useParams<{ jobId: string }>();
  const [job, setJob]           = useState<JobResponse | null>(null);
  const [extracted, setExtracted] = useState<JobExtractedResponse | null>(null);
  const [fhir, setFhir]         = useState<JobFhirResponse | null>(null);
  const [validation, setValidation] = useState<JobValidationResponse | null>(null);
  const [pageError, setPageError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!jobId) return;
    try {
      const [j, ext] = await Promise.all([getJob(jobId), getExtracted(jobId)]);
      setJob(j);
      setExtracted(ext);
      getFhir(jobId).then(setFhir).catch(() => {});
      getValidation(jobId).then(setValidation).catch(() => {});
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : "Failed to load output");
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  if (pageError) return (
    <div className="card p-6 text-red-300 rounded-xl" style={{ borderColor: "rgba(239,68,68,0.25)" }}>
      <p className="font-semibold mb-1">Error</p>
      <p className="text-sm">{pageError}</p>
      <Link to="/" className="btn-secondary mt-4 inline-block text-sm">← New Upload</Link>
    </div>
  );

  if (!job || !extracted) return (
    <div className="flex justify-center items-center h-64">
      <div className="spinner" style={{ width: "2rem", height: "2rem", borderWidth: "3px" }} />
    </div>
  );

  const d         = (extracted.extracted_data ?? {}) as Record<string, unknown>;
  const patient   = (d.patient as Record<string, unknown> | null) ?? {};
  const encounter = (d.encounter as Record<string, unknown> | null) ?? {};
  const docType   = job.document_type;
  const isValid   = validation?.is_valid;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* ── Hero header ── */}
      <div className="card rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Completed
              </span>
              {docType && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: "rgba(14,165,233,0.12)", color: "#38bdf8", border: "1px solid rgba(14,165,233,0.22)" }}>
                  {docType.replace(/_/g, " ")}
                </span>
              )}
              {validation && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  isValid
                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25"
                    : "text-red-400 bg-red-500/10 border border-red-500/20"
                }`}>
                  {isValid ? "FHIR Valid" : `${validation.errors.length} error${validation.errors.length !== 1 ? "s" : ""}`}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white">{job.filename}</h1>
            <p className="text-xs font-mono mt-1" style={{ color: "#2d4060" }}>{job.job_id}</p>
          </div>

          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {job.excel_export_path && (
              <a href={getExcelUrl(job.job_id)} download className="btn-secondary text-sm flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Excel
              </a>
            )}
            {fhir?.fhir_bundle && (
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(fhir.fhir_bundle, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${job.job_id}_fhir.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                FHIR JSON
              </button>
            )}
            <Link to={`/jobs/${jobId}/review`} className="btn-secondary text-sm">Edit Data</Link>
            <Link to="/history" className="btn-secondary text-sm">History</Link>
            <Link to="/" className="btn-primary text-sm">+ New Upload</Link>
          </div>
        </div>

        {/* Stats bar */}
        {validation && (
          <div className="mt-4 pt-4 flex flex-wrap gap-x-6 gap-y-2" style={{ borderTop: "1px solid #1a2740" }}>
            {[
              { label: "Resources", value: String(validation.resource_count), color: "text-white" },
              { label: "Errors", value: String(validation.errors.length), color: validation.errors.length > 0 ? "text-red-400" : "text-emerald-400" },
              { label: "Warnings", value: String(validation.warnings.length), color: validation.warnings.length > 0 ? "text-amber-400" : "text-slate-400" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{s.label}</span>
                <span className={`text-sm font-semibold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Patient + Encounter ── */}
      {docType === "discharge_summary" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionCard title="Patient" icon="👤">
            <InfoRow label="Name"          value={patient.name as string} />
            <InfoRow label="Gender"        value={patient.gender as string} />
            <InfoRow label="Date of Birth" value={patient.dob as string} />
            <InfoRow label="ID / UHID"     value={patient.id as string} />
            <InfoRow label="Address"       value={patient.address as string} />
          </SectionCard>
          <SectionCard title="Encounter" icon="🏥">
            <InfoRow label="Hospital"        value={encounter.hospital_name as string} />
            <InfoRow label="Department"      value={encounter.department as string} />
            <InfoRow label="Admission"       value={encounter.admission_date as string} />
            <InfoRow label="Discharge"       value={encounter.discharge_date as string} />
            <InfoRow label="Treating Doctor" value={d.treating_doctor as string} />
          </SectionCard>
        </div>
      )}

      {docType === "diagnostic_report" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionCard title="Patient" icon="👤">
            <InfoRow label="Name"   value={patient.name as string} />
            <InfoRow label="Gender" value={patient.gender as string} />
            <InfoRow label="Age"    value={patient.age as string} />
          </SectionCard>
          <SectionCard title="Report" icon="🔬">
            <InfoRow label="Category"      value={d.test_category as string} />
            <InfoRow label="Report Date"   value={d.report_date as string} />
            <InfoRow label="Laboratory"    value={(d.laboratory as Record<string,unknown>)?.name as string} />
            <InfoRow label="Referring Dr"  value={d.referring_doctor as string} />
          </SectionCard>
        </div>
      )}

      {/* ── Clinical sections — 2-column grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ListSection title="Diagnoses"        icon="📋" data={d.diagnoses} />
        <ListSection title="Procedures"       icon="⚕️"  data={d.procedures} />
        <ListSection title="Medications"      icon="💊" data={d.medications} />
        <ListSection title="Investigations"   icon="🧪" data={d.investigations} />
        <ListSection title="Observations"     icon="🔍" data={d.observations} />
        <ListSection title="Chief Complaints" icon="📝" data={d.chief_complaints} />

        {typeof d.vitals === "object" && d.vitals !== null &&
          Object.values(d.vitals as Record<string, unknown>).some(v => v != null && v !== "") && (
          <SectionCard title="Vital Signs" icon="❤️">
            <RenderVitals vitals={d.vitals as Record<string, unknown>} />
          </SectionCard>
        )}
      </div>

      {/* ── FHIR Validation issues ── */}
      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="card rounded-xl p-5"
             style={{ borderColor: validation.errors.length > 0 ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)" }}>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${validation.errors.length > 0 ? "bg-red-400" : "bg-amber-400"}`} />
            FHIR Validation Issues
            <span className="ml-auto text-xs text-slate-500">{validation.resource_count} resources</span>
          </h3>
          {validation.errors.map((e, i) => (
            <p key={i} className="text-xs text-red-300 rounded-lg px-3 py-2 mb-1.5"
               style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
              {e}
            </p>
          ))}
          {validation.warnings.slice(0, 5).map((w, i) => (
            <p key={i} className="text-xs text-amber-300 rounded-lg px-3 py-2 mb-1.5"
               style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
              {w}
            </p>
          ))}
          {validation.warnings.length > 5 && (
            <p className="text-xs text-slate-500 px-1">+{validation.warnings.length - 5} more warnings</p>
          )}
        </div>
      )}

      {/* ── FHIR JSON viewer ── */}
      {fhir?.fhir_bundle && (
        <CollapsibleJson data={fhir.fhir_bundle as Record<string, unknown>} />
      )}
    </div>
  );
}
