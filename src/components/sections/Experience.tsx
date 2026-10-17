import { useState, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, ChevronDown, Play } from "lucide-react";
import { experience } from "../../data/resume";
import { SectionTitle } from "../ui/SectionTitle";
import { PixelFarm } from "../ui/PixelFarm";
import { useInView } from "../../hooks/useInView";

import ksLogo from "url:../../assets/logos/ks.jpg";
import gsLogo from "url:../../assets/logos/gs.jpg";
import gwsLogo from "url:../../assets/logos/gws.jpg";
import gullieLogo from "url:../../assets/logos/gullie.png";

const BonderDemo = lazy(() => import("../bonder/BonderDemo").then((m) => ({ default: m.BonderDemo })));
const TradeSimulator = lazy(() =>
  import("../trading/TradeSimulator").then((m) => ({ default: m.TradeSimulator }))
);

interface LogoConfig {
  src: string;
  bg: string;
}

const COMPANY_LOGOS: Record<string, LogoConfig> = {
  "Goldman Sachs":   { src: gsLogo,  bg: "bg-[#6e8faf]" },
  "Kulicke & Soffa": { src: ksLogo,  bg: "bg-zinc-900"  },
  "GWS":             { src: gwsLogo, bg: "bg-white"      },
  "Gullie":          { src: gullieLogo, bg: "bg-white"   },
};

const PREVIEW_COUNT = 2;

function CompanyLogo({ company }: { company: string }) {
  const config = COMPANY_LOGOS[company];
  if (config) {
    return (
      <div className={`w-9 h-9 rounded-md ${config.bg} flex items-center justify-center p-1 shrink-0`}>
        <img src={config.src} alt={company} loading="lazy" className="w-full h-full object-contain" />
      </div>
    );
  }
  const initials = company.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  return (
    <div className="w-9 h-9 rounded-md bg-zinc-700 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold font-mono text-zinc-200 tracking-wide">{initials}</span>
    </div>
  );
}

function ExperienceCard({ job, index }: { job: (typeof experience)[0]; index: number }) {
  const { ref, inView } = useInView(0.1);
  const [expanded, setExpanded] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const hasMore = job.bullets.length > PREVIEW_COUNT;
  const visibleBullets = expanded ? job.bullets : job.bullets.slice(0, PREVIEW_COUNT);

  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      initial={{ opacity: 0, x: -24 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      className="relative pl-8 pb-12 last:pb-0"
    >
      <div className="absolute left-0 top-2 bottom-0 w-px bg-zinc-800" />
      <div className="absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-zinc-950" />

      <div className={`relative bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors ${job.farm ? "pb-16" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-zinc-100 font-semibold text-lg">{job.role}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <CompanyLogo company={job.company} />
              <p className="text-emerald-400 font-medium text-sm">{job.company}</p>
            </div>
          </div>
          <span className="font-mono text-zinc-500 text-xs bg-zinc-800 px-3 py-1 rounded-full whitespace-nowrap">
            {job.period}
          </span>
        </div>

        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {visibleBullets.map((bullet, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex gap-3 text-zinc-400 text-sm leading-relaxed overflow-hidden"
              >
                <span className="text-emerald-400 mt-1 shrink-0">▹</span>
                <span>{bullet}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {hasMore && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors font-medium"
          >
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={14} />
            </motion.span>
            {expanded ? "Show less" : `Show ${job.bullets.length - PREVIEW_COUNT} more`}
          </button>
        )}

        {job.demo && (
          <div className="mt-5 pt-4 border-t border-zinc-800 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setDemoOpen(true)}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded transition-colors"
            >
              <Play size={14} /> Try it out!
            </button>
            <p className="text-xs text-zinc-500">
              {job.demo === "tradePipeline"
                ? "Book FICC trades through a simulated RabbitMQ pipeline and watch risk and P&L update live."
                : "Run a simulated ball bonder: set up a job on the computer, then watch it bond under the microscope."}
            </p>
          </div>
        )}
        {job.farm && <PixelFarm />}
      </div>
      {demoOpen && (
        <Suspense fallback={null}>
          {job.demo === "ballBonder" ? <BonderDemo onClose={() => setDemoOpen(false)} /> : <TradeSimulator onClose={() => setDemoOpen(false)} />}
        </Suspense>
      )}
    </motion.div>
  );
}

export function Experience() {
  return (
    <section id="experience" className="max-w-5xl mx-auto px-6 py-24">
      <SectionTitle>
        <Briefcase size={24} className="text-emerald-400" />
        Experience
      </SectionTitle>
      <div>
        {experience.map((job, i) => (
          <ExperienceCard key={job.company} job={job} index={i} />
        ))}
      </div>
    </section>
  );
}
