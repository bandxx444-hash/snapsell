const BackgroundOrbs = () => (
  <div className="fixed inset-0 pointer-events-none z-0" style={{ overflow: "hidden", contain: "strict" }}>
    <div className="absolute -top-40 -right-40 w-[600px] h-[400px] rounded-full opacity-[0.10] animate-blob will-change-transform"
      style={{ background: "radial-gradient(ellipse at 40% 50%, hsl(262 75% 75% / 0.5), hsl(43 80% 75% / 0.3) 50%, transparent 80%)" }} />
    <div className="absolute top-1/2 -left-40 w-[500px] h-[380px] rounded-full opacity-[0.07] animate-blob will-change-transform"
      style={{ background: "radial-gradient(ellipse at 60% 40%, hsl(43 85% 75% / 0.4), hsl(262 65% 75% / 0.3) 60%, transparent 80%)", animationDelay: "4s", animationDuration: "20s" }} />

    {/* Subtle grid */}
    <div className="absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage: `linear-gradient(hsl(262 75% 55% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(262 75% 55% / 0.4) 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
      }}
    />

    {/* Top accent line */}
    <div className="absolute top-0 left-0 right-0 h-px"
      style={{ background: "linear-gradient(90deg, transparent, hsl(262 75% 55% / 0.2), hsl(43 75% 50% / 0.15), transparent)" }} />
  </div>
);

export default BackgroundOrbs;
