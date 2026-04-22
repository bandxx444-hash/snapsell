import { useNavigate } from "react-router-dom";
import { Trash2, DollarSign, Store, Heart, Inbox, Tag, Users, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import GlobalTicker from "@/components/GlobalTicker";

import { useScan, type ScanResult } from "@/context/ScanContext";

const condBadge: Record<string, string> = {
  Excellent: "bg-primary/15 text-primary",
  Good: "bg-primary/10 text-primary-light",
  Fair: "bg-accent/15 text-accent",
  Poor: "bg-destructive/15 text-destructive",
};

const decisionIcon: Record<string, React.ReactNode> = {
  sell: <DollarSign className="w-5 h-5 text-primary" />,
  "trade-in": <Store className="w-5 h-5 text-accent" />,
  donate: <Heart className="w-5 h-5 text-primary" />,
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { scanHistory, clearHistory } = useScan();
  const totalValue = scanHistory.reduce((s, r) => s + r.estimatedValue, 0);

  return (
    <div className="min-h-screen relative">
      <BackgroundOrbs />
      <Navbar />
      <main className="container mx-auto px-4 max-w-3xl relative z-10 pt-10 pb-20 font-sans">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-[40px] font-display font-bold mb-4"
        >
          My Dashboard
        </motion.h1>

        <GlobalTicker />

        {scanHistory.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-faintest" />
            </div>
            <h2 className="text-xl font-display font-bold mb-2">No scans yet</h2>
            <p className="text-subtle text-sm mb-8">Scan your first item to start tracking your resale value.</p>

            <div className="grid grid-cols-3 gap-3 mb-8 text-left">
              {[
                { icon: <Users className="w-5 h-5 text-primary" />, stat: "1,000 users", desc: "Over $4.5M in resale value found" },
                { icon: <TrendingUp className="w-5 h-5 text-primary" />, stat: "$150B", desc: "Secondhand electronics market by 2030" },
                { icon: <Tag className="w-5 h-5 text-primary" />, stat: "Free", desc: "No sign-up required to start selling" },
              ].map(({ icon, stat, desc }) => (
                <div key={stat} className="glass-card text-center py-4 px-3">
                  <div className="flex justify-center mb-2">{icon}</div>
                  <p className="text-sm font-display font-bold gradient-text">{stat}</p>
                  <p className="text-[11px] text-subtle leading-snug mt-1">{desc}</p>
                </div>
              ))}
            </div>

            <button onClick={() => navigate("/upload")}
              className="px-6 py-3 rounded-xl font-bold text-[15px] text-primary-foreground shadow-cta gradient-btn relative overflow-hidden">
              <span className="relative z-10">Snap Your First Item →</span>
            </button>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-3 gap-4 mb-8"
            >
              {[
                { label: "Items Scanned", value: scanHistory.length },
                { label: "Total Est. Value", value: `$${totalValue.toLocaleString()}` },
                { label: "Top Value", value: scanHistory.length > 0 ? `$${Math.max(...scanHistory.map(r => r.estimatedValue))}` : "$0" },
              ].map(m => (
                <div key={m.label} className="glass-card-glow text-center py-5">
                  <div className="text-2xl font-display font-bold gradient-text">{m.value}</div>
                  <div className="text-xs text-subtle mt-1">{m.label}</div>
                </div>
              ))}
            </motion.div>


            <div className="space-y-3 mb-8">
              {scanHistory.map((r: ScanResult, i: number) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="glass-card-glow flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    {decisionIcon[r.decision]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">{r.deviceName}</p>
                    <p className="text-xs text-subtle">{r.brand} · {new Date(r.scannedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-display font-bold gradient-text">${r.estimatedValue}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${condBadge[r.condition]}`}>{r.condition}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/upload")}
                className="flex-1 py-3 rounded-xl font-bold text-[15px] text-primary-foreground shadow-cta gradient-btn relative overflow-hidden"
              >
                <span className="relative z-10">Snap Another Item →</span>
              </motion.button>
              <button onClick={clearHistory}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-subtle border border-border hover:bg-secondary transition-all duration-200">
                <Trash2 className="w-4 h-4" /> Clear
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
