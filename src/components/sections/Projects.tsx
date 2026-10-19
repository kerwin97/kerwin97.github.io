import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { FolderGit2 } from "lucide-react";
import { projects } from "../../data/resume";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";

// Vertical scroll distance spent on each card's horizontal slide.
const SCROLL_PER_CARD_VH = 75;

const ART = [
  "bg-emerald-500 text-zinc-950",
  "bg-zinc-100 text-zinc-950",
  "bg-zinc-800 text-emerald-400",
];

const initials = (name: string) =>
  name
    .split(/(?=[A-Z])|\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function ProjectCard({ project, i }: { project: (typeof projects)[0]; i: number }) {
  return (
    <article className="shrink-0 w-[min(85vw,820px)] min-h-[400px] h-[min(62vh,520px)] grid md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 snap-center">
      <div className="p-7 md:p-10 flex flex-col">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          {String(i + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")} · {project.context} · {project.period}
        </p>
        <h3 className="mt-4 text-4xl md:text-5xl font-bold text-zinc-100 leading-none">{project.name}</h3>
        <ul className="mt-6 space-y-2 flex-1">
          {project.bullets.map((bullet, bi) => (
            <li key={bi} className="flex gap-2 text-zinc-400 text-sm leading-relaxed">
              <span className="text-emerald-400 shrink-0 mt-0.5">▹</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-1.5 pt-5 mt-6 border-t border-zinc-800">
          {project.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <div
        aria-hidden="true"
        className={`hidden md:grid place-items-center text-[9rem] font-bold leading-none tracking-tighter select-none ${ART[i % ART.length]}`}
      >
        {initials(project.name)}
      </div>
    </article>
  );
}

// Lines the track up with the 64rem content column while letting cards run to the screen edge.
const gutter = "px-6 md:px-[max(1.5rem,calc((100vw_-_64rem)/2_+_1.5rem))]";

export function Projects() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;
      const range = section.offsetHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, (window.scrollY - section.offsetTop) / range));
      const distance = track.scrollWidth - window.innerWidth;
      track.style.transform = `translate3d(${-progress * Math.max(0, distance)}px, 0, 0)`;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduceMotion]);

  const title = (
    <div className="max-w-5xl mx-auto px-6">
      <SectionTitle>
        <FolderGit2 size={24} className="text-emerald-400" />
        Projects
      </SectionTitle>
    </div>
  );

  if (reduceMotion) {
    return (
      <section id="projects" className="py-24">
        {title}
        <div className={`flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 ${gutter}`}>
          {projects.map((p, i) => (
            <ProjectCard key={p.name} project={p} i={i} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="relative"
      style={{ height: `${100 + (projects.length - 1) * SCROLL_PER_CARD_VH}vh` }}
    >
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center pt-16">
        {title}
        <div ref={trackRef} className={`flex gap-6 w-max will-change-transform ${gutter}`}>
          {projects.map((p, i) => (
            <ProjectCard key={p.name} project={p} i={i} />
          ))}
        </div>
        <div className="max-w-5xl w-full mx-auto px-6 mt-8">
          <div className="h-px bg-zinc-800">
            <div ref={barRef} className="h-full bg-emerald-400 origin-left" style={{ transform: "scaleX(0)" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
