import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getJobs, deleteJob } from "../api/client";
import type { JobListItem, JobStatus, PaginatedJobsResponse } from "../types/api";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
}

function primaryHref(job: JobListItem): string | null {
  if (job.status === "awaiting_verification") return `/jobs/${job.job_id}/review`;
  if (job.status === "completed") return `/jobs/${job.job_id}/output`;
  if (job.status === "pending" || job.status === "processing") return `/jobs/${job.job_id}`;
  return null;
}

// Status badge

const STATUS_BADGE: Record<JobStatus, { label: string; cls: string }> = {
  pending:               { label: "Queued",       cls: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  processing:            { label: "Processing",   cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  awaiting_verification: { label: "Needs Review", cls: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  completed:             { label: "Completed",    cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  failed:                { label: "Failed",       cls: "bg-red-500/20 text-red-300 border-red-500/30" },
};

function StatusBadge({ status }: { status: JobStatus }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// Action buttons

function ActionButtons({ job, onDelete }: { job: JobListItem; onDelete: (id: string) => void }) {
  const id = job.job_id;
  return (
    <div className="flex items-center justify-end gap-1.5">
      {job.status === "awaiting_verification" && (
        <Link to={`/jobs/${id}/review`} className="btn-primary text-xs px-3 py-1.5">
          Review →
        </Link>
      )}
      {job.status === "completed" && (
        <>
          <Link to={`/jobs/${id}/output`} className="btn-primary text-xs px-3 py-1.5">
            View
          </Link>
          <Link to={`/jobs/${id}/review`} className="btn-secondary text-xs px-3 py-1.5">
            Edit
          </Link>
        </>
      )}
      {job.status === "failed" && (
        <Link to="/" className="btn-secondary text-xs px-3 py-1.5">
          Retry
        </Link>
      )}
      {(job.status === "pending" || job.status === "processing") && (
        <Link to={`/jobs/${id}`} className="btn-secondary text-xs px-3 py-1.5">
          Progress
        </Link>
      )}
      <button
        onClick={() => onDelete(id)}
        className="btn-danger text-xs px-2.5 py-1.5"
        title="Delete job"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

// Tabs

type TabKey = "all" | "discharge_summary" | "diagnostic_report";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all",               label: "All" },
  { key: "discharge_summary", label: "Discharge Summary" },
  { key: "diagnostic_report", label: "Diagnostic Report" },
];

const EMPTY_MESSAGES: Record<TabKey, string> = {
  all:               "No extractions yet. Upload a clinical document to get started.",
  discharge_summary: "No discharge summary extractions found.",
  diagnostic_report: "No diagnostic report extractions found.",
};

// Pagination helper

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

// Main page

export default function HistoryPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedJobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (tab: TabKey, page: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: { page: number; page_size: number; document_type?: string } = {
        page,
        page_size: 10,
      };
      if (tab !== "all") params.document_type = tab;
      const result = await getJobs(params);
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load job history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load("all", 1); }, [load]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setCurrentPage(1);
    load(tab, 1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    load(activeTab, page);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await deleteJob(confirmDeleteId);
      // If the deleted item was the only one on the current page, go back one page
      const newPage =
        data && data.jobs.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(newPage);
      await load(activeTab, newPage);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const jobs = data?.jobs ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const startItem = total === 0 ? 0 : (currentPage - 1) * (data?.page_size ?? 10) + 1;
  const endItem = Math.min(currentPage * (data?.page_size ?? 10), total);

  return (
    <div>
      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="card rounded-2xl p-6 max-w-sm w-full border border-red-500/20">
            <h3 className="text-base font-bold text-white mb-2">Delete this job?</h3>
            <p className="text-slate-400 text-sm mb-6">
              This will permanently remove the job and all extracted data from the database. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary text-sm" disabled={deleting}>
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="btn-danger text-sm flex items-center gap-2">
                {deleting && <div className="spinner w-4 h-4" />}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Job History</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading ? "Loading…" : `${total} job${total !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => load(activeTab, currentPage)}
            disabled={loading}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <Link to="/" className="btn-primary text-sm">+ New Upload</Link>
        </div>
      </div>

      {error && (
        <div className="glass border border-red-500/30 bg-red-500/10 rounded-xl p-4 text-red-300 text-sm mb-4">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: "#1a2740" }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            disabled={loading}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "text-indigo-300 border-indigo-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && data != null && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>
                {total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass rounded-xl flex items-center justify-center h-40">
          <div className="spinner w-8 h-8 border-2" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-slate-400 text-lg mb-2">{EMPTY_MESSAGES[activeTab].split(".")[0]}.</p>
          {activeTab === "all" && (
            <Link to="/" className="btn-primary text-sm mt-4 inline-block">Upload Document</Link>
          )}
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-4 py-3 text-slate-400 font-medium">File</th>
                <th className="px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 text-slate-400 font-medium">Status</th>
                <th className="px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Submitted</th>
                <th className="px-4 py-3 text-slate-400 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, idx) => (
                <tr
                  key={job.job_id}
                  onClick={() => { const h = primaryHref(job); if (h) navigate(h); }}
                  className={`border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors ${
                    idx % 2 === 0 ? "" : "bg-white/[0.02]"
                  } ${primaryHref(job) ? "cursor-pointer" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-white truncate max-w-xs">{job.filename}</div>
                    <div className="text-xs font-mono text-slate-600 mt-0.5">{job.job_id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {job.document_type ? (
                      <span className="text-xs text-slate-400">{job.document_type.replace(/_/g, " ")}</span>
                    ) : (
                      <span className="text-xs text-slate-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
                    {job.status === "failed" && job.error_message && (
                      <p className="text-xs text-red-400/70 mt-1 truncate max-w-[160px]">{job.error_message}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                    {fmtDate(job.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <ActionButtons job={job} onDelete={setConfirmDeleteId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid #1a2740" }}>
              <span className="text-xs text-slate-500">
                Showing {startItem}–{endItem} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  ← Prev
                </button>
                {getPageNumbers(currentPage, totalPages).map((item, i) =>
                  item === "…" ? (
                    <span key={`e${i}`} className="px-1.5 text-slate-600 text-xs select-none">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => handlePageChange(item as number)}
                      disabled={loading}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                        currentPage === item
                          ? "text-sky-400 border border-sky-500/30"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                      style={currentPage === item ? { background: "rgba(14,165,233,0.12)" } : {}}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
