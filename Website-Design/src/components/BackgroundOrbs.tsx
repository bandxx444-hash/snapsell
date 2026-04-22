// Reduced to 8 particles (from 20), smaller blurs, will-change on animated elements
const particles = [
  { left: "8%",  delay: "0s",   dur: "8s",  size: 4 },
  { left: "22%", delay: "2.1s", dur: "10s", size: 5 },
  { left: "38%", delay: "1.4s", dur: "7s",  size: 4 },
  { left: "52%", delay: "4.5s", dur: "9s",  size: 5 },
  { left: "65%", delay: "0.8s", dur: "8.5s",size: 4 },
  { left: "78%", delay: "3.2s", dur: "7.5s",size: 4 },
  { left: "88%", delay: "5.0s", dur: "9s",  size: 5 },
  { left: "96%", delay: "2.6s", dur: "8s",  size: 4 },
];

const colors = [
  "hsl(262 75% 55%)",
  "hsl(43 75% 55%)",
  "hsl(262 65% 65%)",
  "hsl(43 65% 52%)",
];

const BackgroundOrbs = () => (
  <div className="fixed inset-0 pointer-events-none z-0" style={{ overflow: "hidden", contain: "strict" }}>
    {/* Gradient orbs — reduced blur for GPU performance */}
    <div className="absolute -top-40 -right-40 w-[600px] h-[400px] rounded-full opacity-[0.12] animate-blob will-change-transform"
      style={{ background: "radial-gradient(ellipse at 40% 50%, hsl(262 75% 75% / 0.6), hsl(43 80% 75% / 0.4) 50%, transparent 80%)" }} />
    <div className="absolute top-1/2 -left-40 w-[500px] h-[380px] rounded-full opacity-[0.08] animate-blob will-change-transform"
      style={{ background: "radial-gradient(ellipse at 60% 40%, hsl(43 85% 75% / 0.5), hsl(262 65% 75% / 0.4) 60%, transparent 80%)", animationDelay: "4s", animationDuration: "14s" }} />

    {/* Subtle grid */}
    <div className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `linear-gradient(hsl(262 75% 55% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(262 75% 55% / 0.4) 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
      }}
    />

    {/* Vignette */}
    <div className="absolute inset-0"
      style={{ background: "radial-gradient(ellipse at 50% 30%, transparent 40%, hsl(240 20% 97% / 0.55) 100%)" }}
    />

    {/* Top accent line */}
    <div className="absolute top-0 left-0 right-0 h-px"
      style={{ background: "linear-gradient(90deg, transparent, hsl(262 75% 55% / 0.2), hsl(43 75% 50% / 0.15), transparent)" }} />

    {/* Rising particles — using transform instead of top for GPU compositing */}
    {particles.map((p, i) => (
      <div
        key={i}
        className="absolute rounded-full will-change-transform"
        style={{
          left: p.left,
          bottom: "2px",
          width: `${p.size}px`,
          height: `${p.size}px`,
          background: colors[i % colors.length],
          animation: `particleRise ${p.dur} ${p.delay} linear infinite`,
          opacity: 0,
        }}
      />
    ))}
  </div>
);

export default BackgroundOrbs;
