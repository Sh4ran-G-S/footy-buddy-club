import QRCode from "react-qr-code";

export function QrInvite({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 flex flex-col items-center gap-2">
      <div className="rounded-lg bg-white p-3">
        <QRCode
          value={url}
          size={180}
          fgColor="#3B82F6"
          bgColor="#ffffff"
          level="M"
        />
      </div>
      <p className="text-xs text-muted-foreground">Scan to join this session</p>
    </div>
  );
}