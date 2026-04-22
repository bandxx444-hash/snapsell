import { Camera, Cpu, TrendingUp, FileText, Globe, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const steps = [
  { icon: Camera, step: "01", title: "Photograph Your Item", desc: "Take a photo or short video of any item you want to price. Works with clothing, electronics, collectibles, footwear, and more.", info: "Tip: Better lighting and multiple angles lead to more accurate valuations." },
  { icon: Cpu, step: "02", title: "AI Identifies & Grades", desc: "Our AI identifies the item, brand, model, and condition in seconds — across all categories.", info: "We use a proprietary grading scale: Excellent, Good, Fair, and Poor." },
  { icon: TrendingUp, step: "03", title: "Real-Time Market Pricing", desc: "SnapSell searches real eBay sold listings to give you a fair market value based on what buyers actually paid.", info: "Prices update every 24 hours to reflect current market trends." },
  { icon: FileText, step: "04", title: "Get Your Listing", desc: "Receive an auto-generated listing with optimized title, description, and pricing — ready to copy-paste to any marketplace.", info: "One click to copy. Sell it yourself, trade it in, or donate it — the choice is yours." },
];

const whyCards = [
  { icon: Globe, title: "Any Item, Any Category", body: "Sneakers, electronics, clothing, collectibles, furniture — if it sells on eBay, SnapSell can price it." },
  { icon: Zap, title: "Instant Results", body: "No sign-ups, no waiting. Snap a photo and get your valuation in under 10 seconds." },
  { icon: Shield, title: "Private & Secure", body: "Your images are processed in real-time and never stored. We take your privacy seriously." },
];

const faqs = [
  { q: "Is SnapSell really free?", a: "Yes — SnapSell is completely free to use for individual scans. We may offer premium features in the future." },
  { q: "What items can I scan?", a: "Anything resellable: sneakers, electronics, clothing, collectibles, games, instruments, jewelry, furniture, and more." },
  { q: "How accurate are the valuations?", a: "Our AI is trained on millions of sold listings and achieves 92%+ accuracy within a $15 margin." },
  { q: "Do you store my photos?", a: "No. All images are processed in-memory and discarded immediately after analysis." },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative">
      <BackgroundOrbs />
      <Navbar />
      <main className="container mx-auto px-4 max-w-5xl relative z-10 pt-16 pb-20 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-3xl md:text-[44px] font-display font-bold leading-tight mb-4">
            Simple. Smart.{" "}
            <span className="text-shimmer">Profitable.</span>
          </h1>
          <p className="text-subtle text-lg max-w-lg mx-auto">Four easy steps from any item to cash in your pocket.</p>
        </motion.div>

        {/* Timeline steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="relative mb-20"
        >
          {/* Vertical connecting line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px hidden md:block"
            style={{ background: "linear-gradient(to bottom, hsl(262 75% 55% / 0.3), hsl(43 75% 50% / 0.2), transparent)" }}
          />

          <div className="space-y-8 md:space-y-12">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className={`flex items-start gap-6 ${isEven ? "md:flex-row" : "md:flex-row-reverse"}`}
                >
                  <div className={`flex-1 ${isEven ? "md:text-right" : "md:text-left"}`}>
                    <div className={`glass-card-glow ${isEven ? "md:ml-auto" : "md:mr-auto"} max-w-md`}>
                      <span className="text-3xl font-display font-bold gradient-text block mb-2">{s.step}</span>
                      <h3 className="text-xl font-display font-bold mb-2">{s.title}</h3>
                      <p className="text-body text-sm leading-relaxed mb-4">{s.desc}</p>
                      <div className="rounded-xl px-4 py-3 text-xs text-subtle border border-border" style={{ background: "hsl(240 20% 97%)" }}>
                        {s.info}
                      </div>
                    </div>
                  </div>
                  {/* Center node */}
                  <div className="hidden md:flex flex-col items-center shrink-0">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center gradient-border relative"
                      style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.12), hsl(38 95% 52% / 0.06))" }}>
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <div className="section-divider mb-16" />

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-[34px] font-display font-bold mb-3">Why SnapSell?</h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6 mb-20"
        >
          {whyCards.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div key={i} variants={itemVariants} className="glass-card-glow text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 gradient-border"
                  style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.1), hsl(38 95% 52% / 0.05))" }}>
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-display font-bold text-foreground mb-2">{c.title}</h4>
                <p className="text-sm text-body leading-relaxed">{c.body}</p>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="section-divider mb-16" />

        <div className="max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl font-display font-bold text-center mb-8">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="glass-card px-6 py-0 border-border">
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-body pb-4">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <button onClick={() => navigate("/upload")}
            className="px-8 py-4 rounded-xl font-bold text-[15px] text-primary-foreground shadow-cta transition-all duration-300 hover:-translate-y-0.5 gradient-btn relative overflow-hidden">
            <span className="relative z-10">Start Scanning Now →</span>
          </button>
        </motion.div>
      </main>
    </div>
  );
};

export default HowItWorks;
