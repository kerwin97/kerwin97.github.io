import { useState } from "react";
import { motion } from "framer-motion";
import { Code2 } from "lucide-react";
import { skills } from "../../data/resume";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { useInView } from "../../hooks/useInView";

const allSkills = skills.flatMap((g) => g.items.map((item) => ({ item, category: g.category })));

export function Skills() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tapped, setTapped] = useState<string | null>(null);
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
          {skills.map((g) => (
            <span
              key={g.category}
              onMouseEnter={() => setHovered(g.category)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setTapped((t) => (t === g.category ? null : g.category))}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border select-none transition-colors duration-200 ${
                active === g.category
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                  : "bg-zinc-800 text-zinc-400 border-transparent"
              }`}
            >
              {g.category}
            </span>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex flex-wrap gap-2">
            {allSkills.map(({ item, category }) => {
              const lit = active === category;
              const dimmed = active !== null && !lit;
              return (
                <motion.span
                  key={item}
                  animate={{ opacity: dimmed ? 0.25 : 1, scale: lit ? 1.08 : 1 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-full ${lit ? "ring-1 ring-emerald-500/60" : ""}`}
                >
                  <Badge variant="outline">{item}</Badge>
                </motion.span>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
