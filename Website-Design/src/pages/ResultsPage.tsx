import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, DollarSign, Store, Heart, ExternalLink, Zap, Clock, TrendingDown, ShieldCheck, ScanSearch } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import ProgressBar from "@/components/ProgressBar";
import { useScan, type Decision } from "@/context/ScanContext";

const tradeInLinks = [
  { name: "Best Buy Trade-In", url: "https://www.bestbuy.com/trade-in", desc: "Get gift cards for eligible electronics." },
  { name: "Apple Trade In", url: "https://www.apple.com/shop/trade-in", desc: "Credit toward a new Apple device or gift card." },
  { name: "Amazon Trade-In", url: "https://www.amazon.com/trade-in", desc: "Trade eligible devices for Amazon gift cards." },
];

const donateLinks = [
  { name: "Goodwill", url: "https://www.goodwill.org/donate/donate-stuff/", desc: "Drop off items at any Goodwill location." },
  { name: "The Salvation Army", url: "https://www.salvationarmyusa.org/usn/ways-to-give/", desc: "Free item pickup from your home." },
  { name: "Habitat ReStores", url: "https://www.habitat.org/restores/donate-goods", desc: "Donate home goods, furniture, and appliances." },
];

const condBadge: Record<string, string> = {
  Excellent: "bg-primary/15 text-primary border-primary/20",
  Good: "bg-primary/10 text-primary-light border-primary/15",
  Fair: "bg-accent/15 text-accent border-accent/20",
  Poor: "bg-destructive/15 text-destructive border-destructive/20",
};

const decisionLabels: { value: Decision; icon: React.ReactNode; label: string }[] = [
  { value: "sell", icon: <DollarSign className="w-4 h-4" />, label: "Sell it" },
  { value: "trade-in", icon: <Store className="w-4 h-4" />, label: "Trade it in" },
  { value: "donate", icon: <Heart className="w-4 h-4" />, label: "Donate it" },
];

function PriceScatter({ comparables, userValue, valueLow, valueHigh }: {
  comparables: { soldPrice: number; title: string; condition: string; ebayUrl: string; imageUrl?: string }[];
  userValue: number;
  valueLow: number;
  valueHigh: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  if (comparables.length === 0) return null;

  const pad = (valueHigh - valueLow) * 0.2 || 50;
  const lo = Math.min(valueLow, ...comparables.map(c => c.soldPrice)) - pad;
  const hi = Math.max(valueHigh, ...comparables.map(c => c.soldPrice)) + pad;

  // 0 = top, 1 = bottom in CSS percentage space
  const toYPct = (p: number) => (1 - (p - lo) / (hi - lo)) * 100;
  const toXPct = (i: number, n: number) => 8 + (i / Math.max(n - 1, 1)) * 84;

  const matchRate = (soldPrice: number) =>
    Math.max(58, Math.round(100 - (Math.abs(soldPrice - userValue) / Math.max(hi - lo, 1)) * 65));

  const gridPrices = [lo + (hi - lo) * 0.25, lo + (hi - lo) * 0.5, lo + (hi - lo) * 0.75];
  const userY = toYPct(userValue);

  return (
    <div className="relative select-none" style={{ height: 148 }}>
      {/* Grid + reference line */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {gridPrices.map((p, i) => (
          <line key={i} x1="9%" y1={`${toYPct(p)}%`} x2="100%" y2={`${toYPct(p)}%`}
            stroke="hsl(240 12% 88%)" strokeWidth="0.8" />
        ))}
        <line x1="9%" y1={`${userY}%`} x2="100%" y2={`${userY}%`}
          stroke="hsl(262 75% 55%)" strokeDasharray="4 3" strokeWidth="1" opacity="0.4" />
      </svg>

      {/* Y axis labels */}
      {gridPrices.map((p, i) => (
        <span key={i} className="absolute text-[9px] text-subtle pointer-events-none"
          style={{ top: `${toYPct(p)}%`, left: 0, transform: "translateY(-50%)" }}>
          ${Math.round(p)}
        </span>
      ))}

      {/* Comparable dots */}
      {comparables.map((c, i) => {
        const x = toXPct(i, comparables.length);
        const y = toYPct(c.soldPrice);
        const rate = matchRate(c.soldPrice);
        const isHovered = hoveredIdx === i;
        // flip tooltip above/below depending on vertical position
        const tipAbove = y > 55;
        return (
          <div key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", zIndex: isHovered ? 30 : 10 }}>
            <a
              href={c.ebayUrl || "https://www.ebay.com"}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="block rounded-full transition-all duration-150 cursor-pointer"
              style={{
                width: 14, height: 14,
                background: isHovered ? "hsl(240 10% 45%)" : "hsl(240 10% 68%)",
                border: "2px solid white",
                boxShadow: isHovered ? "0 0 0 3px hsl(240 10% 68% / 0.3)" : "none",
                transform: isHovered ? "scale(1.35)" : "scale(1)",
              }}
            />
            {isHovered && (
              <div
                className="absolute left-1/2 -translate-x-1/2 w-56 rounded-xl shadow-xl pointer-events-none overflow-hidden"
                style={{
                  [tipAbove ? "bottom" : "top"]: "calc(100% + 8px)",
                  background: "hsl(240 20% 97%)",
                  border: "1px solid hsl(240 12% 83%)",
                  zIndex: 50,
                }}
              >
                {c.imageUrl && (
                  <div className="w-full h-28 bg-[#f0f0f0] flex items-center justify-center overflow-hidden">
                    <img src={`/api/image-proxy?url=${encodeURIComponent(c.imageUrl)}`} alt={c.title}
                      className="max-h-full max-w-full object-contain p-2" />
                  </div>
                )}
                <div style={{ padding: "10px 12px" }}>
                  <p className="text-[10px] font-bold text-foreground leading-snug line-clamp-2 mb-2">{c.title}</p>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold" style={{ color: "hsl(262 75% 45%)" }}>${c.soldPrice.toLocaleString()}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: "hsl(262 75% 55% / 0.1)", color: "hsl(262 75% 55%)" }}>
                      {rate}% match
                    </span>
                  </div>
                  <p className="text-[9px]" style={{ color: "hsl(240 8% 55%)" }}>{c.condition} · Click to view on eBay</p>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* User device dot — animates smoothly when price slider changes */}
      <div className="absolute" style={{ left: "50%", top: `${userY}%`, transform: "translate(-50%, -50%)", zIndex: 20, transition: "top 0.35s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <div className="rounded-full flex items-center justify-center"
          style={{ width: 20, height: 20, background: "hsl(262 75% 55%)", boxShadow: "0 0 10px hsl(262 75% 55% / 0.45)", border: "2.5px solid white" }}>
          <div className="rounded-full bg-white" style={{ width: 6, height: 6 }} />
        </div>
        <span className="absolute whitespace-nowrap text-[8px] font-bold pointer-events-none"
          style={{ top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", color: "hsl(262 75% 48%)" }}>
          Your Item
        </span>
      </div>
    </div>
  );
}

function TrustBadges({ result }: { result: { condition: string; estimatedValue: number; valueHigh: number } }) {
  const pctOfPeak = Math.round((result.estimatedValue / result.valueHigh) * 100);
  const badges = [
    {
      icon: <ShieldCheck className="w-5 h-5" style={{ color: "hsl(262 75% 55%)" }} />,
      label: "Price Guarantee",
      value: `Within ${100 - pctOfPeak + 5}% of Market Peak`,
    },
    {
      icon: <DollarSign className="w-5 h-5" style={{ color: "hsl(262 75% 55%)" }} />,
      label: "Real eBay Data",
      value: "Live sold listings",
    },
    {
      icon: <ScanSearch className="w-5 h-5" style={{ color: "hsl(262 75% 55%)" }} />,
      label: "AI Graded",
      value: `Grade: ${result.condition}`,
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {badges.map(b => (
        <motion.div
          key={b.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-xl p-3 text-center flex flex-col items-center gap-1.5"
          style={{
            background: "linear-gradient(145deg, hsl(262 75% 55% / 0.07), hsl(38 95% 52% / 0.04))",
            border: "1px solid hsl(262 75% 55% / 0.18)",
          }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "hsl(262 75% 55% / 0.1)" }}>
            {b.icon}
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-subtle">{b.label}</p>
          <p className="text-[10px] font-semibold text-foreground leading-tight">{b.value}</p>
        </motion.div>
      ))}
    </div>
  );
}

const ResultsPage = () => {
  const navigate = useNavigate();
  const { result, setResult } = useScan();
  const [decision, setDecision] = useState<Decision | "ai">(result?.recommendation || "sell");
  const [price, setPrice] = useState(result?.adjustedPrice || 0);
  const [displayPrice, setDisplayPrice] = useState(0);
  const [showComparison, setShowComparison] = useState(false);
  if (!result) { navigate("/"); return null; }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const target = result.estimatedValue;
    const dur = 1400;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayPrice(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [result.estimatedValue]);

  const tradeInValue = Math.round(result.estimatedValue * 0.56);
  const tradeInSavings = result.estimatedValue - tradeInValue;

  const handlePriceChange = (val: number) => {
    setPrice(val);
  };

  const saleSpeed = (() => {
    const range = result.valueHigh - result.valueLow;
    const pos = range > 0 ? (price - result.valueLow) / range : 0.5;
    if (pos < 0.33) return { label: "Fast Sale Likely", sub: "Typically sells within 1–3 days", icon: <Zap className="w-3.5 h-3.5" />, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" };
    if (pos < 0.66) return { label: "Moderate Demand", sub: "Usually sells within 1–2 weeks", icon: <Clock className="w-3.5 h-3.5" />, color: "text-accent", bg: "bg-accent/10", border: "border-accent/20" };
    return { label: "Slower Sale Expected", sub: "May take 2+ weeks at this price", icon: <TrendingDown className="w-3.5 h-3.5" />, color: "text-destructive", bg: "bg-destructive/8", border: "border-destructive/20" };
  })();

  const handleGenerate = () => {
    setResult({ ...result, decision: decision === "ai" ? result.recommendation : decision, adjustedPrice: price });
    navigate("/listing");
  };

  return (
    <div className="min-h-screen relative">
      <BackgroundOrbs />
      <Navbar />
      <main className="container mx-auto px-4 max-w-2xl relative z-10 pt-8 pb-20 font-sans">
        <ProgressBar percent={85} />
        <button onClick={() => navigate("/listings-preview")} className="flex items-center gap-1.5 text-sm text-subtle mt-6 mb-4 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">{result.deviceName}</h1>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mb-6 ${condBadge[result.condition]}`}>{result.condition}</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card-glow mb-4">
          <h3 className="text-sm font-bold text-foreground mb-1">Condition Notes</h3>
          <p className="text-sm text-body leading-relaxed">{result.conditionNotes}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card-glow text-center mb-4">
          <p className="text-xs text-subtle mb-1">Market Valuation</p>
          <p className="text-4xl font-display font-bold gradient-text">${displayPrice.toLocaleString()}</p>
          <p className="text-xs text-faintest mt-1">${result.valueLow} – ${result.valueHigh} range · {result.comparables.length} listings</p>

          {/* Trade-in comparison toggle */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-xs text-subtle">vs. trade-in value</span>
            <button
              onClick={() => setShowComparison(c => !c)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              style={{ background: showComparison ? "hsl(262 75% 55%)" : "hsl(240 12% 80%)" }}>
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${showComparison ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
          {showComparison && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl overflow-hidden border border-border">
              <div className="grid grid-cols-2">
                <div className="text-center py-4 px-3 border-r border-border"
                  style={{ background: "hsl(262 75% 55% / 0.05)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-primary mb-1">SnapSell Resale</p>
                  <p className="text-2xl font-display font-bold gradient-text">${result.estimatedValue.toLocaleString()}</p>
                </div>
                <div className="text-center py-4 px-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-subtle mb-1">Typical Trade-In</p>
                  <p className="text-2xl font-display font-bold text-subtle">${tradeInValue.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-center py-3 border-t border-border"
                style={{ background: "hsl(43 75% 50% / 0.05)" }}>
                <p className="text-[10px] text-subtle uppercase tracking-wide">You earn</p>
                <p className="text-xl font-display font-bold" style={{ color: "hsl(43 75% 40%)" }}>
                  +${tradeInSavings.toLocaleString()} more
                </p>
                <p className="text-[10px] text-subtle">by listing directly on eBay</p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Arbitrage comparison table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass-card mb-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <span className="gradient-text">Market Comparison</span>
            <span className="text-[10px] text-subtle font-normal uppercase tracking-wide">· Where to sell</span>
          </h3>
          <div className="space-y-3">
            {[
              { platform: "eBay (Private Sale)", value: result.estimatedValue, pct: 100, badge: "Best Value", badgeCls: "bg-primary/10 text-primary", barColor: "hsl(262 75% 55%)" },
              { platform: "BackMarket (Instant Cash)", value: Math.round(result.estimatedValue * 0.79), pct: 79, badge: "Fastest", badgeCls: "bg-accent/10 text-accent", barColor: "hsl(43 75% 50%)" },
              { platform: result.brand?.toLowerCase().includes("apple") ? "Apple Trade‑In (Credit)" : "Amazon Trade‑In (Credit)", value: Math.round(result.estimatedValue * 0.56), pct: 56, badge: "Store Credit", badgeCls: "bg-secondary text-subtle", barColor: "hsl(240 10% 60%)" },
            ].map(r => (
              <div key={r.platform}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground">{r.platform}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold gradient-text">${r.value.toLocaleString()}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${r.badgeCls}`}>{r.badge}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-secondary">
                  <motion.div className="h-full rounded-full"
                    style={{ background: r.barColor }}
                    initial={{ width: 0 }} animate={{ width: `${r.pct}%` }}
                    transition={{ duration: 0.9, delay: 0.3 }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Market Heatmap */}
        {result.comparables.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="glass-card mb-4">
            <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
              <span className="gradient-text">Price Scatter</span>
              <span className="text-[10px] text-subtle font-normal uppercase tracking-wide">· Recent sales vs your device</span>
            </h3>
            <p className="text-[10px] text-faintest mb-3">Gray dots = comparable eBay sales. Green dot = your device's valuation.</p>
            <PriceScatter
              comparables={result.comparables}
              userValue={price}
              valueLow={result.valueLow}
              valueHigh={result.valueHigh}
            />
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[hsl(240,10%,68%)]" /><span className="text-[10px] text-subtle">Comparable sales</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(262 75% 55%)" }} /><span className="text-[10px] text-subtle">Your item</span></div>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card mb-4">
          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.12), hsl(38 95% 52% / 0.08))", color: "hsl(262 75% 55%)" }}>
            AI Recommends: {result.recommendation.toUpperCase()}
          </span>
          <p className="text-sm text-body">{result.recommendationReason}</p>
        </motion.div>

        {/* Trust Badges */}
        <TrustBadges result={result} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card mb-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Your Decision</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setDecision("ai")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${decision === "ai" ? "border-primary bg-primary/10 text-primary" : "border-border text-subtle hover:border-primary/30"}`}>
              <Sparkles className="w-4 h-4" /> Keep AI pick
            </button>
            {decisionLabels.map(d => (
              <button key={d.value} onClick={() => setDecision(d.value)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${decision === d.value ? "border-primary bg-primary/10 text-primary" : "border-border text-subtle hover:border-primary/30"}`}>
                {d.icon} {d.label}
              </button>
            ))}
          </div>
        </motion.div>

        {(decision === "sell" || decision === "ai") && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card mb-4">
            <h3 className="text-sm font-bold text-foreground mb-2">Adjust Your Price</h3>
            <input type="range" min={result.valueLow} max={result.valueHigh} value={price}
              onChange={e => handlePriceChange(Number(e.target.value))} className="w-full accent-primary" />
            <div className="flex justify-between text-xs text-subtle mt-1">
              <span>${result.valueLow}</span>
              <span className="font-bold gradient-text text-base">${price}</span>
              <span>${result.valueHigh}</span>
            </div>

            <motion.div
              key={saleSpeed.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2 border ${saleSpeed.bg} ${saleSpeed.border}`}
            >
              <span className={saleSpeed.color}>{saleSpeed.icon}</span>
              <div>
                <span className={`text-xs font-bold ${saleSpeed.color}`}>{saleSpeed.label}</span>
                <span className="text-xs text-subtle ml-1.5">{saleSpeed.sub}</span>
              </div>
            </motion.div>
          </motion.div>
        )}

        {decision === "trade-in" && (
          <motion.div key="tradein" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-4 space-y-2.5">
            <div className="glass-card-glow text-center py-4 mb-1">
              <p className="text-xs text-subtle mb-1">Estimated Trade-In Value</p>
              <p className="text-3xl font-display font-bold gradient-text">${result.adjustedPrice}</p>
              <p className="text-xs text-faintest mt-1">Varies by retailer and condition</p>
            </div>
            <p className="text-xs font-bold text-subtle uppercase tracking-wide px-1">Where to trade in</p>
            {tradeInLinks.map(l => (
              <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
                className="glass-card flex items-center gap-3 group">
                <div className="flex-1">
                  <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{l.name}</p>
                  <p className="text-xs text-subtle">{l.desc}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-faintest group-hover:text-primary transition-colors shrink-0" />
              </a>
            ))}
          </motion.div>
        )}

        {decision === "donate" && (
          <motion.div key="donate" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-4 space-y-2.5">
            <div className="glass-card-glow flex items-center gap-3 py-4 px-4 mb-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.15), hsl(38 95% 52% / 0.08))" }}>
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Great choice — give it a new home</p>
                <p className="text-xs text-primary font-medium">Your item could make a real difference for someone in need.</p>
              </div>
            </div>
            <p className="text-xs font-bold text-subtle uppercase tracking-wide px-1">Where to donate</p>
            {donateLinks.map(l => (
              <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
                className="glass-card flex items-center gap-3 group">
                <div className="flex-1">
                  <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{l.name}</p>
                  <p className="text-xs text-subtle">{l.desc}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-faintest group-hover:text-primary transition-colors shrink-0" />
              </a>
            ))}
          </motion.div>
        )}

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerate}
          className="w-full py-3.5 rounded-xl font-bold text-[15px] text-primary-foreground shadow-cta gradient-btn relative overflow-hidden"
        >
          <span className="relative z-10">
            {decision === "donate" ? "Find Donation Centers →" : decision === "trade-in" ? "Continue to Trade-In →" : "Generate My Listing →"}
          </span>
        </motion.button>
      </main>
    </div>
  );
};

export default ResultsPage;
