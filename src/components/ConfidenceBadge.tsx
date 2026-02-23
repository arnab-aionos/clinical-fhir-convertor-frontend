import type { ConfidenceDetail } from "../types/api";

interface Props {
  field: string;
  detail: ConfidenceDetail;
  compact?: boolean;
}

const COLOR_CLASSES: Record<string, string> = {
  green: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
  amber: "bg-amber-500/20 border-amber-500/30 text-amber-300",
  red:   "bg-red-500/20   border-red-500/30   text-red-300",
};

const DOT_CLASSES: Record<string, string> = {
  green: "bg-emerald-400",
  amber: "bg-amber-400",
  red:   "bg-red-400",
};

export default function ConfidenceBadge({ field, detail, compact = false }: Props) {
  const colorClass = COLOR_CLASSES[detail.color] ?? COLOR_CLASSES.amber;
  const dotClass   = DOT_CLASSES[detail.color]   ?? DOT_CLASSES.amber;
  const pct = Math.round(detail.score * 100);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${colorClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        {pct}%
      </span>
    );
  }

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${colorClass}`}>
      <span className="font-medium capitalize">{field.replace(/_/g, " ")}</span>
      <div className="flex items-center gap-2">
        {/* Mini progress bar */}
        <div className="w-16 h-1.5 rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${dotClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-semibold w-8 text-right">{pct}%</span>
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      </div>
    </div>
  );
}
