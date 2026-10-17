import { PHASE_LABEL, type BondRecord, type BonderEngine } from "./engine";
import { VIEW, type Point, type Site } from "./programs";

const UM_PER_PX = 5;
const R = 288; // eyepiece radius
const C = VIEW / 2;

const WIRE_COLOR = { Au: "#f2c14e", Cu: "#e07b39" };
const WIRE_DARK = { Au: "#b8860b", Cu: "#9a4a1c" };

function leadFinger(site: Site, gold: boolean) {
  if (!site.lead) return null;
  const dx = site.lead.x - C;
  const dy = site.lead.y - C;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const angle = (Math.atan2(uy, ux) * 180) / Math.PI;
  return (
    <rect
      x={site.lead.x - 10 * ux - 6}
      y={site.lead.y - 10 * uy - 7}
      width={110}
      height={14}
      rx={2}
      fill={gold ? "#c9a227" : "#c9ccd1"}
      transform={`rotate(${angle} ${site.lead.x - 10 * ux} ${site.lead.y - 10 * uy})`}
    />
  );
}

function Ball({ at, um, wire }: { at: Point; um: number; wire: "Au" | "Cu" }) {
  return <circle cx={at.x} cy={at.y} r={um / 2 / UM_PER_PX} fill={WIRE_COLOR[wire]} stroke={WIRE_DARK[wire]} strokeWidth={0.8} />;
}

function Stitch({ at, from, wire }: { at: Point; from: Point; wire: "Au" | "Cu" }) {
  const angle = (Math.atan2(at.y - from.y, at.x - from.x) * 180) / Math.PI;
  return (
    <ellipse cx={at.x} cy={at.y} rx={7} ry={4} fill={WIRE_COLOR[wire]} stroke={WIRE_DARK[wire]} strokeWidth={0.8} transform={`rotate(${angle} ${at.x} ${at.y})`} />
  );
}

function FailMark({ at, color }: { at: Point; color: string }) {
  return (
    <g stroke={color} strokeWidth={2.2} strokeLinecap="round">
      <line x1={at.x - 7} y1={at.y - 7} x2={at.x + 7} y2={at.y + 7} />
      <line x1={at.x + 7} y1={at.y - 7} x2={at.x - 7} y2={at.y + 7} />
    </g>
  );
}

function CompletedBond({ r, site, wire, die }: { r: BondRecord; site: Site; wire: "Au" | "Cu"; die: boolean }) {
  const lead = site.lead;
  if (r.outcome === "NSOP" || r.outcome === "SHORT_TAIL") {
    return <FailMark at={site.pad} color="#ef4444" />;
  }
  if (r.outcome === "NSOL" && lead) {
    const end = { x: site.pad.x + (lead.x - site.pad.x) * 0.75, y: site.pad.y + (lead.y - site.pad.y) * 0.75 };
    return (
      <g>
        <path d={`M ${site.pad.x} ${site.pad.y} L ${end.x} ${end.y} q 10 -4 6 -12`} stroke={WIRE_COLOR[wire]} strokeWidth={2} fill="none" />
        <Ball at={site.pad} um={r.ballUm ?? 45} wire={wire} />
        <FailMark at={lead} color="#ef4444" />
      </g>
    );
  }
  const ring = r.outcome === "CRATER" ? "#ef4444" : r.outcome === "LOW_SHEAR" ? "#f59e0b" : null;
  return (
    <g>
      {die && lead && (
        <>
          <line x1={site.pad.x} y1={site.pad.y} x2={lead.x} y2={lead.y} stroke={WIRE_COLOR[wire]} strokeWidth={2} />
          <Stitch at={lead} from={site.pad} wire={wire} />
        </>
      )}
      <Ball at={site.pad} um={r.ballUm ?? 45} wire={wire} />
      {!die && <line x1={site.pad.x} y1={site.pad.y} x2={site.pad.x + 3} y2={site.pad.y - 3} stroke={WIRE_DARK[wire]} strokeWidth={1.5} />}
      {ring && <circle cx={site.pad.x} cy={site.pad.y} r={10} fill="none" stroke={ring} strokeWidth={2} />}
    </g>
  );
}

interface Props {
  engine: BonderEngine;
  focus: number;
  zoom: number;
}

export function Microscope({ engine, focus, zoom }: Props) {
  const e = engine;
  const p = e.program;
  const die = e.mode === "die";
  const wire = p.wire;
  const site = e.site;
  const phase = e.phase;
  const idx = e.phases.indexOf(phase);
  const running = e.status === "running" || e.status === "alarm" || e.status === "paused";
  const failing = e.status === "alarm" ? e.alarm?.outcome : null;
  const blur = Math.abs(focus - 50) / 12;
  const gold = p.id.startsWith("BGA");

  const at = (ph: string) => idx >= e.phases.indexOf(ph as never);
  const ballDone = running && site && at("ball") && !(phase === "ball" && e.phaseT < 0.35) && failing !== "NSOP";
  const looping = running && site?.lead && phase === "loop";
  const wireDone = running && site?.lead && at("descend2") && failing !== "NSOL";
  const stitchDone = running && site?.lead && (at("lift") || (phase === "stitch" && e.phaseT > 0.5)) && failing !== "NSOL";
  const fabVisible = running && (phase === "move" || phase === "descend1") && failing !== "SHORT_TAIL";
  const ultrasonic = running && (phase === "ball" || phase === "stitch") && e.status === "running";
  const spark = running && phase === "efo" && e.status === "running";
  const zUm = Math.round(e.z * 300);

  const cx = Math.min(Math.max(e.cap.x, C - R / zoom / 1.2), C + R / zoom / 1.2);
  const cy = Math.min(Math.max(e.cap.y, C - R / zoom / 1.2), C + R / zoom / 1.2);
  const zoomTransform = zoom > 1 ? `translate(${C} ${C}) scale(${zoom}) translate(${-cx} ${-cy})` : undefined;
  const capR = 13 + e.z * 20;

  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="w-full h-auto select-none" role="img" aria-label="Microscope view of the bonding area">
      <defs>
        <clipPath id="eyepiece">
          <circle cx={C} cy={C} r={R} />
        </clipPath>
        <radialGradient id="vignette">
          <stop offset="70%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000" stopOpacity={0.85} />
        </radialGradient>
        <radialGradient id="spark">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#a5f3fc" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
        </radialGradient>
        <pattern id="circuit" width={18} height={18} patternUnits="userSpaceOnUse">
          <path d="M0 9 H9 V0 M9 18 V12 H18" stroke="#3d5278" strokeWidth={1} fill="none" />
        </pattern>
        <filter id="focus">
          <feGaussianBlur stdDeviation={blur} />
        </filter>
        <filter id="capBlur">
          <feGaussianBlur stdDeviation={e.z * 2.5 + blur} />
        </filter>
      </defs>

      <rect width={VIEW} height={VIEW} fill="#000" />
      <g clipPath="url(#eyepiece)">
        <g transform={zoomTransform}>
          <g filter={blur > 0.05 ? "url(#focus)" : undefined}>
            {die ? (
              <>
                <rect width={VIEW} height={VIEW} fill="#2b2620" />
                {e.layout.sites.map((s, i) => (
                  <g key={`lead-${i}`}>{leadFinger(s, gold)}</g>
                ))}
                {e.layout.dies.map((d, i) => (
                  <g key={i}>
                    <rect x={d.cx - d.half - 10} y={d.cy - d.half - 10} width={2 * d.half + 20} height={2 * d.half + 20} fill="#8a8f96" />
                    <rect x={d.cx - d.half} y={d.cy - d.half} width={2 * d.half} height={2 * d.half} fill="#2b3a55" />
                    <rect x={d.cx - d.half + 30} y={d.cy - d.half + 30} width={2 * d.half - 60} height={2 * d.half - 60} fill="url(#circuit)" opacity={0.8} />
                  </g>
                ))}
              </>
            ) : (
              <>
                <rect width={VIEW} height={VIEW} fill="#5b6b84" />
                {e.layout.dies.map((d, i) => (
                  <g key={i}>
                    <rect x={d.cx - d.half} y={d.cy - d.half} width={2 * d.half} height={2 * d.half} fill="#2b3a55" />
                    <rect x={d.cx - d.half + 26} y={d.cy - d.half + 26} width={2 * d.half - 52} height={2 * d.half - 52} fill="url(#circuit)" opacity={0.8} />
                  </g>
                ))}
              </>
            )}

            {e.layout.sites.map((s, i) => (
              <rect key={`pad-${i}`} x={s.pad.x - 6} y={s.pad.y - 6} width={12} height={12} fill={i < e.bondCount ? "#c4c8cf" : "#7d838c"} />
            ))}

            {e.records.map((r) => (
              <CompletedBond key={`${r.wire}-${r.site}`} r={r} site={e.layout.sites[r.site]} wire={wire} die={die} />
            ))}

            {site && running && (
              <g>
                {wireDone && <line x1={site.pad.x} y1={site.pad.y} x2={site.lead!.x} y2={site.lead!.y} stroke={WIRE_COLOR[wire]} strokeWidth={2} />}
                {looping && <line x1={site.pad.x} y1={site.pad.y} x2={e.cap.x} y2={e.cap.y} stroke={WIRE_COLOR[wire]} strokeWidth={2} />}
                {ballDone && <Ball at={site.pad} um={p.ballUm} wire={wire} />}
                {stitchDone && <Stitch at={site.lead!} from={site.pad} wire={wire} />}
                {failing === "NSOP" && <circle cx={site.pad.x} cy={site.pad.y} r={14} fill="none" stroke="#ef4444" strokeWidth={2.5} className="animate-pulse" />}
                {failing === "NSOL" && site.lead && (
                  <>
                    <line x1={site.pad.x} y1={site.pad.y} x2={site.lead.x} y2={site.lead.y} stroke={WIRE_COLOR[wire]} strokeWidth={2} strokeDasharray="4 3" />
                    <Ball at={site.pad} um={p.ballUm} wire={wire} />
                    <circle cx={site.lead.x} cy={site.lead.y} r={14} fill="none" stroke="#ef4444" strokeWidth={2.5} className="animate-pulse" />
                  </>
                )}
              </g>
            )}
          </g>

          {ultrasonic &&
            [0, 0.5].map((o) => {
              const t = (e.phaseT * 3 + o) % 1;
              return <circle key={o} cx={e.cap.x} cy={e.cap.y} r={10 + t * 26} fill="none" stroke="#7dd3fc" strokeWidth={1.5} opacity={1 - t} />;
            })}

          <circle cx={e.cap.x + e.z * 38} cy={e.cap.y + e.z * 38} r={capR} fill="#000" opacity={0.35} filter="url(#capBlur)" />
          <g filter="url(#capBlur)">
            {fabVisible && <circle cx={e.cap.x} cy={e.cap.y} r={p.wireUm * 0.9 / UM_PER_PX} fill={WIRE_COLOR[wire]} />}
            <circle cx={e.cap.x} cy={e.cap.y} r={capR} fill="none" stroke="#e7e5e4" strokeWidth={7} opacity={0.88} />
            <circle cx={e.cap.x} cy={e.cap.y} r={3} fill="#1c1917" />
          </g>

          {spark && (
            <g>
              <circle cx={e.cap.x} cy={e.cap.y} r={30 * Math.sin(Math.PI * e.phaseT)} fill="url(#spark)" />
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <line
                  key={a}
                  x1={e.cap.x}
                  y1={e.cap.y}
                  x2={e.cap.x + Math.cos((a * Math.PI) / 180) * 22 * Math.sin(Math.PI * e.phaseT)}
                  y2={e.cap.y + Math.sin((a * Math.PI) / 180) * 22 * Math.sin(Math.PI * e.phaseT)}
                  stroke="#e0f2fe"
                  strokeWidth={1.5}
                />
              ))}
            </g>
          )}
        </g>

        <g stroke="#ffffff" opacity={0.28} strokeWidth={1}>
          <line x1={C} y1={C - R} x2={C} y2={C + R} />
          <line x1={C - R} y1={C} x2={C + R} y2={C} />
          {Array.from({ length: 11 }, (_, i) => (i - 5) * 40).map((o) => (
            <g key={o}>
              <line x1={C + o} y1={C - 5} x2={C + o} y2={C + 5} />
              <line x1={C - 5} y1={C + o} x2={C + 5} y2={C + o} />
            </g>
          ))}
        </g>
        <circle cx={C} cy={C} r={R} fill="url(#vignette)" />
      </g>
      <circle cx={C} cy={C} r={R} fill="none" stroke="#3f3f46" strokeWidth={6} />

      <g fontFamily="JetBrains Mono, monospace" fontSize={13} fill="#d4d4d8">
        <text x={14} y={24}>{zoom > 1 ? "150×" : "50×"}</text>
        <text x={VIEW - 14} y={24} textAnchor="end">
          {e.status === "setup" ? "IDLE" : `WIRE ${Math.min(e.wire + 1, e.bondCount)}/${e.bondCount}`}
        </text>
        <text x={14} y={VIEW - 14}>Z +{zUm} µm</text>
        <g transform={`translate(${VIEW - 14} ${VIEW - 26})`}>
          <line x1={-100 / UM_PER_PX * zoom} y1={0} x2={0} y2={0} stroke="#d4d4d8" strokeWidth={2} />
          <text x={0} y={16} textAnchor="end">100 µm</text>
        </g>
      </g>
      {running && e.status !== "setup" && (
        <text x={C} y={VIEW - 14} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={13} fill={failing ? "#f87171" : "#7dd3fc"}>
          {failing ? `ALARM · ${e.alarm?.code}` : PHASE_LABEL[phase]}
        </text>
      )}
    </svg>
  );
}
