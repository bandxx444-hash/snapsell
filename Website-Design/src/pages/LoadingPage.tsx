import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BarChart3, FileText, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import ProgressBar from "@/components/ProgressBar";
import { useScan } from "@/context/ScanContext";
import { generateListing } from "@/lib/api";

const phases = [
  { icon: Search, label: "Searching marketplace listings...", color: "hsl(262 75% 55%)" },
  { icon: BarChart3, label: "Grading item condition...", color: "hsl(262 65% 60%)" },
  { icon: FileText, label: "Building your valuation...", color: "hsl(43 75% 50%)" },
  { icon: CheckCircle, label: "Finalizing results...", color: "hsl(262 75% 48%)" },
];

const LoadingPage = () => {
  const navigate = useNavigate();
  const { diagnostics, files, setResult, setListing } = useScan();
  const [factIdx, setFactIdx] = useState(0);
  const [facts] = useState([
    "Items with original packaging sell for 15–30% more on average.",
    "Photos taken in natural light get significantly more views on eBay.",
    "The best time to end eBay auctions is Sunday evening between 8–10pm.",
    "Including measurements in clothing listings reduces returns by up to 40%.",
    "Free shipping listings attract up to 50% more buyers.",
    "The average American household has $4,500 worth of unused items.",
    "Buy It Now listings convert buyers 3× faster than auctions.",
    "Adding a video to your listing can increase sale price by up to 10%.",
  ]);
  const [phase, setPhase] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const doneRef = useRef(false);

  // Rotate facts every 3s
  useEffect(() => {
    const t = setInterval(() => setFactIdx(i => (i + 1) % facts.length), 3000);
    return () => clearInterval(t);
  }, [facts.length]);

  // Phase cycling — independent of API
  useEffect(() => {
    const durations = [2200, 2200, 2200, 800];
    if (phase < phases.length - 1) {
      const t = setTimeout(() => setPhase(p => p + 1), durations[phase]);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Asymptotic progress — always moves, never stalls
  // Slows as it approaches 92%, then waits for API to push to 100
  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (doneRef.current) return prev;
        // Easing: converges toward 92 but never reaches it autonomously
        const gap = 92 - prev;
        return prev + gap * 0.018;
      });
    }, 120);
    return () => clearInterval(interval);
  }, []);

  // Start API call immediately
  useEffect(() => {
    const run = async () => {
      try {
        const formData = new FormData();
        formData.append("diagnostics", JSON.stringify(diagnostics));
        files.forEach(f => formData.append("files", f));
        const res = await fetch("/api/analyze", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Analysis failed");
        const data = await res.json();
        const result = { ...data, scannedAt: new Date(data.scannedAt || Date.now()) };
        setResult(result);

        // Preload all eBay listing images NOW so they're cached before the user sees them
        (result.comparables || []).forEach((c: { imageUrl?: string }) => {
          if (c.imageUrl) {
            const img = new Image();
            img.src = `/api/image-proxy?url=${encodeURIComponent(c.imageUrl)}`;
          }
        });

        // Preload listing in background so ListingPage opens instantly
        if (result.recommendation === "sell") {
          generateListing(result).then(listing => setListing(listing)).catch(() => {});
        }

        // Smoothly animate to 100% then navigate
        doneRef.current = true;
        setScanProgress(100);
        setPhase(phases.length - 1);
        setTimeout(() => navigate("/listings-preview"), 600);
      } catch {
        doneRef.current = true;
        navigate("/listings-preview");
      }
    };
    run();
  }, []); // eslint-disable-line

  const PhaseIcon = phases[phase].icon;

  return (
    <div className="min-h-screen relative">
      <BackgroundOrbs />
      <Navbar />
      <main className="container mx-auto px-4 max-w-lg relative z-10 pt-20 pb-20 text-center font-sans">
        <ProgressBar percent={55} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-12"
        >
          {/* Orbital scan visualization */}
          <div className="relative w-52 h-52 mx-auto mb-12">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 208 208" style={{ animation: "orbitSpin 6s linear infinite" }}>
              <defs>
                <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(262 75% 55%)" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="hsl(43 75% 55%)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="hsl(262 75% 55%)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <circle cx="104" cy="104" r="100" fill="none" stroke="hsl(240 12% 88%)" strokeWidth="1" />
              <circle cx="104" cy="104" r="100" fill="none" stroke="url(#orbitGrad)" strokeWidth="2" strokeDasharray="80 548" strokeLinecap="round" />
              <circle cx="104" cy="4" r="4" fill="hsl(262 75% 55%)">
                <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
              </circle>
            </svg>

            <svg className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)]" viewBox="0 0 192 192" style={{ animation: "orbitSpin 8s linear infinite reverse" }}>
              <circle cx="96" cy="96" r="90" fill="none" stroke="hsl(43 75% 50% / 0.15)" strokeWidth="1" strokeDasharray="4 8" />
              <circle cx="96" cy="6" r="3" fill="hsl(43 75% 50% / 0.6)">
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="3s" repeatCount="indefinite" />
              </circle>
            </svg>

            <svg className="absolute inset-5 w-[calc(100%-40px)] h-[calc(100%-40px)] -rotate-90" viewBox="0 0 168 168">
              <circle cx="84" cy="84" r="78" fill="none" stroke="hsl(240 12% 90%)" strokeWidth="3" />
              <circle cx="84" cy="84" r="78" fill="none" stroke="url(#loadProgressGrad)" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${scanProgress * 4.9} 490`} style={{ transition: "stroke-dasharray 0.3s ease-out" }} />
              <defs>
                <linearGradient id="loadProgressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(262 75% 55%)" />
                  <stop offset="100%" stopColor="hsl(43 75% 50%)" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-10 rounded-full flex flex-col items-center justify-center"
              style={{ background: "hsl(240 20% 97%)" }}>
              <div className="absolute inset-0 rounded-full animate-ping opacity-[0.06]" style={{ background: "hsl(262 75% 55%)", animationDuration: "2.5s" }} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10"
                >
                  <PhaseIcon className="w-9 h-9 text-primary" />
                </motion.div>
              </AnimatePresence>
              <span className="text-xs font-bold text-primary mt-1 relative z-10">{Math.round(scanProgress)}%</span>
            </div>
          </div>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl md:text-3xl font-display font-bold mb-3"
          >
            Analyzing Resale Market
          </motion.h2>

          <AnimatePresence mode="wait">
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-primary font-medium mb-8 h-5"
            >
              {phases[phase].label}
            </motion.p>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-2 mb-10">
            {phases.map((_, i) => (
              <motion.div
                key={i}
                animate={{ width: i <= phase ? 32 : 12 }}
                className="h-1.5 rounded-full"
                style={{ background: i <= phase ? "linear-gradient(90deg, hsl(262 75% 55%), hsl(43 75% 50%))" : "hsl(240 12% 87%)" }}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card-glow text-left"
          >
            <span className="text-[11px] font-bold uppercase tracking-[2px] gradient-text mb-2 block">Did you know?</span>
            <AnimatePresence mode="wait">
              <motion.p
                key={factIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="text-sm text-body leading-relaxed"
              >
                {facts[factIdx]}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* Live Spec Sheet Reveal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card text-left mt-4"
          >
            <span className="text-[11px] font-bold uppercase tracking-[2px] gradient-text mb-3 block">Live Spec Sheet</span>
            <div className="space-y-0">
              {[
                { label: "Brand", value: diagnostics.brand || "Detecting…" },
                { label: "Item", value: diagnostics.productName || "Detecting…" },
                { label: "Year", value: diagnostics.yearOfPurchase ? String(diagnostics.yearOfPurchase) : "—" },
                { label: "Category", value: (diagnostics as any).itemCategory || "Detecting…" },
                { label: "Condition", value: (diagnostics as any).itemCondition || "Detecting…" },
              ].map((spec, i) => (
                <motion.div
                  key={spec.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 + i * 0.45, duration: 0.4, ease: "easeOut" }}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <span className="text-xs text-subtle font-medium">{spec.label}</span>
                  <span className="text-xs font-bold text-foreground">{spec.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default LoadingPage;
