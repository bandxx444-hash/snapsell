import { motion } from "framer-motion";

const ITEMS = [
  "4,203 items scanned this week",
  "$892,400 in resale value recovered globally",
  "1,840 eBay listings generated",
  "Average item sells within 3 days of listing",
  "Top category this week: Sneakers & Footwear",
  "Free shipping listings get 50% more buyers",
  "3,100 items sold by SnapSell users this month",
];

const GlobalTicker = () => (
  <div className="rounded-xl border border-primary/20 overflow-hidden mb-6 flex items-stretch"
    style={{ background: "linear-gradient(90deg, hsl(262 30% 97%), hsl(240 20% 97%))" }}>
    <div className="shrink-0 px-3 flex items-center border-r border-primary/15">
      <span className="text-[9px] font-black uppercase tracking-[3px] text-primary leading-tight">
        Live<br/>Sales
      </span>
    </div>
    <div className="flex-1 overflow-hidden py-2.5">
      <motion.div
        className="flex gap-10 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      >
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span key={i} className="text-xs text-body font-medium">{item}</span>
        ))}
      </motion.div>
    </div>
  </div>
);

export default GlobalTicker;
