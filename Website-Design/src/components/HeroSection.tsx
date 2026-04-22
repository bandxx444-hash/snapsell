import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useScan } from "@/context/ScanContext";
import heroDevice from "@/assets/hero-device.png";

const HeroSection = () => {
  const navigate = useNavigate();
  const { setFiles } = useScan();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (dropped.length) {
      setFiles(dropped);
      navigate("/upload");
    }
  }, [setFiles, navigate]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFiles(Array.from(e.target.files));
      navigate("/upload");
    }
  }, [setFiles, navigate]);

  return (
    <section className="relative z-10 pt-20 pb-16">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* Left column */}
        <div className="text-center md:text-left">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full mb-8 gradient-border"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.05))" }}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium font-sans text-subtle tracking-wide">
              AI-Powered · Any Item · Free
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-[58px] font-bold leading-[1.08] mb-6 tracking-tight"
          >
            Snap Anything.
            <br />
            <span className="text-shimmer">Know Its Worth.</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-subtle max-w-[520px] mx-auto md:mx-0 mb-10 leading-relaxed font-sans"
          >
            Photograph any item — from sneakers to game consoles — and instantly discover its resale value, comparable sold listings, and a ready-to-post eBay listing.
          </motion.p>

          {/* CTA Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center md:items-start gap-5 mb-10"
          >
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/upload")}
              className="group px-8 py-4 rounded-xl font-bold text-[15px] text-primary-foreground shadow-cta transition-all duration-300 font-sans flex items-center gap-2 gradient-btn relative z-10"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Scanning
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </motion.button>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground mb-2 font-sans">Drop a photo or video</p>
              <motion.div
                whileHover={{ borderColor: "hsl(262 75% 55% / 0.5)" }}
                className="border border-dashed border-border rounded-2xl h-[88px] w-[260px] flex items-center justify-center gap-2 text-subtle text-sm cursor-pointer transition-all duration-300 hover:shadow-glow font-sans bg-card"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-5 h-5 text-primary" />
                Click or drag to upload
              </motion.div>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
            </div>
          </motion.div>
        </div>

        {/* Right column - Hero image with layered effects */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 40 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring", damping: 20 }}
          className="relative flex justify-center"
        >
          <div className="relative">
            {/* Decorative rings behind image */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-8 rounded-full border opacity-[0.08]"
              style={{ borderColor: "hsl(var(--primary))" }}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-16 rounded-full border border-dashed opacity-[0.05]"
              style={{ borderColor: "hsl(var(--accent))" }}
            />

            <img
              src={heroDevice}
              alt="AI scanning an item to determine its resale value"
              width={1024}
              height={1024}
              className="w-full max-w-[420px] animate-float relative z-10"
            />
            {/* Glow behind image */}
            <div className="absolute inset-0 -z-10 blur-3xl opacity-25"
              style={{ background: "radial-gradient(circle, hsl(var(--primary)), hsl(var(--accent)), transparent)" }}
            />
          </div>
        </motion.div>
      </div>

      {/* 3-step explainer */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="glass-card-glow inline-flex flex-wrap items-center justify-center gap-8 md:gap-12 text-sm font-sans mt-8 w-full"
      >
        {[
          { n: "01", title: "Upload Media", sub: "Photo or video" },
          { n: "02", title: "AI Analysis", sub: "Instant detection" },
          { n: "03", title: "Get Your Listing", sub: "Sell in minutes" },
        ].map((step, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 cursor-default"
          >
            <span className="text-2xl font-display font-bold gradient-text">{step.n}</span>
            <div className="text-left">
              <div className="font-semibold text-foreground">{step.title}</div>
              <div className="text-xs text-subtle">{step.sub}</div>
            </div>
            {i < 2 && <span className="text-faintest ml-3 hidden md:inline">→</span>}
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default HeroSection;
