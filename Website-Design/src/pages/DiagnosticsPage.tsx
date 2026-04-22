import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle, ScanSearch } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import ProgressBar from "@/components/ProgressBar";
import { useScan } from "@/context/ScanContext";

const DiagnosticsPage = () => {
  const navigate = useNavigate();
  const { diagnostics, setDiagnostics } = useScan();
  const [form, setForm] = useState(diagnostics);

  const confident = Object.entries(form.aiConfidence).filter(([, v]) => v);
  const uncertain = Object.entries(form.aiConfidence).filter(([, v]) => !v);
  const allConfident = uncertain.length === 0;

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const handleSubmit = () => { setDiagnostics(form); navigate("/loading"); };

  const fieldLabel = (key: string) => ({
    productName: "Item Name",
    brand: "Brand (if any)",
    modelNumber: "Model / Variant",
    yearOfPurchase: "Year / Age",
    itemCategory: "Category",
    itemCondition: "Condition",
  }[key] || key);

  const isUncertain = (key: string) => form.aiConfidence[key] === false;
  const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm bg-card text-foreground placeholder:text-faintest focus:outline-none focus:ring-2 transition-all duration-200 font-sans";
  const uncertainInputCls = `${inputCls} border-orange-400/60 focus:ring-orange-400/30 animate-uncertain-pulse`;
  const normalInputCls = `${inputCls} border-border focus:ring-primary/30`;

  return (
    <div className="min-h-screen relative">
      <BackgroundOrbs />
      <Navbar />
      <main className="container mx-auto px-4 max-w-2xl relative z-10 pt-8 pb-20 font-sans">
        <ProgressBar percent={35} />
        <button onClick={() => navigate("/upload")} className="flex items-center gap-1.5 text-sm text-subtle mt-6 mb-4 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-6">
          <span className="text-[11px] font-bold uppercase tracking-[2px] text-primary mb-3 block">Step 2 of 4</span>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 gradient-border"
            style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.1), hsl(38 95% 52% / 0.05))" }}>
            <ScanSearch className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-[36px] font-display font-bold mb-2">Item Details</h2>
          <p className="text-subtle text-sm">Confirm what the AI found — fix anything that looks off.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          {allConfident ? (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-6 gradient-border"
              style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.08), transparent)" }}>
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI identified all fields from your media</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-6 gradient-border"
              style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.06), hsl(38 95% 52% / 0.04))" }}>
              <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <span className="text-primary font-medium">AI filled in {confident.length} field(s) automatically.</span>{" "}
                <span className="text-accent font-medium">{uncertain.length} field(s) couldn't be determined — please complete them below.</span>
              </div>
            </div>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card">
          <div className="space-y-5">
            {(["productName", "brand", "modelNumber", "yearOfPurchase"] as const).map(key => (
              <div key={key}>
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                  {fieldLabel(key)}
                  {key === "modelNumber" && <span className="text-faintest font-normal">(optional)</span>}
                  {isUncertain(key) && <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
                  {isUncertain(key) && <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wide">Needs your input</span>}
                </label>
                <input
                  type={key === "yearOfPurchase" ? "number" : "text"}
                  value={(form as any)[key]}
                  onChange={e => update(key, key === "yearOfPurchase" ? parseInt(e.target.value) : e.target.value)}
                  placeholder={key === "productName" ? "e.g. Air Jordan 1, Xbox Series X, Levi's Jacket" : key === "brand" ? "e.g. Nike, Microsoft, Sony" : key === "modelNumber" ? "e.g. Size 10, 1TB, Blue" : ""}
                  className={isUncertain(key) ? uncertainInputCls : normalInputCls}
                />
              </div>
            ))}
            <div>
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                {fieldLabel("itemCategory")}
                {isUncertain("itemCategory") && <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
                {isUncertain("itemCategory") && <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wide">Needs your input</span>}
              </label>
              <select value={(form as any).itemCategory || ""} onChange={e => update("itemCategory", e.target.value)}
                className={isUncertain("itemCategory") ? uncertainInputCls : normalInputCls}>
                <option value="">Select category…</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing & Apparel">Clothing &amp; Apparel</option>
                <option value="Footwear">Footwear</option>
                <option value="Collectibles & Art">Collectibles &amp; Art</option>
                <option value="Sports & Outdoors">Sports &amp; Outdoors</option>
                <option value="Home & Garden">Home &amp; Garden</option>
                <option value="Toys & Games">Toys &amp; Games</option>
                <option value="Musical Instruments">Musical Instruments</option>
                <option value="Books & Media">Books &amp; Media</option>
                <option value="Jewelry & Watches">Jewelry &amp; Watches</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                {fieldLabel("itemCondition")}
                {isUncertain("itemCondition") && <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
                {isUncertain("itemCondition") && <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wide">Needs your input</span>}
              </label>
              <select value={(form as any).itemCondition || ""} onChange={e => update("itemCondition", e.target.value)}
                className={isUncertain("itemCondition") ? uncertainInputCls : normalInputCls}>
                <option value="">Select condition…</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
          </div>
          <button onClick={handleSubmit}
            className="w-full mt-8 py-3.5 rounded-xl font-bold text-[15px] text-primary-foreground shadow-cta transition-all duration-300 hover:-translate-y-0.5 gradient-btn relative overflow-hidden">
            <span className="relative z-10">Analyze &amp; Price Item →</span>
          </button>
        </motion.div>
      </main>
    </div>
  );
};

export default DiagnosticsPage;
