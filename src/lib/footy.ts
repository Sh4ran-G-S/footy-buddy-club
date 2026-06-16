export const DEFAULT_TEAM_NAMES = ["Tejas FC", "Arvinda FC", "Sankalp FC"] as const;

export function buildUpiLink(opts: {
  upiId: string;
  payeeName: string;
  amount: number;
  note?: string;
}) {
  const params = new URLSearchParams({
    pa: opts.upiId,
    pn: opts.payeeName,
    am: opts.amount.toFixed(2),
    cu: "INR",
  });
  if (opts.note) params.set("tn", opts.note);
  return `upi://pay?${params.toString()}`;
}

export function reliabilityTier(score: number): {
  label: string;
  tone: "success" | "warning" | "danger";
} {
  if (score >= 80) return { label: "Trusted", tone: "success" };
  if (score >= 50) return { label: "Warning", tone: "warning" };
  return { label: "Unreliable", tone: "danger" };
}

export function formatINR(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}