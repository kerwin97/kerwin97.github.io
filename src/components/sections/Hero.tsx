import { useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Mail, Download, ArrowDown } from "lucide-react";
import { personal } from "../../data/resume";
import { useTypewriter } from "../../hooks/useTypewriter";

const ROTATING_WORDS = ["Software", "Site Reliability", "Data"];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export function Hero() {
  const typed = useTypewriter(ROTATING_WORDS);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--glow-x", `${x}%`);
    e.currentTarget.style.setProperty("--glow-y", `${y}%`);
  }, []);

  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col justify-center max-w-5xl mx-auto px-6 pt-16 relative"
      onMouseMove={handleMouseMove}
      style={
        {
          "--glow-x": "50%",
          "--glow-y": "40%",
        } as React.CSSProperties
      }
    >
      {/* Mouse-tracking glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(600px circle at var(--glow-x) var(--glow-y), rgba(96,165,250,0.07), transparent 60%)",
        }}
      />

      <motion.div variants={container} initial="hidden" animate="show">
        <motion.p variants={item} className="font-mono text-emerald-400 text-sm mb-4 tracking-wider">
          Hi, my name is
        </motion.p>

        <motion.h1 variants={item} className="text-5xl md:text-7xl font-bold leading-tight name-gradient">
          {personal.displayName}.
        </motion.h1>

        <motion.h2 variants={item} className="text-4xl md:text-6xl font-bold text-zinc-500 mt-2 leading-tight">
          <span className="text-zinc-300">{typed}</span>
          <span className="animate-pulse text-emerald-400 ml-0.5">|</span>
          {" "}Engineer.
        </motion.h2>

        <motion.p variants={item} className="mt-6 max-w-xl text-zinc-400 text-lg leading-relaxed">
          I build high-performance distributed systems, real-time C++ applications, and full-stack
          web platforms. Currently at{" "}
          <span className="text-zinc-200 font-medium">Goldman Sachs</span>, shipping scalable data
          pipelines and SRE tooling.
        </motion.p>

        <motion.div variants={item} className="mt-4 flex items-center gap-2 text-zinc-500 text-sm">
          <MapPin size={14} className="text-emerald-400" />
          <span>{personal.location}</span>
          <span className="mx-2">·</span>
          <Mail size={14} className="text-emerald-400" />
          <a
            href={`mailto:${personal.email}`}
            className="hover:text-zinc-300 transition-colors"
          >
            {personal.email}
          </a>
        </motion.div>

        <motion.div variants={item} className="mt-10 flex flex-wrap gap-4">
          <a
            href="#experience"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-6 py-3 rounded transition-colors"
          >
            View My Work
            <ArrowDown size={16} />
          </a>
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:text-zinc-100 font-medium px-6 py-3 rounded transition-colors"
          >
            Download Resume
            <Download size={16} />
          </a>
        </motion.div>

      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="mt-24 flex justify-start"
      >
        <div className="flex flex-col items-center gap-2 text-zinc-600">
          <span className="text-xs tracking-widest rotate-90 mb-2">scroll</span>
          <div className="w-px h-16 bg-gradient-to-b from-zinc-600 to-transparent" />
        </div>
      </motion.div>
    </section>
  );
}
