import { Tag, Mail } from "lucide-react";

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="relative z-10 border-t border-border mt-16">
    <div className="container mx-auto px-4 max-w-5xl py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(262 75% 55%), hsl(262 75% 42%))" }}>
              <Tag className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg gradient-text">SnapSell</span>
          </div>
          <p className="text-xs text-subtle leading-relaxed max-w-xs">
            AI-powered resale scanner that identifies any item, prices it from real eBay sold listings, and generates a ready-to-post listing in seconds.
          </p>
        </div>

        {/* Links */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-subtle mb-4">Navigate</p>
          <ul className="space-y-2.5">
            {[
              { label: "Home", to: "/" },
              { label: "How It Works", to: "/how-it-works" },
              { label: "Snap an Item", to: "/upload" },
              { label: "Dashboard", to: "/dashboard" },
            ].map(l => (
              <li key={l.to}>
                <Link to={l.to} className="text-sm text-body hover:text-primary transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Mission */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-subtle mb-4">Our Mission</p>
          <p className="text-xs text-subtle leading-relaxed mb-4">
            The average household has $4,500 in unused items. We're building tools to help people turn clutter into cash — one snap at a time.
          </p>
          <div className="flex gap-3">
            <a href="https://github.com/bandxx444-hash/ewaste-detector" target="_blank" rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:border-primary hover:text-primary text-subtle transition-colors">
              <GithubIcon />
            </a>
            <a href="mailto:bandxx444@gmail.com"
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:border-primary hover:text-primary text-subtle transition-colors">
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-faintest">© {new Date().getFullYear()} SnapSell. Turn anything into cash.</p>
        <div className="flex items-center gap-1.5">
          <Tag className="w-3 h-3 text-primary" />
          <span className="text-xs text-subtle">Every snap counts.</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
