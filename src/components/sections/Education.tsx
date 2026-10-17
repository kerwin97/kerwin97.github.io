import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GraduationCap, ChevronDown } from "lucide-react";
import { education, additional } from "../../data/resume";
import { SectionTitle } from "../ui/SectionTitle";
import { useInView } from "../../hooks/useInView";

const COURSEWORK = [
  "CS2040S — Data Structures & Algorithms",
  "CS3230 — Design & Analysis of Algorithms",
  "CS2106 — Introduction to Operating Systems",
  "CS3223 — Database Systems Implementation",
  "CS3244 — Machine Learning",
  "CS4225 — Big Data Analytics for Data Science",
  "CS3247 — Game Development",
  "CS3240 — Interaction Design",
];

export function Education() {
  const { ref, inView } = useInView(0.1);
  const [courseworkOpen, setCourseworkOpen] = useState(false);

  return (
    <section id="education" className="max-w-5xl mx-auto px-6 py-24">
      <SectionTitle>
        <GraduationCap size={24} className="text-emerald-400" />
        Education
      </SectionTitle>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="grid gap-6"
      >
        {education.map((edu, i) => (
          <motion.div
            key={edu.institution}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
              <div>
                <h3 className="text-zinc-100 font-semibold text-lg">{edu.institution}</h3>
                <p className="text-emerald-400 text-sm mt-1">{edu.degree}</p>
              </div>
              <span className="font-mono text-zinc-500 text-xs bg-zinc-800 px-3 py-1 rounded-full">
                {edu.period}
              </span>
            </div>

            {/* Relevant Coursework Accordion */}
            <div className="border-t border-zinc-800 pt-4">
              <button
                onClick={() => setCourseworkOpen((o) => !o)}
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors w-full text-left font-medium"
              >
                <motion.span
                  animate={{ rotate: courseworkOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={15} />
                </motion.span>
                Relevant Coursework
              </button>

              <AnimatePresence initial={false}>
                {courseworkOpen && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5"
                  >
                    {COURSEWORK.map((module) => (
                      <li key={module} className="flex gap-2 text-zinc-400 text-xs">
                        <span className="text-emerald-400 shrink-0 mt-0.5">▹</span>
                        {module}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
        >
          <h3 className="text-zinc-300 font-semibold text-sm uppercase tracking-wider mb-4">
            Additional
          </h3>
          <ul className="space-y-2">
            {additional.map((item, i) => (
              <li key={i} className="flex gap-3 text-zinc-400 text-sm">
                <span className="text-emerald-400 shrink-0">▹</span>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
