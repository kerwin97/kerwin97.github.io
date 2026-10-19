import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import headshot from "url:../../assets/headshot.jpg";
import klLogo from "url:../../assets/logos/kl.png";
import { experience, personal } from "../../data/resume";

const CARD_W = 224;
const CARD_H = 405; // natural height of the badge at full size

// clipY is where the badge clip hangs at rest, measured from the top of the box.
const SIZE = {
  desktop: { scale: 1, boxW: 260, boxH: 460, clipY: 48, strap: 18, font: 9, drop: 260, swing: 70, drag: { left: -170, right: 110, top: -110, bottom: 150 } },
  mobile: { scale: 0.18, boxW: 60, boxH: 118, clipY: 30, strap: 4, font: 0, drop: 50, swing: 10, drag: { left: -25, right: 15, top: -15, bottom: 20 } },
};
const STRAP_TEXT = `${personal.displayName.toUpperCase()}  ✦  `.repeat(14);

// Deterministic bar widths so the barcode is stable between renders.
const BARS = Array.from("KERWINLIM97", (ch, i) => ((ch.charCodeAt(0) * (i + 3)) % 3) + 1);

// Desktop: the strap runs up to the top of the page beside the intro.
// Mobile: it hangs from a pin at the top of its own box, below the intro.
export function Lanyard({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const mobile = variant === "mobile";
  const size = SIZE[variant];
  const { clipY, boxW } = size;
  const boxRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Distance from the top of the page to this box: the strap is anchored at the page's top edge.
  const lift = useMotionValue(mobile ? 0 : 400);
  const inView = useInView(boxRef, { once: true, amount: 0.3 });

  useLayoutEffect(() => {
    if (mobile) return;
    const measure = () => {
      if (boxRef.current) lift.set(boxRef.current.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [lift, mobile]);

  useEffect(() => {
    if (reduceMotion || !inView) return;
    const drop = animate(y, 0, { from: -size.drop, type: "spring", stiffness: 110, damping: 11 });
    const swing = animate(x, 0, { from: size.swing, type: "spring", stiffness: 35, damping: 3.5 });
    return () => {
      drop.stop();
      swing.stop();
    };
  }, [reduceMotion, inView, x, y, size.drop, size.swing]);

  const cx = boxW / 2;
  // The badge hangs along the strap, so it tilts by the strap's angle from vertical.
  // The strap can't hang above its anchor (e.g. mid drop-in), so keep the vertical span positive to avoid flipping the badge.
  const rotate = useTransform(() => (-Math.atan2(x.get(), Math.max(40, lift.get() + clipY + y.get())) * 180) / Math.PI);
  const strap = useTransform(() => `M ${cx} ${-lift.get()} L ${cx + x.get()} ${clipY + y.get()}`);

  // Scrolling kicks the badge sideways in proportion to scroll speed; it then swings back like a pendulum.
  const dragging = useRef(false);
  useEffect(() => {
    if (reduceMotion) return;
    let lastY = window.scrollY;
    let lastT = performance.now();
    const maxV = 280 * size.scale;
    const onScroll = () => {
      const now = performance.now();
      const dy = window.scrollY - lastY;
      const dt = Math.max(16, now - lastT);
      lastY = window.scrollY;
      lastT = now;
      const box = boxRef.current?.getBoundingClientRect();
      if (dragging.current || !box || box.bottom < 0 || box.top > window.innerHeight) return;
      const kick = Math.max(-1, Math.min(1, dy / dt)) * 180 * size.scale;
      const velocity = Math.max(-maxV, Math.min(maxV, x.getVelocity() + kick));
      animate(x, 0, { type: "spring", stiffness: 35, damping: 6, velocity });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduceMotion, x, size.scale]);

  const role = experience[0];

  return (
    <div
      ref={boxRef}
      className={`relative shrink-0 ${mobile ? "lg:hidden" : "hidden lg:block"}`}
      style={{ width: boxW, height: size.boxH }}
    >
      <svg className="absolute left-0 top-0 overflow-visible pointer-events-none" width={boxW} height={1} aria-hidden="true">
        <motion.path id={`lanyard-strap-${variant}`} d={strap} stroke="#2563eb" strokeWidth={size.strap} strokeLinecap="round" fill="none" />
        {size.font > 0 && <text fontSize={size.font} fontWeight={700} letterSpacing={2} fill="#ffffff" dy={size.font / 3} fontFamily="JetBrains Mono, monospace">
          <textPath href={`#lanyard-strap-${variant}`} startOffset="0">
            {STRAP_TEXT}
          </textPath>
        </text>}
        {mobile && <circle cx={cx} cy={0} r={size.strap / 2 + 1.5} fill="#a1a1aa" stroke="#71717a" strokeWidth={1.5} />}
      </svg>

      <motion.div
        role="img"
        aria-label={`ID badge: ${personal.displayName}, ${role.role} at ${role.company}. Drag to swing it.`}
        title="Drag me"
        className="absolute select-none touch-none cursor-grab active:cursor-grabbing"
        style={{
          left: (boxW - CARD_W * size.scale) / 2,
          top: clipY,
          width: CARD_W * size.scale,
          height: CARD_H * size.scale,
          x,
          y,
          rotate,
          originX: 0.5,
          originY: 0,
        }}
        drag
        dragSnapToOrigin
        dragElastic={0.2}
        dragConstraints={size.drag}
        dragTransition={{ bounceStiffness: 80, bounceDamping: 5 }}
        onDragStart={() => (dragging.current = true)}
        onDragEnd={() => (dragging.current = false)}
      >
        <div className="relative" style={{ width: CARD_W, transform: `scale(${size.scale})`, transformOrigin: "top left" }}>
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
        </div>
      </motion.div>
    </div>
  );
}
