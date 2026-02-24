# clinical-fhir-convertor-frontend

React frontend for IntelliCliniq — Clinical FHIR Convertor. Provides a browser interface for the full PDF-to-FHIR pipeline: file upload, job status tracking, extracted data review, and FHIR bundle inspection.

Built for **NHCX Hackathon Problem Statement 2** — Clinical Documents to FHIR Structured Data Convertor.

---

## Features

- Drag-and-drop (and click-to-browse) file upload for PDF, JPEG, and PNG files
- Real-time job status polling with progress indicator (pending → processing → awaiting\_verification → completed)
- Extracted data viewer with per-field-group confidence labels (green / amber / red)
- Editable review form: correct LLM extraction errors before FHIR generation
- FHIR bundle trigger (POST /generate-fhir) from the review page
- Output page: patient/encounter summary, clinical sections in 2-column grid, FHIR validation report, collapsible raw JSON viewer
- Excel workbook download link (Stage 2.5 cross-verification workbook)
- Job history: paginated 20 per page, sortable by date, delete with confirmation

---

## Tech Stack

| Component | Library / Version |
|-----------|-------------------|
| UI framework | React 18.3.1 |
| Language | TypeScript 5.4.5 |
| Build tool | Vite 5.4.11 |
| Routing | react-router-dom 6.22.3 |
| File upload | react-dropzone 14.2.10 |
| Styling | Tailwind CSS 3.4.3 |

---

## Application Flow

```
UploadPage (/)
  │  user drops or selects a PDF/image
  │  POST /api/v1/upload → job_id
  ▼
JobPage (/jobs/:jobId)
  │  polls GET /jobs/:jobId every 3 seconds
  │  status: pending → processing → awaiting_verification
  ▼
ReviewPage (/jobs/:jobId/review)
  │  displays extracted data + confidence scores
  │  user may correct fields → PUT /extracted
  │  user clicks "Generate FHIR" → POST /generate-fhir
  │  status → completed
  ▼
OutputPage (/jobs/:jobId/output)
     patient, encounter, diagnoses, vitals, medications, etc.
     FHIR validation report (errors + warnings)
     collapsible FHIR R4 Bundle JSON viewer
     Excel workbook download

HistoryPage (/history)
     list of all jobs, paginated, sortable, deletable
```

---

## Prerequisites

- Node.js 18 or 20
- npm 9 or later
- The backend API must be running on `http://localhost:8000` before starting the frontend dev server

---

## Installation and Running

```bash
cd clinical-fhir-convertor-frontend
npm install
npm run dev        # starts Vite dev server on http://localhost:3000
```

All API calls use relative URLs (`/api/v1/...`). The Vite dev server proxies these to `http://localhost:8000` automatically — no CORS configuration required during development.

---

## Environment Configuration

No `.env` file is required for local development. The API base URL is resolved through the Vite dev server proxy.

Proxy configuration in `vite.config.ts`:

```ts
server: {
  port: 3000,
  proxy: {
    "/api": {
      target: "http://localhost:8000",
      changeOrigin: true,
    },
  },
},
```

To point at a different backend (for example, a staging server), update the `target` value in `vite.config.ts`.

---

## Project Structure

```
clinical-fhir-convertor-frontend/
├── public/
│   └── index.html
├── src/
│   ├── api/
│   │   └── client.ts           # typed fetch wrappers for all backend endpoints
│   ├── components/
│   │   ├── Navbar.tsx           # top navigation bar with page links
│   │   └── UploadZone.tsx       # react-dropzone wrapper with drag-and-drop UI
│   ├── pages/
│   │   ├── UploadPage.tsx       # / — file selection and upload
│   │   ├── JobPage.tsx          # /jobs/:jobId — status polling and redirect
│   │   ├── ReviewPage.tsx       # /jobs/:jobId/review — data editing + FHIR trigger
│   │   ├── OutputPage.tsx       # /jobs/:jobId/output — results and FHIR viewer
│   │   └── HistoryPage.tsx      # /history — all jobs, paginated
│   ├── types/
│   │   └── api.ts               # TypeScript types for all API response shapes
│   ├── App.tsx                  # BrowserRouter, route definitions
│   ├── index.css                # Tailwind base + custom design system classes
│   └── main.tsx                 # React DOM render entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Pages and Components Reference

### Pages

| Page | Route | Key responsibilities |
|------|-------|----------------------|
| UploadPage | `/` | File drag-and-drop using react-dropzone; validates type (PDF/JPG/PNG) and size; calls POST /upload; redirects to JobPage on success |
| JobPage | `/jobs/:jobId` | Polls GET /jobs/:jobId every 3 seconds; shows spinner with status label; auto-redirects to ReviewPage on awaiting\_verification; shows error state on failed |
| ReviewPage | `/jobs/:jobId/review` | Loads extracted data with confidence labels; renders editable form fields; PUT /extracted on save; POST /generate-fhir to trigger Stage 3; redirects to OutputPage on completed |
| OutputPage | `/jobs/:jobId/output` | Displays patient/encounter summary, 2-column clinical section grid (diagnoses, medications, vitals, etc.); FHIR validation issues panel; collapsible raw JSON viewer; Excel download link |
| HistoryPage | `/history` | Lists all jobs (GET /jobs); paginated 20 per page with page number pills; sort by date; delete with confirmation dialog (DELETE /jobs/:id) |

### Shared Components

| Component | File | Description |
|-----------|------|-------------|
| Navbar | `components/Navbar.tsx` | Fixed top navigation bar; IntelliCliniq wordmark; links to Upload (`/`) and History (`/history`) |
| UploadZone | `components/UploadZone.tsx` | Encapsulates react-dropzone with accept config, active/reject visual states, and file info display |

---

## Backend Dependency

This frontend is a pure UI layer with no server-side rendering. Every data operation goes through the backend REST API:

| Frontend action | Backend call |
|-----------------|--------------|
| Upload file | POST /api/v1/upload |
| Poll job status | GET /api/v1/jobs/:jobId |
| View extracted data | GET /api/v1/jobs/:jobId/extracted |
| Save corrections | PUT /api/v1/jobs/:jobId/extracted |
| Generate FHIR | POST /api/v1/jobs/:jobId/generate-fhir |
| View FHIR bundle | GET /api/v1/jobs/:jobId/fhir |
| View validation | GET /api/v1/jobs/:jobId/validation |
| Download Excel | GET /api/v1/jobs/:jobId/excel |
| Job list | GET /api/v1/jobs |
| Delete job | DELETE /api/v1/jobs/:jobId |

The backend must be running and reachable at the proxy target before the frontend can function.

---

## Build for Production

```bash
npm run build
```

This runs `tsc && vite build` and outputs static assets to `dist/`. The build fails on any TypeScript type errors.

### nginx Configuration

The frontend is a single-page application. All routes must fall back to `index.html` to allow client-side routing:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/clinical-fhir-convertor-frontend/dist;
    index index.html;

    # Proxy API calls to the FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA fallback — serve index.html for all non-asset routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

In production, the Vite dev proxy is not available. The nginx `/api/` block above replaces it.

---

## Troubleshooting

**Blank page after `npm run dev`**
Check the browser console for JavaScript errors. Confirm the backend is running on `http://localhost:8000` and that the Vite dev server is proxying `/api` (check the terminal output for `Local: http://localhost:3000`).

**`EADDRINUSE: address already in use :::3000`**
Another process is using port 3000. Stop it or change `server.port` in `vite.config.ts`.

**API calls return 404 or a network error**
The backend is not running or is on a different port. Start the backend with `uvicorn main:app --reload --host 0.0.0.0 --port 8000` from `clinical-fhir-convertor/` with the venv activated.

**`npm install` fails with peer dependency errors**
This project requires Node 18+. It was migrated from Create React App (CRA) to Vite because CRA's dependency chain conflicts with TypeScript 5. Run `node --version` to confirm the version. If the error persists, delete `node_modules/` and `package-lock.json` and re-run `npm install`.

**ReviewPage form fields show all as empty**
The job's `extracted_data` field is null — the LLM extraction step failed or was skipped. Check the backend logs for the job ID. The job status may be `failed`.

**Excel download returns 404**
The Excel workbook is generated during Stage 2 (LLM extraction) and is available once the job reaches `awaiting_verification`. If the job status is `failed`, no Excel is generated.
