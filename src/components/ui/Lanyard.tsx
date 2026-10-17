import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import headshot from "url:../../assets/headshot.jpg";
import klLogo from "url:../../assets/logos/kl.png";
import { experience, personal } from "../../data/resume";

const BOX_W = 260;
const CARD_W = 224;
const CLIP_Y = 48; // where the badge clip hangs at rest, measured from the top of this box
const STRAP_TEXT = `${personal.displayName.toUpperCase()}  ✦  `.repeat(14);

// Deterministic bar widths so the barcode is stable between renders.
const BARS = Array.from("KERWINLIM97", (ch, i) => ((ch.charCodeAt(0) * (i + 3)) % 3) + 1);

export function Lanyard() {
  const boxRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Distance from the top of the page to this box: the strap is anchored at the page's top edge.
  const lift = useMotionValue(400);

  useLayoutEffect(() => {
    const measure = () => {
      if (boxRef.current) lift.set(boxRef.current.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [lift]);

  useEffect(() => {
    if (reduceMotion) return;
    const drop = animate(y, 0, { from: -260, type: "spring", stiffness: 110, damping: 11 });
    const swing = animate(x, 0, { from: 70, type: "spring", stiffness: 35, damping: 3.5 });
    return () => {
      drop.stop();
      swing.stop();
    };
  }, [reduceMotion, x, y]);

  const cx = BOX_W / 2;
  // The badge hangs along the strap, so it tilts by the strap's angle from vertical.
  const rotate = useTransform(() => (-Math.atan2(x.get(), lift.get() + CLIP_Y + y.get()) * 180) / Math.PI);
  const strap = useTransform(() => `M ${cx} ${-lift.get()} L ${cx + x.get()} ${CLIP_Y + y.get()}`);

  const role = experience[0];

  return (
    <div ref={boxRef} className="relative hidden lg:block h-[460px]" style={{ width: BOX_W }}>
      <svg className="absolute left-0 top-0 overflow-visible pointer-events-none" width={BOX_W} height={1} aria-hidden="true">
        <motion.path id="lanyard-strap" d={strap} stroke="#2563eb" strokeWidth={18} strokeLinecap="round" fill="none" />
        <text fontSize={9} fontWeight={700} letterSpacing={2} fill="#ffffff" dy={3} fontFamily="JetBrains Mono, monospace">
          <textPath href="#lanyard-strap" startOffset="0">
            {STRAP_TEXT}
          </textPath>
        </text>
      </svg>

      <motion.div
        role="img"
        aria-label={`ID badge: ${personal.displayName}, ${role.role} at ${role.company}. Drag to swing it.`}
        title="Drag me"
        className="absolute select-none touch-none cursor-grab active:cursor-grabbing"
        style={{ left: (BOX_W - CARD_W) / 2, top: CLIP_Y, width: CARD_W, x, y, rotate, originX: 0.5, originY: 0 }}
        drag
        dragSnapToOrigin
        dragElastic={0.2}
        dragConstraints={{ left: -170, right: 110, top: -110, bottom: 150 }}
        dragTransition={{ bounceStiffness: 80, bounceDamping: 5 }}
      >
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 w-7 h-9 rounded-md bg-[#d4d4d8] border border-[#a1a1aa]">
          <div className="mx-auto mt-1.5 w-3 h-3 rounded-full border-2 border-[#71717a]" />
        </div>

        <div className="relative rounded-2xl bg-white shadow-2xl shadow-black/30 overflow-hidden border border-black/10">
          <div className="relative h-16 bg-[#2563eb] flex items-end justify-between px-4 pb-2.5">
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-2.5 rounded-full bg-[#1e3a8a]" />
            <img src={klLogo} alt="" draggable={false} className="h-6 w-auto brightness-0 invert" />
            <span className="text-[10px] font-mono font-semibold tracking-[0.2em] text-white/85">ENGINEERING</span>
          </div>

          <div className="px-5 pt-4 pb-5 text-center">
            <img
              src={headshot}
              alt={personal.displayName}
              draggable={false}
              className="w-32 h-40 object-cover rounded-lg mx-auto border border-black/10"
            />
            <p className="mt-3 text-lg font-bold leading-tight text-[#18181b]">{personal.displayName}</p>
            <p className="text-xs text-[#52525b] mt-0.5">{role.role}</p>
            <p className="text-[11px] text-[#71717a]">
              {role.company} · {personal.location}
            </p>

            <div className="mt-4 flex items-end justify-center gap-[2px] h-8" aria-hidden="true">
              {BARS.flatMap((w, i) => [w, ((w + i) % 2) + 1]).map((w, i) => (
                <span key={i} className="bg-[#18181b] h-full" style={{ width: w + 1 }} />
              ))}
            </div>
            <p className="mt-1 text-[10px] font-mono tracking-widest text-[#71717a]">KL-0097</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
