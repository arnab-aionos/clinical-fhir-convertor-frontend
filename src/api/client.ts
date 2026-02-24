import type {
  JobExtractedResponse,
  JobFhirResponse,
  JobListItem,
  JobResponse,
  JobTextResponse,
  JobValidationResponse,
  UploadResponse,
} from "../types/api";

// CRA proxy in package.json forwards /api → http://localhost:8000
const BASE = "/api/v1";

async function _fetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {}
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// Upload
export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  return _fetch<UploadResponse>(`${BASE}/upload`, { method: "POST", body: form });
}

// Jobs
export const getJobs = () =>
  _fetch<JobListItem[]>(`${BASE}/jobs`);

export const getJob = (jobId: string) =>
  _fetch<JobResponse>(`${BASE}/jobs/${jobId}`);

export const getJobText = (jobId: string) =>
  _fetch<JobTextResponse>(`${BASE}/jobs/${jobId}/text`);

export const getExtracted = (jobId: string) =>
  _fetch<JobExtractedResponse>(`${BASE}/jobs/${jobId}/extracted`);

export const updateExtracted = (jobId: string, extracted_data: Record<string, unknown>) =>
  _fetch<JobExtractedResponse>(`${BASE}/jobs/${jobId}/extracted`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extracted_data }),
  });

export const generateFhir = (jobId: string) =>
  _fetch<JobFhirResponse>(`${BASE}/jobs/${jobId}/generate-fhir`, { method: "POST" });

export const getFhir = (jobId: string) =>
  _fetch<JobFhirResponse>(`${BASE}/jobs/${jobId}/fhir`);

export const getValidation = (jobId: string) =>
  _fetch<JobValidationResponse>(`${BASE}/jobs/${jobId}/validation`);

/** Returns the direct download URL for the Excel workbook — use as an <a href> */
export const getExcelUrl = (jobId: string) =>
  `${BASE}/jobs/${jobId}/excel`;

/** Permanently delete a job from the database. Returns void on 204, throws on error. */
export async function deleteJob(jobId: string): Promise<void> {
  const res = await fetch(`${BASE}/jobs/${jobId}`, { method: "DELETE" });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const body = await res.json(); detail = body.detail ?? detail; } catch {}
    throw new Error(detail);
  }
}
