import { reliabilityTier } from "@/lib/footy";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function ReliabilityBadge({ score, showScore = true }: { score: number; showScore?: boolean }) {
  const t = reliabilityTier(score);
  const tone =
    t.tone === "success"
      ? "bg-success/15 text-success ring-success/30"
      : t.tone === "warning"
        ? "bg-warning/15 text-warning ring-warning/30"
        : "bg-danger/15 text-danger ring-danger/30";
  return (
    <motion.span 
      whileHover={{ scale: 1.05 }}
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 shadow-sm transition-shadow hover:shadow-md cursor-default", tone)}
    >
      <motion.span 
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="size-1.5 rounded-full bg-current" 
      />
      {t.label}
      {showScore && <span className="opacity-70">· {score}</span>}
    </motion.span>
  );
}