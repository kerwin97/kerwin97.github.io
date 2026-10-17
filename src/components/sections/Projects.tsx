import { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, animate } from "framer-motion";
import { FolderGit2, ChevronLeft, ChevronRight } from "lucide-react";
import { projects } from "../../data/resume";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { useInView } from "../../hooks/useInView";

const CARD_WIDTH = 304; // 288px card + 16px gap
const total = projects.length;

// Three copies so a real card always sits on both sides of the one in view.
// Resting positions are kept inside the middle copy (indices total … 2*total-1).
const extended = [...projects, ...projects, ...projects];
const SLIDE = { duration: 0.35, ease: "easeOut" } as const;

const toMiddle = (i: number) => total + (((i % total) + total) % total);

const TILT = 8; // max degrees

function ProjectCard({ project }: { project: (typeof projects)[0] }) {
  const rotateX = useSpring(0, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 200, damping: 20 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons) return;
    const r = e.currentTarget.getBoundingClientRect();
    rotateY.set(((e.clientX - r.left) / r.width - 0.5) * 2 * TILT);
    rotateX.set(-((e.clientY - r.top) / r.height - 0.5) * 2 * TILT);
  };
  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className="w-72 shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 transition-colors select-none"
      style={{ marginRight: "16px", rotateX, rotateY, transformPerspective: 800 }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-zinc-100 font-semibold">{project.name}</h3>
          <p className="text-zinc-500 text-xs mt-0.5">
            {project.context} · {project.period}
          </p>
        </div>
        <FolderGit2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
      </div>
      <ul className="space-y-2 mb-4">
        {project.bullets.map((bullet, i) => (
          <li key={i} className="flex gap-2 text-zinc-400 text-sm leading-relaxed">
            <span className="text-emerald-400 shrink-0 mt-0.5">▹</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-zinc-800">
        {project.tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>
    </motion.div>
  );
}

export function Projects() {
  const [internalIdx, setInternalIdx] = useState(total);
  const idxRef = useRef(total);
  const controls = useRef<ReturnType<typeof animate> | null>(null);
  const x = useMotionValue(-total * CARD_WIDTH);
  const { ref, inView } = useInView(0.1);

  const activeDot = internalIdx % total;

  function goTo(target: number) {
    controls.current?.stop();

    // Shift back into the middle copy before moving; the copies are identical so the jump is invisible.
    const shift = toMiddle(idxRef.current) - idxRef.current;
    if (shift !== 0) {
      x.set(x.get() - shift * CARD_WIDTH);
      idxRef.current += shift;
      target += shift;
    }

    idxRef.current = target;
    setInternalIdx(target);
    controls.current = animate(x, -target * CARD_WIDTH, {
      ...SLIDE,
      onComplete: () => {
        const settled = toMiddle(target);
        if (settled !== target && idxRef.current === target) {
          x.set(-settled * CARD_WIDTH);
          idxRef.current = settled;
          setInternalIdx(settled);
        }
      },
    });
  }

  const prev = () => goTo(idxRef.current - 1);
  const next = () => goTo(idxRef.current + 1);

  const dragStartX = useRef(0);

  return (
    <section id="projects" className="max-w-5xl mx-auto px-6 py-24">
      <SectionTitle>
        <FolderGit2 size={24} className="text-emerald-400" />
        Projects
      </SectionTitle>

      <motion.div
        ref={ref as React.RefObject<HTMLDivElement>}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        {/* Carousel container */}
        <div className="relative">
          {/* Prev button */}
          <button
            onClick={prev}
            aria-label="Previous project"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 hover:bg-zinc-700 hover:border-zinc-500 transition-all duration-200"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Track wrapper — clips overflow */}
          <div className="overflow-hidden rounded-lg">
            <motion.div
              className="flex"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.05}
              onDragStart={(_, info) => {
                dragStartX.current = info.point.x;
              }}
              onDragEnd={(_, info) => {
                const delta = info.point.x - dragStartX.current;
                if (delta < -50) next();
                else if (delta > 50) prev();
                else {
                  // Snap back
                  goTo(idxRef.current);
                }
              }}
              style={{ x, cursor: "grab" }}
              whileDrag={{ cursor: "grabbing" }}
            >
              {extended.map((project, i) => (
                <ProjectCard key={i} project={project} />
              ))}
              {/* Trailing spacer */}
              <div className="w-6 shrink-0" />
            </motion.div>
          </div>

          {/* Next button */}
          <button
            onClick={next}
            aria-label="Next project"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 hover:bg-zinc-700 hover:border-zinc-500 transition-all duration-200"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2.5 mt-6">
          {projects.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(idxRef.current - activeDot + i)}
              aria-label={`Go to project ${i + 1}`}
              className={`rounded-full transition-all duration-200 ${
                i === activeDot
                  ? "w-5 h-2 bg-emerald-400"
                  : "w-2 h-2 bg-zinc-600 hover:bg-zinc-400"
              }`}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
