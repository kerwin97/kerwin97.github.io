import { useState } from "react";
import { motion } from "framer-motion";
import { Code2 } from "lucide-react";
import { skills } from "../../data/resume";
import { SectionTitle } from "../ui/SectionTitle";
import { useInView } from "../../hooks/useInView";

// Full class strings so Tailwind can see them at build time.
const PALETTE = [
  { dot: "bg-emerald-400", label: "text-emerald-400 border-emerald-500/50 bg-emerald-500/15", badge: "text-emerald-400 border-emerald-500/60 bg-emerald-500/15" },
  { dot: "bg-blue-400", label: "text-blue-400 border-blue-500/50 bg-blue-500/15", badge: "text-blue-400 border-blue-500/60 bg-blue-500/15" },
  { dot: "bg-amber-400", label: "text-amber-400 border-amber-500/50 bg-amber-500/15", badge: "text-amber-400 border-amber-500/60 bg-amber-500/15" },
  { dot: "bg-violet-400", label: "text-violet-400 border-violet-500/50 bg-violet-500/15", badge: "text-violet-400 border-violet-500/60 bg-violet-500/15" },
];

const allSkills = skills.flatMap((g, gi) => g.items.map((item) => ({ item, group: gi })));

export function Skills() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [tapped, setTapped] = useState<number | null>(null);
  const active = hovered ?? tapped;
  const { ref, inView } = useInView(0.1);

  return (
    <section id="skills" className="max-w-5xl mx-auto px-6 py-24">
      <SectionTitle>
        <Code2 size={24} className="text-emerald-400" />
        Skills
      </SectionTitle>

      <motion.div
        ref={ref as React.RefObject<HTMLDivElement>}
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <p className="text-zinc-500 text-sm mb-4">Hover a category to see where each skill fits.</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {skills.map((g, gi) => (
            <span
              key={g.category}
              onMouseEnter={() => setHovered(gi)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setTapped((t) => (t === gi ? null : gi))}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border select-none transition-colors duration-200 ${
                active === gi ? PALETTE[gi].label : "bg-zinc-800 text-zinc-400 border-transparent"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${PALETTE[gi].dot}`} />
              {g.category}
            </span>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex flex-wrap gap-2">
            {allSkills.map(({ item, group }) => {
              const lit = active === group;
              const dimmed = active !== null && !lit;
              return (
                <motion.span
                  key={item}
                  animate={{ opacity: dimmed ? 0.3 : 1, scale: lit ? 1.06 : 1 }}
                  transition={{ duration: 0.2 }}
                  className={`inline-block border text-xs px-2.5 py-0.5 rounded-full font-mono cursor-default transition-colors duration-200 ${
                    lit ? PALETTE[group].badge : "border-zinc-600 text-zinc-300"
                  }`}
                >
                  {item}
                </motion.span>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
