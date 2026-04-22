import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Image, Video, ArrowLeft, Check, Camera, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import ProgressBar from "@/components/ProgressBar";
import { ScanVisionOverlay } from "@/components/ScanVisionOverlay";
import { useScan } from "@/context/ScanContext";

const UploadPage = () => {
  const navigate = useNavigate();
  const { files, setFiles, setDiagnostics } = useScan();
  const [tab, setTab] = useState<"photos" | "video">("photos");
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [bestIdx, setBestIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [extractingFrames, setExtractingFrames] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<{ name: string; confidence: number } | null>(null);
  const [scanPhase, setScanPhase] = useState(0);
  const scanPhases = ["Preprocessing image…", "Detecting item type…", "Identifying item…", "Calculating confidence…"];

  // Score an image file by sharpness — returns higher for sharper, well-exposed images
  const scoreImage = (file: File): Promise<number> =>
    new Promise((resolve) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 400 / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = img.naturalWidth * scale;
        canvas.height = img.naturalHeight * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let lumSum = 0, edgeSum = 0, count = 0;
        for (let i = 0; i < data.length - 4; i += 16) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const lumR = 0.299 * data[i + 4] + 0.587 * data[i + 5] + 0.114 * data[i + 6];
          lumSum += lum; edgeSum += (lum - lumR) ** 2; count++;
        }
        const brightness = lumSum / count;
        const brightnessOk = brightness > 40 && brightness < 215 ? 1 : 0.1;
        URL.revokeObjectURL(img.src);
        resolve((edgeSum / count) * brightnessOk);
      };
      img.onerror = () => resolve(0);
      img.src = URL.createObjectURL(file);
    });

  const pickBestImage = useCallback(async (newFiles: File[]) => {
    if (newFiles.length <= 1) { setBestIdx(0); return; }
    const scores = await Promise.all(newFiles.map(scoreImage));
    setBestIdx(scores.indexOf(Math.max(...scores)));
  }, []);

  const handlePhotoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    const merged = [...files, ...dropped];
    setFiles(merged);
    pickBestImage(merged);
  }, [files, setFiles, pickBestImage]);

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const merged = [...files, ...Array.from(e.target.files)];
      setFiles(merged);
      pickBestImage(merged);
    }
  }, [files, setFiles, pickBestImage]);

  const extractVideoFrames = (file: File): Promise<File[]> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      const src = URL.createObjectURL(file);
      video.src = src;
      video.muted = true;
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        const duration = video.duration;
        const W = video.videoWidth;
        const H = video.videoHeight;

        // Sample 20 candidates evenly spread across the video
        const CANDIDATES = 20;
        const timestamps = Array.from({ length: CANDIDATES }, (_, i) =>
          ((i + 0.5) / CANDIDATES) * duration
        );

        type ScoredFrame = { ts: number; score: number; blob: Blob };
        const scored: ScoredFrame[] = [];

        // Score a frame by sharpness (Laplacian proxy) and brightness quality
        const scoreFrame = (ctx: CanvasRenderingContext2D): number => {
          const { data } = ctx.getImageData(0, 0, W, H);
          let lumSum = 0, edgeSum = 0, count = 0;
          for (let i = 0; i < data.length - 4; i += 16) {
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const lumR = 0.299 * data[i + 4] + 0.587 * data[i + 5] + 0.114 * data[i + 6];
            lumSum += lum;
            edgeSum += (lum - lumR) ** 2;
            count++;
          }
          const brightness = lumSum / count;
          // Penalise too dark (<40) or too bright (>215)
          const brightnessScore = brightness > 40 && brightness < 215 ? 1 : 0.1;
          return (edgeSum / count) * brightnessScore;
        };

        // Process timestamps sequentially to avoid seek race conditions
        const processNext = (i: number) => {
          if (i >= timestamps.length) {
            URL.revokeObjectURL(src);

            // Sort by quality score, then greedily pick 5-8 diverse frames
            scored.sort((a, b) => b.score - a.score);
            const TARGET = Math.min(8, Math.max(5, scored.length));
            const minGap = duration * 0.05;
            const picked: ScoredFrame[] = [];

            for (const f of scored) {
              if (picked.length >= TARGET) break;
              const tooClose = picked.some(p => Math.abs(p.ts - f.ts) < minGap);
              if (!tooClose) picked.push(f);
            }
            // Fill up to 5 if diversity filter was too strict
            for (const f of scored) {
              if (picked.length >= 5) break;
              if (!picked.includes(f)) picked.push(f);
            }

            // Return in chronological order
            picked.sort((a, b) => a.ts - b.ts);
            resolve(picked.map((f, idx) => new File([f.blob], `frame_${idx}.jpg`, { type: "image/jpeg" })));
            return;
          }

          video.currentTime = timestamps[i];
          video.onseeked = () => {
            const canvas = document.createElement("canvas");
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(video, 0, 0);
            const score = scoreFrame(ctx);
            canvas.toBlob((blob) => {
              if (blob) scored.push({ ts: timestamps[i], score, blob });
              processNext(i + 1);
            }, "image/jpeg", 0.88);
          };
        };

        processNext(0);
      };

      video.onerror = () => resolve([]);
    });
  };

  const handleVideoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setExtractingFrames(true);
      const frames = await extractVideoFrames(file);
      setExtractingFrames(false);
      setFiles(frames.length > 0 ? frames : [file]);
    }
  }, [setFiles]);

  const handleContinue = async () => {
    setLoading(true);
    setError(null);
    setScanPhase(0);
    // Cycle through scan phases while waiting
    const phaseInterval = setInterval(() => {
      setScanPhase(p => Math.min(p + 1, scanPhases.length - 1));
    }, 700);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append("files", f));
      const apiBase = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiBase}/api/identify`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Identification failed");
      const diag = await res.json();
      clearInterval(phaseInterval);
      setScanPhase(scanPhases.length - 1);
      const confidencePct = diag.overallConfidence ?? 75;
      setDetected({ name: diag.productName || diag.brand || "Your Item", confidence: confidencePct });
      setDiagnostics(diag);
      // Show detection result briefly, then navigate
      setTimeout(() => navigate("/diagnostics"), 1600);
    } catch {
      clearInterval(phaseInterval);
      setError("Could not identify your item. Please try again.");
      setLoading(false);
    }
  };

  const hasMedia = tab === "photos" ? files.length > 0 : !!videoFile;
  const mediaCount = tab === "photos" ? files.length : (videoFile ? 1 : 0);

  return (
    <div className="min-h-screen relative">
      <BackgroundOrbs />
      <Navbar />
      <main className="container mx-auto px-4 max-w-2xl relative z-10 pt-8 pb-20 font-sans">
        <ProgressBar percent={10} />

        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-subtle mt-6 mb-4 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <span className="text-[11px] font-bold uppercase tracking-[2px] text-primary mb-3 block font-sans">Step 1 of 4</span>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 gradient-border"
            style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.1), hsl(38 95% 52% / 0.05))" }}>
            <Camera className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-[36px] font-display font-bold mb-2">Upload Your Item</h2>
          <p className="text-subtle text-sm max-w-md mx-auto">Show us your item from multiple angles for the most accurate valuation.</p>
        </motion.div>

        {/* ── Loading state — shown instead of upload zone ── */}
        {loading && (
          <motion.div
            key="loading-state"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            {detected ? (
              /* Detection result */
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="rounded-2xl border border-primary/25 px-8 py-8 mx-auto max-w-sm"
                style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.07), hsl(38 95% 52% / 0.04))" }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "linear-gradient(135deg, hsl(262 75% 55%), hsl(262 75% 42%))" }}>
                  <Check className="w-6 h-6 text-white" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[3px] text-primary mb-2">Item Detected</p>
                <p className="text-xl font-display font-bold text-foreground mb-4">{detected.name}</p>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 rounded-full overflow-hidden flex-1" style={{ background: "hsl(240 12% 88%)" }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, hsl(262 75% 55%), hsl(43 75% 50%))" }}
                      initial={{ width: 0 }} animate={{ width: `${detected.confidence}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }} />
                  </div>
                  <span className="text-sm font-bold gradient-text shrink-0">{detected.confidence}% match</span>
                </div>
              </motion.div>
            ) : (
              /* Scanning phases */
              <div className="mx-auto max-w-xs">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 flex items-center justify-center mx-auto mb-6 relative">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: "hsl(262 75% 55%)" }} />
                </div>
                <motion.p
                  key={scanPhase}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="text-sm font-semibold text-foreground mb-4"
                >
                  {scanPhases[scanPhase]}
                </motion.p>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "hsl(240 12% 88%)" }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, hsl(262 75% 55%), hsl(43 75% 50%))" }}
                    animate={{ width: `${Math.round(((scanPhase + 1) / scanPhases.length) * 85)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }} />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Tabs + Upload zone — hidden while loading */}
        {!loading && <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-1 rounded-xl p-1 mb-6 max-w-xs mx-auto"
          style={{ background: "hsl(240 18% 93%)" }}
        >
          {(["photos", "video"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t ? "text-foreground" : "text-subtle hover:text-foreground"
              }`}
            >
              {tab === t && (
                <motion.div layoutId="uploadTab" className="absolute inset-0 bg-secondary rounded-lg shadow-sm -z-10" />
              )}
              {t === "photos" ? <Image className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              {t === "photos" ? "Photos" : "Video"}
            </button>
          ))}
        </motion.div>

        {/* Upload zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {tab === "photos" ? (
            <div>
              <div
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                  isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/40"
                }`}
                style={{ background: isDragging ? undefined : "hsl(240 20% 97%)" }}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handlePhotoDrop}
                onClick={() => fileRef.current?.click()}
              >
                <motion.div
                  animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 gradient-border"
                  style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.1), hsl(38 95% 52% / 0.05))" }}
                >
                  <Upload className="w-7 h-7 text-primary" />
                </motion.div>
                <p className="text-sm font-semibold text-foreground mb-1">Drop photos here or click to browse</p>
                <p className="text-xs text-faintest">JPG, PNG, WEBP · Multiple files accepted</p>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
              </div>
              {files.length > 0 && (
                <div className="mt-4 space-y-3">
                  {/* First image: AI Vision scan overlay */}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <ScanVisionOverlay
                      imageUrl={URL.createObjectURL(files[bestIdx])}
                      onRemove={() => {
                        const next = files.filter((_, i) => i !== bestIdx);
                        setFiles(next);
                        pickBestImage(next);
                      }}
                    />
                  </motion.div>
                  {/* Other images: small thumbnails, click to promote to main */}
                  {files.length > 1 && (
                    <div className="grid grid-cols-5 gap-2">
                      {files.map((f, i) => i === bestIdx ? null : (
                        <motion.div key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => setBestIdx(i)}
                          className="aspect-square rounded-xl overflow-hidden border border-border shadow-sm cursor-pointer hover:border-primary/50 transition-colors">
                          <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div
                className="border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:border-primary/40 transition-all duration-300"
                style={{ background: "hsl(240 20% 97%)" }}
                onClick={() => videoRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 gradient-border"
                  style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.1), hsl(38 95% 52% / 0.05))" }}
                >
                  <Video className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Drop a video or click to browse</p>
                <p className="text-xs text-faintest">MP4, MOV, AVI · Single file</p>
                <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
              </div>
              {extractingFrames && (
                <div className="mt-4 flex items-center gap-2 text-sm text-primary font-medium px-1">
                  <Loader2 className="w-4 h-4 animate-spin" /> Extracting frames…
                </div>
              )}
              {videoFile && !extractingFrames && (
                <div className="mt-4 rounded-xl overflow-hidden border border-border">
                  <video src={URL.createObjectURL(videoFile)} controls className="w-full max-h-64 object-contain" />
                </div>
              )}
            </div>
          )}
        </motion.div>
        </>}

        {error && !loading && (
          <div className="mt-4 rounded-xl px-4 py-3 text-sm text-destructive border border-destructive/20 bg-destructive/5">
            {error}
          </div>
        )}

        {hasMedia && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 gradient-border"
              style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.08), hsl(38 95% 52% / 0.04))" }}>
              <Check className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {mediaCount} {tab === "photos" ? "image(s)" : "video"} ready · AI will auto-identify your item
              </span>
            </div>
            <button onClick={handleContinue}
              className="w-full py-3.5 rounded-xl font-bold text-[15px] text-primary-foreground shadow-cta transition-all duration-300 hover:-translate-y-0.5 gradient-btn relative overflow-hidden flex items-center justify-center gap-2">
              <span className="relative z-10">Continue — AI will auto-fill details →</span>
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default UploadPage;
