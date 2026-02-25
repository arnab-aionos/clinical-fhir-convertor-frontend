// Enums
export type JobStatus =
  | "pending"
  | "processing"
  | "awaiting_verification"
  | "completed"
  | "failed";

export type DocumentType = "discharge_summary" | "diagnostic_report" | "unknown";

// Confidence
export interface ConfidenceDetail {
  score: number;           // 0.0 – 1.0
  label: "high" | "medium" | "low";
  color: "green" | "amber" | "red";
}

// Job responses
export interface JobResponse {
  job_id: string;
  status: JobStatus;
  filename: string;
  document_type: DocumentType | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  excel_export_path: string | null;
}

export interface JobTextResponse {
  job_id: string;
  status: JobStatus;
  raw_text: string | null;
  ocr_method: "direct" | "surya_ocr" | null;
  page_count: number | null;
}

export interface JobExtractedResponse {
  job_id: string;
  status: JobStatus;
  document_type: DocumentType | null;
  extracted_data: Record<string, unknown> | null;
  confidence: Record<string, ConfidenceDetail> | null;
}

export interface JobFhirResponse {
  job_id: string;
  fhir_bundle: Record<string, unknown> | null;
}

export interface JobValidationResponse {
  job_id: string;
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  resource_count: number;
}

// Upload response (same shape as JobResponse, returned immediately as 202)
export type UploadResponse = JobResponse;

// Job list item (for history page)
export type JobListItem = JobResponse;

// Paginated jobs list (returned by GET /api/v1/jobs)
export interface PaginatedJobsResponse {
  jobs: JobListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
