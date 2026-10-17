import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cpu, Focus, Microscope as MicroscopeIcon, Monitor, ZoomIn } from "lucide-react";
import { DemoModal } from "../ui/DemoModal";
import { BonderEngine } from "./engine";
import { Console, StackLight } from "./Console";
import { Microscope } from "./Microscope";
import { PROGRAMS } from "./programs";

type View = "computer" | "microscope";

export function BonderDemo({ onClose }: { onClose: () => void }) {
  const engineRef = useRef<BonderEngine | null>(null);
  if (!engineRef.current) engineRef.current = new BonderEngine(PROGRAMS[0]);
  const engine = engineRef.current;
  const [view, setView] = useState<View>("computer");
  const [focus, setFocus] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [, setFrame] = useState(0);
  const rerender = () => setFrame((n) => n + 1);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      engineRef.current!.step(Math.min(now - last, 50));
      last = now;
      rerender();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const s = engine.status;
  const banner =
    view === "computer" && s === "running"
      ? { tone: "info", text: "Bonding in progress. Look into the microscope to watch it.", to: "microscope" as View }
      : view === "microscope" && s === "alarm"
        ? { tone: "alarm", text: `Machine stopped: ${engine.alarm?.code} ${engine.alarm?.message}. Check the computer.`, to: "computer" as View }
        : view === "microscope" && (s === "done" || s === "aborted")
          ? { tone: "info", text: `Lot ${s === "done" ? "complete" : "aborted"}. The bond data is on the computer.`, to: "computer" as View }
          : view === "microscope" && s === "setup"
            ? { tone: "info", text: "The machine is idle. Set up a job on the computer and press Start.", to: "computer" as View }
            : null;

  return (
    <DemoModal
      titleId="bonder-title"
      onClose={onClose}
      title={
        <>
          <Cpu size={18} className="text-emerald-400" /> Ball bonder: operator's view
        </>
      }
      description={
        <>
          A simulated thermosonic ball bonder. On the computer, pick a bond program, choose die (wire bonding) or wafer (stud
          bumping), set how many bonds and tune the process parameters. Then look into the microscope to watch each ball bond,
          loop and stitch. Push settings outside their process window or inject a fault to see non-sticks and other failures.
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-zinc-700 p-1" role="tablist" aria-label="Where you're looking">
          {(
            [
              ["computer", "Computer", Monitor],
              ["microscope", "Microscope", MicroscopeIcon],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                view === v ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="uppercase tracking-wider">{s}</span>
          <StackLight status={s} />
        </div>
      </div>

      {banner && (
        <button
          onClick={() => setView(banner.to)}
          className={`w-full text-left rounded-md border px-4 py-2.5 text-sm transition-colors ${
            banner.tone === "alarm"
              ? "border-red-500/60 bg-red-500/15 text-red-400 animate-pulse"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          }`}
        >
          {banner.text} →
        </button>
      )}

      <AnimatePresence mode="wait">
        {view === "computer" ? (
          <motion.div key="computer" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <Console engine={engine} rerender={rerender} onLook={() => setView("microscope")} />
          </motion.div>
        ) : (
          <motion.div
            key="microscope"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-[minmax(0,1fr)_220px] gap-4 items-start"
          >
            <div className="mx-auto w-full max-w-[560px] rounded-full bg-black p-2">
              <Microscope engine={engine} focus={focus} zoom={zoom} />
            </div>
            <div className="space-y-4 text-sm">
              <label className="block">
                <span className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Focus size={14} /> Focus
                  </span>
                  <button onClick={() => setFocus(50)} className="text-xs text-emerald-400 hover:underline">
                    Auto-focus
                  </button>
                </span>
                <input type="range" min={0} max={100} value={focus} onChange={(ev) => setFocus(Number(ev.target.value))} className="w-full accent-emerald-500" />
              </label>
              <div>
                <span className="flex items-center gap-1.5 text-zinc-400 mb-1">
                  <ZoomIn size={14} /> Magnification
                </span>
                <div className="flex rounded-md border border-zinc-700 overflow-hidden">
                  {[1, 3].map((z) => (
                    <button
                      key={z}
                      onClick={() => setZoom(z)}
                      aria-pressed={zoom === z}
                      className={`flex-1 py-1.5 text-xs font-medium ${zoom === z ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"}`}
                    >
                      {z === 1 ? "50× overview" : "150× follow tip"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400 space-y-1.5 leading-relaxed">
                <p className="text-zinc-200 font-medium">What you're seeing</p>
                <p>The ring is the capillary tip. Its shadow closes in as it descends onto the surface.</p>
                <p>Blue ripples are the ultrasonic energy welding the ball or stitch. The flash is the EFO spark melting the wire tail into the next ball.</p>
                <p>
                  <span className="text-red-400">Red ✕</span> is a non-stick, a <span className="text-red-400">red ring</span> a cratered pad, an{" "}
                  <span className="text-amber-400">amber ring</span> a weak ball that fails shear.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DemoModal>
  );
}
