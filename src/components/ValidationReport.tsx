import type { JobValidationResponse } from "../types/api";

interface Props { data: JobValidationResponse }

export default function ValidationReport({ data }: Props) {
  return (
    <div>
      {/* Pass / Fail banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 ${
        data.is_valid
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          : "bg-red-500/10 border-red-500/30 text-red-300"
      }`}>
        <span className="text-2xl">{data.is_valid ? "✓" : "✗"}</span>
        <div>
          <p className="font-semibold">{data.is_valid ? "Validation Passed" : "Validation Failed"}</p>
          <p className="text-xs opacity-80">
            {data.resource_count} resources · {data.errors.length} errors · {data.warnings.length} warnings
          </p>
        </div>
      </div>

      {/* Errors */}
      {data.errors.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-red-400 mb-3 uppercase tracking-wider">
            Errors ({data.errors.length})
          </h3>
          <ul className="space-y-2">
            {data.errors.map((e, i) => (
              <li key={i} className="glass bg-red-500/5 border-red-500/20 p-3 rounded-lg text-sm text-red-300 flex gap-2">
                <span className="shrink-0 mt-0.5">✗</span>
                <span className="break-words">{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-amber-400 mb-3 uppercase tracking-wider">
            Warnings ({data.warnings.length})
          </h3>
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {data.warnings.map((w, i) => (
              <li key={i} className="glass bg-amber-500/5 border-amber-500/20 p-3 rounded-lg text-sm text-amber-300 flex gap-2">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span className="break-words">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.is_valid && data.warnings.length === 0 && (
        <p className="text-emerald-400 text-sm">All FHIR resources are structurally valid and NHCX-compliant.</p>
      )}
    </div>
  );
}
