import { useState, useEffect } from "react";
import { motion, useScroll } from "framer-motion";
import { Menu, X, Sun, Moon } from "lucide-react";
import klLogo from "url:../../assets/logos/kl.png";
import { useTheme } from "../../hooks/useTheme";

const NAV_LINKS = [
  { label: "Experience", href: "#experience" },
  { label: "Skills", href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "Education", href: "#education" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggle } = useTheme();
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60" : "bg-transparent"
      }`}
    >
      <motion.div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 origin-left"
        style={{ scaleX: scrollYProgress }}
      />
      <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#hero" className="flex items-center hover:opacity-75 transition-opacity">
          <img src={klLogo} alt="KL" className="h-8 w-auto" />
        </a>

        <div className="flex items-center gap-6">
        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <li key={href}>
              <a
                href={href}
                className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                {label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm border border-emerald-500 text-emerald-400 px-4 py-1.5 rounded hover:bg-emerald-500/10 transition-colors"
            >
              Resume
            </a>
          </li>
        </ul>

        <button
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="w-9 h-9 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-zinc-400 hover:text-zinc-100 transition-colors"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60 px-6 pb-6">
          <ul className="flex flex-col gap-4 pt-2">
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <a
                  href={href}
                  className="block text-sm text-zinc-400 hover:text-zinc-100 transition-colors py-1"
                  onClick={() => setOpen(false)}
                >
                  {label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm border border-emerald-500 text-emerald-400 px-4 py-1.5 rounded hover:bg-emerald-500/10 transition-colors"
                onClick={() => setOpen(false)}
              >
                Resume
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
