import { useState } from "react";
import type { JobFhirResponse } from "../types/api";

interface Props {
  data: JobFhirResponse;
}

export default function FhirBundleViewer({ data }: Props) {
  const [copied, setCopied] = useState(false);
  const bundle = data.fhir_bundle;
  if (!bundle) return <p className="text-slate-500">No FHIR bundle generated yet.</p>;

  const entries = (bundle.entry as unknown[]) ?? [];
  const resourceCounts: Record<string, number> = {};
  entries.forEach((e: unknown) => {
    const rt = (e as Record<string, Record<string,string>>).resource?.resourceType ?? "?";
    resourceCounts[rt] = (resourceCounts[rt] ?? 0) + 1;
  });

  const jsonStr = JSON.stringify(bundle, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `fhir-bundle-${data.job_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium">
          {(bundle.type as string)?.toUpperCase()} BUNDLE
        </span>
        {Object.entries(resourceCounts).map(([rt, count]) => (
          <span key={rt} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs">
            {count}× {rt}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-4">
        <button onClick={handleCopy} className="btn-secondary text-sm">
          {copied ? "✓ Copied!" : "Copy JSON"}
        </button>
        <button onClick={handleDownload} className="btn-primary text-sm">
          ↓ Download Bundle
        </button>
      </div>

      {/* JSON preview */}
      <pre className="json-block">{jsonStr.slice(0, 8000)}{jsonStr.length > 8000 ? "\n\n… (truncated for display)" : ""}</pre>
    </div>
  );
}
