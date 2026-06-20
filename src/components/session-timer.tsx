import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer, Square, RotateCcw, Play } from "lucide-react";

const OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90];

function fmt(sec: number) {
  const m = Math.floor(Math.abs(sec) / 60);
  const s = Math.abs(sec) % 60;
  return `${sec < 0 ? "-" : ""}${m}:${s.toString().padStart(2, "0")}`;
}

export function SessionTimer({ sessionId }: { sessionId: string }) {
  const storeKey = `footy.timer.${sessionId}`;
  const [duration, setDuration] = useState(30); // minutes
  const [endsAt, setEndsAt] = useState<number | null>(null); // ms timestamp; null = stopped
  const [remaining, setRemaining] = useState(30 * 60);
  const raf = useRef<number | null>(null);

  // hydrate
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const v = JSON.parse(raw) as { duration: number; endsAt: number | null };
        setDuration(v.duration);
        setEndsAt(v.endsAt);
        if (!v.endsAt) setRemaining(v.duration * 60);
      }
    } catch { /* ignore */ }
  }, [storeKey]);

  // persist
  useEffect(() => {
    localStorage.setItem(storeKey, JSON.stringify({ duration, endsAt }));
  }, [storeKey, duration, endsAt]);

  // tick
  useEffect(() => {
    if (endsAt == null) return;
    const tick = () => {
      setRemaining(Math.round((endsAt - Date.now()) / 1000));
      raf.current = window.setTimeout(tick, 500) as unknown as number;
    };
    tick();
    return () => { if (raf.current) clearTimeout(raf.current); };
  }, [endsAt]);

  const start = () => setEndsAt(Date.now() + duration * 60 * 1000);
  const stop = () => {
    if (endsAt != null) {
      setRemaining(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    }
    setEndsAt(null);
  };
  const reset = () => { setEndsAt(null); setRemaining(duration * 60); };

  const running = endsAt != null;
  const over = running && remaining <= 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Timer className="size-4" /> Match timer
        </div>
        <Select
          value={String(duration)}
          onValueChange={(v) => { const d = Number(v); setDuration(d); if (!running) setRemaining(d * 60); }}
          disabled={running}
        >
          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {OPTIONS.map((m) => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className={`text-center text-4xl font-bold tabular-nums ${over ? "text-danger" : "text-foreground"}`}>
        {fmt(running ? remaining : duration * 60)}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {running ? (
          <Button size="sm" variant="secondary" onClick={stop} className="gap-1.5"><Square className="size-4" /> Stop</Button>
        ) : (
          <Button size="sm" onClick={start} className="gap-1.5"><Play className="size-4" /> Start</Button>
        )}
        <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5 col-span-2"><RotateCcw className="size-4" /> Reset</Button>
      </div>
    </div>
  );
}
