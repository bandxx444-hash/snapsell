import { X } from "lucide-react";

export function ScanVisionOverlay({ imageUrl, onRemove }: { imageUrl: string; onRemove?: () => void }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-border relative" style={{ background: "hsl(40 30% 97%)" }}>
      <div className="relative flex items-center justify-center" style={{ minHeight: 200 }}>
        <img
          src={imageUrl}
          alt="Device preview"
          className="w-full object-contain"
          style={{ maxHeight: 340 }}
        />
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
