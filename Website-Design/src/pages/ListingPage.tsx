import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink, RotateCcw, DollarSign, Heart, Loader2, Copy, Check, Tag, Star, Truck, ShieldCheck, MapPin, Navigation, Sparkles, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import ProgressBar from "@/components/ProgressBar";
import { useScan } from "@/context/ScanContext";
import { generateListing, type ListingData } from "@/lib/api";

const tradeInLinks = [
  { name: "Best Buy Trade-In", url: "https://www.bestbuy.com/trade-in", desc: "Trade in electronics for Best Buy gift cards." },
  { name: "Apple Trade In", url: "https://www.apple.com/shop/trade-in", desc: "Get credit toward a new Apple device or an Apple Gift Card." },
  { name: "Amazon Trade-In", url: "https://www.amazon.com/trade-in", desc: "Trade eligible devices for Amazon gift cards." },
];

const donateLinks = [
  { name: "Goodwill", url: "https://www.goodwill.org/donate/donate-stuff/", desc: "Drop off items at any Goodwill location." },
  { name: "The Salvation Army", url: "https://www.salvationarmyusa.org/usn/ways-to-give/", desc: "Free item pickup from your home." },
  { name: "Habitat ReStores", url: "https://www.habitat.org/restores/donate-goods", desc: "Donate home goods, furniture, and appliances." },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="shrink-0 p-1.5 rounded-lg hover:bg-secondary transition-colors text-subtle hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CopyAllButton({ onCopy }: { onCopy: () => void }) {
  const [copied, setCopied] = useState(false);
  const handle = () => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={handle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-secondary transition-colors text-subtle hover:text-foreground">
      {copied ? <><Check className="w-3 h-3 text-primary" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy All</>}
    </button>
  );
}

async function extractVideoFrames(file: File, count = 4): Promise<string[]> {
  return new Promise(resolve => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.addEventListener("error", () => { URL.revokeObjectURL(url); resolve([]); });
    video.addEventListener("loadedmetadata", async () => {
      const dur = video.duration;
      if (!isFinite(dur) || dur === 0) { URL.revokeObjectURL(url); resolve([]); return; }
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const frames: string[] = [];
      const timestamps = Array.from({ length: count }, (_, i) => (i + 0.5) * (dur / count));
      for (const ts of timestamps) {
        await new Promise<void>(res => {
          video.currentTime = ts;
          video.addEventListener("seeked", () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            frames.push(canvas.toDataURL("image/jpeg", 0.85));
            res();
          }, { once: true });
        });
      }
      URL.revokeObjectURL(url);
      resolve(frames);
    });
  });
}

const EbayWordmark = () => (
  <svg viewBox="0 0 100 40" className="h-7 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="32" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="38" letterSpacing="-2">
      <tspan fill="#E53238">e</tspan>
      <tspan fill="#0064D2">b</tspan>
      <tspan fill="#F5AF02">a</tspan>
      <tspan fill="#86B817">y</tspan>
    </text>
  </svg>
);

function EbayListingPreview({ listing, photos, deviceName }: {
  listing: ListingData;
  photos: string[];
  deviceName: string;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const total = photos.length;
  const current = photos[photoIdx];

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-white shadow-lg mb-5 text-left">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#e5e5e5] bg-white">
        <EbayWordmark />
        <span className="text-xs text-[#767676] ml-1">Listing Preview</span>
      </div>
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-52 shrink-0 bg-[#f7f7f7] flex flex-col items-center justify-center min-h-[200px] relative">
          {total > 0 ? (
            <>
              <div className="relative w-full flex items-center justify-center" style={{ minHeight: 180 }}>
                <img key={current} src={current} alt={`${deviceName} photo ${photoIdx + 1}`} className="max-h-44 max-w-full object-contain p-3" />
                {total > 1 && (
                  <>
                    <button onClick={() => setPhotoIdx(i => Math.max(0, i - 1))} disabled={photoIdx === 0}
                      className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 border border-[#e5e5e5] shadow flex items-center justify-center disabled:opacity-25 hover:bg-white transition-all z-10">
                      <ChevronLeft className="w-3.5 h-3.5 text-[#555]" />
                    </button>
                    <button onClick={() => setPhotoIdx(i => Math.min(total - 1, i + 1))} disabled={photoIdx === total - 1}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 border border-[#e5e5e5] shadow flex items-center justify-center disabled:opacity-25 hover:bg-white transition-all z-10">
                      <ChevronRight className="w-3.5 h-3.5 text-[#555]" />
                    </button>
                  </>
                )}
              </div>
              {total > 1 && (
                <div className="flex gap-1 pb-2">
                  {photos.map((_, i) => (
                    <button key={i} onClick={() => setPhotoIdx(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIdx ? "bg-[#0064D2] w-3" : "bg-[#c7c7c7]"}`} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-28 h-28 rounded-xl bg-[#e5e5e5] flex items-center justify-center">
              <span className="text-[11px] text-[#767676] text-center px-2">Your photo<br/>goes here</span>
            </div>
          )}
        </div>
        <div className="flex-1 p-4">
          <p className="text-[15px] font-semibold text-[#191919] leading-snug mb-3">{listing.title}</p>
          <div className="mb-3">
            <span className="text-2xl font-bold text-[#191919]">${listing.price}</span>
            <span className="text-sm text-[#767676] ml-2">Buy It Now</span>
          </div>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs font-semibold text-[#767676] uppercase tracking-wide">Condition:</span>
            <span className="text-xs font-bold text-[#191919]">{listing.condition}</span>
          </div>
          <div className="flex items-center gap-1.5 mb-3">
            <Truck className="w-3.5 h-3.5 text-[#767676]" />
            <span className="text-xs text-[#767676]">{listing.shipping}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-[#F5AF02] text-[#F5AF02]" />
              <span className="text-[11px] text-[#767676]">Top Rated Seller</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#0064D2]" />
              <span className="text-[11px] text-[#767676]">eBay Money Back Guarantee</span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-[#e5e5e5] bg-[#fafafa]">
        <p className="text-[11px] font-bold text-[#767676] uppercase tracking-wide mb-1.5">Item Description</p>
        <p className="text-xs text-[#191919] leading-relaxed whitespace-pre-line line-clamp-4">{listing.description}</p>
      </div>
      {listing.tags.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[#e5e5e5] flex flex-wrap gap-1.5">
          {listing.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#e5f0ff] text-[#0064D2] border border-[#cce0ff]">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function PolishPhotosButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full mb-3 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-dashed border-border hover:border-primary/40 text-subtle hover:text-foreground transition-all duration-200">
        <Sparkles className="w-4 h-4" />
        Polish My Photos — AI Background Removal
        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
          style={{ background: "hsl(43 75% 50% / 0.15)", color: "hsl(43 75% 40%)" }}>Pro</span>
      </button>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setOpen(false)}>
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-lg rounded-t-2xl p-6 pb-8"
            style={{ background: "hsl(240 20% 97%)" }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.12), hsl(38 95% 52% / 0.08))" }}>
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground text-sm">AI Photo Polish</h3>
                  <p className="text-xs text-subtle">Studio shots from your phone</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-subtle" />
              </button>
            </div>
            <div className="space-y-2.5 mb-5">
              {[
                "Removes cluttered backgrounds in one click",
                "Places your device on a clean white studio backdrop",
                "Adds a natural drop shadow for a professional look",
                "Increases listing views by up to 3× on eBay",
              ].map(f => (
                <div key={f} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-body">{f}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl px-4 py-3 mb-4 text-center"
              style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.07), hsl(38 95% 52% / 0.05))" }}>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-0.5">Coming in SnapSell Pro</p>
              <p className="text-xs text-subtle">Powered by Segment Anything Model (Meta AI)</p>
            </div>
            <button onClick={() => setOpen(false)}
              className="w-full py-3 rounded-xl font-bold text-sm border border-border hover:bg-secondary transition-colors">
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

function RecyclingMap() {
  const [status, setStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [mapSrc, setMapSrc] = useState<string | null>(null);
  const [gmapsUrl, setGmapsUrl] = useState<string | null>(null);

  const requestLocation = () => {
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMapSrc(
          `https://maps.google.com/maps?q=donation+centers+near+me&ll=${lat},${lng}&z=13&output=embed`
        );
        setGmapsUrl(
          `https://www.google.com/maps/search/donation+centers/@${lat},${lng},13z`
        );
        setStatus("granted");
      },
      () => setStatus("denied")
    );
  };

  return (
    <div className="glass-card text-left mb-6">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Find Donation Centers Near You</h3>
      </div>

      {status === "idle" && (
        <div className="text-center py-6">
          <p className="text-xs text-subtle mb-4">Share your location to find donation centers nearby.</p>
          <button onClick={requestLocation}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-primary-foreground gradient-btn">
            <Navigation className="w-4 h-4" /> Share My Location
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-subtle">Getting your location…</span>
        </div>
      )}

      {status === "granted" && mapSrc && (
        <>
          <div className="rounded-xl overflow-hidden border border-border mb-3" style={{ height: 280 }}>
            <iframe
              src={mapSrc}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Recycling centers near you"
            />
          </div>
          <a href={gmapsUrl!} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            <ExternalLink className="w-3 h-3" /> Open in Google Maps
          </a>
        </>
      )}

      {status === "denied" && (
        <div className="text-center py-4">
          <p className="text-xs text-subtle mb-3">Location access was denied. Search manually on Google Maps.</p>
          <a href="https://www.google.com/maps/search/donation+centers+near+me"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            <ExternalLink className="w-3 h-3" /> Search on Google Maps
          </a>
        </div>
      )}
    </div>
  );
}

const ListingPage = () => {
  const navigate = useNavigate();
  const { result, listing: ctxListing, setListing, addToHistory, resetScan, files } = useScan();
  const [listing, setLocalListing] = useState<ListingData | null>(ctxListing);
  const [listingLoading, setListingLoading] = useState(!ctxListing && result?.decision === "sell");
  const [photos, setPhotos] = useState<string[]>([]);
  const photosBuilt = useRef(false);

  useEffect(() => {
    if (photosBuilt.current || files.length === 0) return;
    photosBuilt.current = true;
    (async () => {
      const urls: string[] = [];
      for (const f of files) {
        if (f.type.startsWith("image/")) urls.push(URL.createObjectURL(f));
        else if (f.type.startsWith("video/")) urls.push(...await extractVideoFrames(f, 4));
      }
      setPhotos(urls);
    })();
    return () => { photos.forEach(u => { if (u.startsWith("blob:")) URL.revokeObjectURL(u); }); };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (result) addToHistory(result);
    if (result?.decision === "sell" && !ctxListing) {
      generateListing(result)
        .then(data => { setLocalListing(data); setListing(data); })
        .catch(() => setLocalListing(null))
        .finally(() => setListingLoading(false));
    }
  }, []); // eslint-disable-line

  if (!result) { navigate("/"); return null; }

  const handleScanAnother = () => { resetScan(); navigate("/upload"); };

  const handleCopyAll = () => {
    if (!listing) return;
    const text = `TITLE: ${listing.title}\n\nCONDITION: ${listing.condition}\n\nPRICE: $${listing.price}\n\nDESCRIPTION:\n${listing.description}\n\nSHIPPING: ${listing.shipping}\n\nTAGS: ${listing.tags.join(", ")}`;
    navigator.clipboard.writeText(text);
  };

  const handleShareCertificate = () => {
    if (!result) return;
    const text = `Just sold my ${result.deviceName} using SnapSell AI for $${result.estimatedValue}!\n\nSnap any item and get instant resale pricing + a ready-to-post eBay listing.\n\nTry it free → snapsell.app\n\n#SnapSell #Resale #SellOnEBay`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen relative">
      <BackgroundOrbs />
      <Navbar />
      <main className="container mx-auto px-4 max-w-2xl relative z-10 pt-8 pb-20 font-sans">
        <ProgressBar percent={100} />
        <div className="text-center mt-8 mb-8 animate-fade-in-up">
          <span className="text-[11px] font-bold uppercase tracking-[2px] gradient-text mb-3 block">Step 4 of 4 — Complete</span>

          {result.decision === "sell" && (
            <>
              <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">Your eBay Listing</h1>
              <p className="text-sm text-subtle mb-6">Preview your listing below, then copy the details to post on eBay.</p>
              {listingLoading ? (
                <div className="space-y-3 mb-4 text-left">
                  <div className="rounded-2xl overflow-hidden border border-border" style={{ background: "#fafafa" }}>
                    <div className="shimmer-block h-48 rounded-none" style={{ borderRadius: 0 }} />
                    <div className="px-4 py-3 space-y-2">
                      <div className="shimmer-block h-4 w-3/4 rounded-lg" />
                      <div className="shimmer-block h-3 w-1/2 rounded-lg" />
                    </div>
                  </div>
                  <div className="shimmer-block h-14 rounded-xl" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="shimmer-block h-14 rounded-xl" />
                    <div className="shimmer-block h-14 rounded-xl" />
                  </div>
                  <div className="shimmer-block h-28 rounded-xl" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="shimmer-block h-14 rounded-xl" />
                    <div className="shimmer-block h-14 rounded-xl" />
                  </div>
                </div>
              ) : listing ? (
                <>
                  <EbayListingPreview listing={listing} photos={photos} deviceName={result.deviceName} />
                  <div className="space-y-3 mb-5 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-subtle font-semibold uppercase tracking-wide">Copy &amp; Paste to eBay</p>
                      <CopyAllButton onCopy={handleCopyAll} />
                    </div>
                    <div className="glass-card p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-subtle">Title</span>
                        <CopyButton text={listing.title} />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{listing.title}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-subtle">Condition</span>
                          <CopyButton text={listing.condition} />
                        </div>
                        <p className="text-sm font-semibold text-foreground">{listing.condition}</p>
                      </div>
                      <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-subtle">Suggested Price</span>
                          <CopyButton text={`$${listing.price}`} />
                        </div>
                        <p className="text-lg font-display font-bold gradient-text">${listing.price}</p>
                      </div>
                    </div>
                    <div className="glass-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-subtle">Description</span>
                        <CopyButton text={listing.description} />
                      </div>
                      <p className="text-sm text-body leading-relaxed whitespace-pre-line">{listing.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-subtle">Shipping</span>
                          <CopyButton text={listing.shipping} />
                        </div>
                        <p className="text-xs text-body">{listing.shipping}</p>
                      </div>
                      <div className="glass-card p-4">
                        <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-subtle block mb-2">Tags</span>
                        <div className="flex flex-wrap gap-1">
                          {listing.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                              <Tag className="w-2.5 h-2.5" />{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="glass-card py-8 mb-4 text-center text-subtle text-sm">
                  Could not generate listing. Use the eBay button below.
                </div>
              )}
              <a href="https://www.ebay.com/sl/sell" target="_blank" rel="noopener noreferrer"
                onClick={() => confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#7c3aed", "#a78bfa", "#f59e0b", "#ffffff"] })}
                className="w-full mb-3 py-4 rounded-xl font-bold text-[16px] text-primary-foreground shadow-cta transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, hsl(262 75% 55%), hsl(262 75% 42%))" }}>
                <ExternalLink className="w-5 h-5" /> Post on eBay →
              </a>
              <p className="text-xs text-subtle mb-4">Copy the fields above and paste them into eBay's listing form.</p>

              {/* Polish photos placeholder */}
              <PolishPhotosButton />

            </>
          )}

          {result.decision === "trade-in" && (
            <>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 gradient-border"
                style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.1), hsl(38 95% 52% / 0.05))" }}>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-subtle mb-1">Expected Value</p>
              <p className="text-4xl font-display font-bold gradient-text mb-8">${result.adjustedPrice} USD</p>
              <div className="space-y-3 text-left mb-6">
                {tradeInLinks.map(l => (
                  <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" className="glass-card flex items-center gap-4 group">
                    <div className="flex-1">
                      <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{l.name}</p>
                      <p className="text-xs text-subtle">{l.desc}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-faintest group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            </>
          )}

          {result.decision === "donate" && (
            <>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 gradient-border"
                style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.1), hsl(38 95% 52% / 0.05))" }}>
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <div className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 mb-6 gradient-border"
                style={{ background: "linear-gradient(135deg, hsl(262 75% 55% / 0.08), transparent)" }}>
                <Leaf className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Donate this item and give it a new home.</span>
              </div>

              <RecyclingMap />

              <div className="space-y-3 text-left mb-6">
                {donateLinks.map(l => (
                  <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" className="glass-card flex items-center gap-4 group">
                    <div className="flex-1">
                      <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{l.name}</p>
                      <p className="text-xs text-subtle">{l.desc}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-faintest group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            </>
          )}



          <button onClick={handleScanAnother}
            className="w-full py-3.5 rounded-xl font-bold text-[15px] text-primary-foreground shadow-cta transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, hsl(262 75% 55%), hsl(262 75% 42%))" }}>
            <RotateCcw className="w-4 h-4" /> Snap Another Item →
          </button>
        </div>
      </main>
    </div>
  );
};

export default ListingPage;
