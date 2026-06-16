import { reliabilityTier } from "@/lib/footy";
import { cn } from "@/lib/utils";

export function ReliabilityBadge({ score, showScore = true }: { score: number; showScore?: boolean }) {
  const t = reliabilityTier(score);
  const tone =
    t.tone === "success"
      ? "bg-success/15 text-success ring-success/30"
      : t.tone === "warning"
        ? "bg-warning/15 text-warning ring-warning/30"
        : "bg-danger/15 text-danger ring-danger/30";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", tone)}>
      <span className="size-1.5 rounded-full bg-current" />
      {t.label}
      {showScore && <span className="opacity-70">· {score}</span>}
    </span>
  );
}