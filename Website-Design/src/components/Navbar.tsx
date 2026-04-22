import { Tag } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "My Dashboard", to: "/dashboard" },
];

const Navbar = () => {
  const location = useLocation();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 h-[68px] shadow-nav flex items-center px-6"
      style={{ background: "hsl(240 20% 97%)", borderBottom: "1px solid hsl(240 12% 87%)" }}
    >
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full flex items-center justify-center gradient-border transition-transform duration-300 group-hover:scale-110"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(245,158,11,0.15))" }}>
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <span className="text-[22px] font-display font-bold text-foreground">SnapSell</span>
        </Link>

        {/* Center nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 font-sans ${
                location.pathname === link.to
                  ? "text-foreground"
                  : "text-subtle hover:text-foreground"
              }`}
            >
              {link.label}
              {location.pathname === link.to && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute inset-0 rounded-lg bg-secondary -z-10"
                  transition={{ type: "spring", duration: 0.4 }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link
          to="/upload"
          className="px-5 py-2 rounded-full text-sm font-bold shadow-cta transition-all duration-200 hover:-translate-y-0.5 font-sans text-primary-foreground gradient-btn relative overflow-hidden"
        >
          <span className="relative z-10">Snap &amp; Sell</span>
        </Link>
      </div>
    </motion.nav>
  );
};

export default Navbar;
