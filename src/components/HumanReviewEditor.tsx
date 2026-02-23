import { useState } from "react";
import { updateExtracted } from "../api/client";
import type { JobExtractedResponse } from "../types/api";

interface Props {
  jobId: string;
  data: JobExtractedResponse;
  onSaved: (updated: JobExtractedResponse) => void;
}

export default function HumanReviewEditor({ jobId, data, onSaved }: Props) {
  const raw = data.extracted_data ?? {};
  // Edit as raw JSON string for maximum flexibility
  const [json, setJson] = useState(() => JSON.stringify(raw, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setError(null);
    // Validate JSON
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError("Invalid JSON — please fix the syntax before saving.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateExtracted(jobId, parsed);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSaved(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Edit Extracted Data</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Correct any OCR or extraction errors, then click Save. FHIR will be regenerated.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setJson(JSON.stringify(raw, null, 2))}
            className="btn-secondary text-xs"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-xs flex items-center gap-2"
          >
            {saving && <div className="spinner w-3 h-3" />}
            {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          {error}
        </div>
      )}

      <textarea
        value={json}
        onChange={e => { setJson(e.target.value); setSaved(false); }}
        className="w-full h-96 font-mono text-xs bg-black/30 border border-white/10 rounded-xl
                   p-4 text-emerald-300 resize-y focus:outline-none focus:ring-2
                   focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
        spellCheck={false}
      />

      <p className="text-xs text-slate-600 mt-2">
        Tip: The <code className="text-slate-400">_confidence</code> key is read-only metadata — changes to it are ignored.
      </p>
    </div>
  );
}
