import { motion } from "framer-motion";
import { Cpu, DollarSign, Leaf, Star } from "lucide-react";

const stats = [
  { value: "50K+", label: "Devices Scanned", icon: Cpu },
  { value: "$2.1M", label: "Value Recovered", icon: DollarSign },
  { value: "1.2M lbs", label: "CO₂ Saved", icon: Leaf },
  { value: "4.9★", label: "User Rating", icon: Star },
];

const StatsRow = () => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
    className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16"
  >
    {stats.map((s) => (
      <motion.div
        key={s.label}
        variants={{ hidden: { opacity: 0, y: 30, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1 } }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="glass-card-glow text-center py-6 px-4 cursor-default"
      >
        <s.icon className="w-5 h-5 text-primary mx-auto mb-2 opacity-60" />
        <div className="text-2xl md:text-3xl font-display font-bold gradient-text mb-1">{s.value}</div>
        <div className="text-xs font-medium text-subtle font-sans">{s.label}</div>
      </motion.div>
    ))}
  </motion.div>
);

export default StatsRow;
