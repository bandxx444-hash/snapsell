import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import ProgressBar from "@/components/ProgressBar";
import { useScan } from "@/context/ScanContext";

const conditionColor = (c: string) => {
  if (c.includes("Like New") || c.includes("Very Good")) return "bg-primary/15 text-primary";
  if (c.includes("Good")) return "bg-primary/10 text-primary-light";
  if (c.includes("Acceptable")) return "bg-accent/15 text-accent";
  return "bg-secondary text-subtle";
};

// Deterministic match score per listing index
const matchScore = (idx: number) => [97, 94, 91, 88, 85][Math.min(idx, 4)];

const ListingsPreviewPage = () => {
  const navigate = useNavigate();
  const { result } = useScan();
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(0);
  if (!result) { navigate("/"); return null; }

  // Preload all proxy images so they're cached before the user swipes
  useEffect(() => {
    result.comparables.forEach((c) => {
      if (c.imageUrl) {
        const img = new Image();
        img.src = `/api/image-proxy?url=${encodeURIComponent(c.imageUrl)}`;
      }
    });
  }, [result.comparables]);

  const listing = result.comparables[idx];
  const total = result.comparables.length;

  const paginate = (newDirection: number) => {
    const newIdx = idx + newDirection;
    if (newIdx >= 0 && newIdx < total) {
      setDirection(newDirection);
      setIdx(newIdx);
    }
  };

  return (
    <div className="min-h-screen relative">
      <BackgroundOrbs />
      <Navbar />
      <main className="container mx-auto px-4 max-w-2xl relative z-10 pt-8 pb-20 font-sans">
        <ProgressBar percent={65} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-8 mb-8"
        >
          <p className="text-sm text-subtle mb-1">Estimated Value Range</p>
          <h2 className="text-3xl font-display font-bold">
            <span className="gradient-text">${result.valueLow}–${result.valueHigh}</span>{" "}
            <span className="text-lg text-foreground">· Est. ${result.estimatedValue}</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card-glow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-bold">Comparable eBay Listings</h3>
            <span className="text-xs text-subtle font-medium px-2 py-1 rounded-lg bg-secondary">{idx + 1} / {total}</span>
          </div>

          <div className="rounded-xl border border-border h-48 flex items-center justify-center mb-4 relative overflow-hidden"
            style={{ background: "hsl(240 20% 97%)" }}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={idx}
                custom={direction}
                initial={{ x: direction > 0 ? 100 : -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction > 0 ? -100 : 100, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="w-full h-full flex items-center justify-center"
              >
                {listing.imageUrl ? (
                  <a href={listing.ebayUrl} target="_blank" rel="noopener noreferrer"
                    className="w-full h-full flex items-center justify-center group relative">
                    <img src={`/api/image-proxy?url=${encodeURIComponent(listing.imageUrl)}`} alt={listing.title} className="max-h-full object-contain transition-opacity group-hover:opacity-80" />
                    <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-white/90 text-primary text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow">
                        <ExternalLink className="w-3 h-3" /> View on eBay
                      </span>
                    </div>
                  </a>
                ) : (
                  <div className="text-center text-faintest text-sm">
                    <Package className="w-8 h-8 mx-auto mb-2 text-faintest" />
                    <p>No image available</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            <button onClick={() => paginate(-1)} disabled={idx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 backdrop-blur border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-30 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => paginate(1)} disabled={idx === total - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 backdrop-blur border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-30 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="border border-border rounded-xl p-4 space-y-2" style={{ background: "hsl(240 20% 97%)" }}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{listing.title}</p>
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/12 text-primary border border-primary/20 whitespace-nowrap">
                {matchScore(idx)}% Match
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-bold gradient-text text-lg">${listing.soldPrice}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conditionColor(listing.condition)}`}>{listing.condition}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-subtle">
              <span>Sold {listing.soldDate}</span><span>·</span><span>{listing.variant}</span>
            </div>
            <a href={listing.ebayUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-1">
              <ExternalLink className="w-3 h-3" /> View on eBay
            </a>
          </div>
        </motion.div>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/results")}
          className="w-full mt-6 py-3.5 rounded-xl font-bold text-[15px] text-primary-foreground shadow-cta gradient-btn relative overflow-hidden"
        >
          <span className="relative z-10">Continue to My Results →</span>
        </motion.button>
      </main>
    </div>
  );
};

export default ListingsPreviewPage;
