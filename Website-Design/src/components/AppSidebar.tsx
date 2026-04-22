import { Link, useLocation } from "react-router-dom";
import { Home, Camera, BarChart2, Leaf } from "lucide-react";
import { motion } from "framer-motion";

const links = [
  { icon: Home, label: "Home", to: "/" },
  { icon: Camera, label: "New Scan", to: "/upload" },
  { icon: BarChart2, label: "My Impact", to: "/dashboard" },
];

const AppSidebar = () => {
  const location = useLocation();

  return (
    <div
      className="hidden md:flex fixed left-0 top-0 h-full w-16 flex-col items-center py-4 z-40"
      style={{
        background: "hsl(155 22% 7%)",
        borderRight: "1px solid hsl(153 70% 38% / 0.12)",
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-8 transition-transform hover:scale-105"
        style={{
          background: "linear-gradient(135deg, hsl(153 70% 38% / 0.25), hsl(43 75% 50% / 0.1))",
          border: "1px solid hsl(153 70% 52% / 0.25)",
        }}
      >
        <Leaf className="w-5 h-5 text-primary" />
      </Link>

      {/* Nav icons */}
      <div className="flex flex-col gap-1">
        {links.map(({ icon: Icon, label, to }) => {
          const active = location.pathname === to || (to === "/upload" && location.pathname === "/scan");
          return (
            <Link
              key={to}
              to={to}
              title={label}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group"
            >
              {active && (
                <motion.div
                  layoutId="sidebarActive"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: "hsl(153 70% 38% / 0.15)", border: "1px solid hsl(153 70% 52% / 0.2)" }}
                  transition={{ type: "spring", duration: 0.4 }}
                />
              )}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "hsl(255 255% 255% / 0.04)" }} />
              <Icon
                className="relative z-10 w-[18px] h-[18px] transition-colors duration-200"
                style={{ color: active ? "hsl(153 70% 52%)" : "hsl(150 10% 50%)" }}
              />
              {/* Tooltip */}
              <span
                className="absolute left-14 px-2.5 py-1 rounded-lg text-[11px] font-semibold pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50"
                style={{
                  background: "hsl(155 22% 7%)",
                  color: "hsl(150 15% 85%)",
                  border: "1px solid hsl(153 70% 38% / 0.2)",
                  boxShadow: "0 4px 12px hsl(0 0% 0% / 0.3)",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Bottom glow accent */}
      <div className="mt-auto w-8 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(153 70% 38% / 0.4), transparent)" }} />
    </div>
  );
};

export default AppSidebar;
