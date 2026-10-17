export type ParamKey = "forceG" | "usgMa" | "timeMs" | "tempC";
export type Params = Record<ParamKey, number>;
export type Mode = "die" | "wafer";

export interface ParamDef {
  key: ParamKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

export const PARAMS: ParamDef[] = [
  { key: "forceG", label: "Bond force", unit: "g", min: 5, max: 60, step: 1 },
  { key: "usgMa", label: "Ultrasonic power", unit: "mA", min: 20, max: 200, step: 5 },
  { key: "timeMs", label: "Bond time", unit: "ms", min: 2, max: 30, step: 1 },
  { key: "tempC", label: "Heater temperature", unit: "°C", min: 100, max: 260, step: 5 },
];

export interface Program {
  id: string;
  name: string;
  device: string;
  wire: "Au" | "Cu";
  wireUm: number;
  pads: number;
  ballUm: number; // nominal bonded ball diameter
  shearG: number; // nominal ball shear
  shearSpecG: number; // minimum acceptable shear
  loopUm: number;
  defaults: Params;
  window: Record<ParamKey, [number, number]>;
}

export const PROGRAMS: Program[] = [
  {
    id: "QFN32-AU",
    name: "QFN-32 · Au 0.8 mil",
    device: "Power management IC, 32 pads",
    wire: "Au",
    wireUm: 20,
    pads: 32,
    ballUm: 45,
    shearG: 16,
    shearSpecG: 10,
    loopUm: 150,
    defaults: { forceG: 18, usgMa: 90, timeMs: 12, tempC: 175 },
    window: { forceG: [12, 25], usgMa: [70, 115], timeMs: [8, 18], tempC: [150, 200] },
  },
  {
    id: "BGA64-CU",
    name: "BGA-64 · Cu 1.0 mil",
    device: "Microcontroller, 64 pads",
    wire: "Cu",
    wireUm: 25,
    pads: 64,
    ballUm: 58,
    shearG: 28,
    shearSpecG: 18,
    loopUm: 180,
    defaults: { forceG: 28, usgMa: 120, timeMs: 14, tempC: 200 },
    window: { forceG: [22, 36], usgMa: [95, 145], timeMs: [10, 20], tempC: [180, 225] },
  },
  {
    id: "SOIC16-AU",
    name: "SOIC-16 · Au 1.0 mil",
    device: "Op-amp, 16 pads",
    wire: "Au",
    wireUm: 25,
    pads: 16,
    ballUm: 60,
    shearG: 26,
    shearSpecG: 15,
    loopUm: 200,
    defaults: { forceG: 22, usgMa: 100, timeMs: 15, tempC: 180 },
    window: { forceG: [16, 30], usgMa: [80, 125], timeMs: [10, 22], tempC: [160, 205] },
  },
];

export interface Point {
  x: number;
  y: number;
}

export interface Site {
  pad: Point;
  lead?: Point;
  die: number;
}

export interface Layout {
  dies: { cx: number; cy: number; half: number }[];
  sites: Site[];
}

export const VIEW = 600;
export const WAFER_SITES = 48;
const C = VIEW / 2;

function padRing(cx: number, cy: number, half: number, count: number, die: number, withLeads: boolean): Site[] {
  const perSide = Math.ceil(count / 4);
  const r = half - 16; // pad row sits just inside the die edge
  const L = 2 * r - 24; // keep pads clear of the corners
  // Clockwise from the top-left: top, right, bottom, left. Each side has a start point, a direction along it and an outward normal.
  const sides = [
    { sx: cx - L / 2, sy: cy - r, dx: 1, dy: 0, nx: 0, ny: -1 },
    { sx: cx + r, sy: cy - L / 2, dx: 0, dy: 1, nx: 1, ny: 0 },
    { sx: cx + L / 2, sy: cy + r, dx: -1, dy: 0, nx: 0, ny: 1 },
    { sx: cx - r, sy: cy + L / 2, dx: 0, dy: -1, nx: -1, ny: 0 },
  ];
  const sites: Site[] = [];
  for (const s of sides) {
    for (let i = 0; i < perSide && sites.length < count; i++) {
      const t = perSide === 1 ? 0.5 : i / (perSide - 1);
      const pad = { x: s.sx + s.dx * t * L, y: s.sy + s.dy * t * L };
      // Lead fingers fan outward from the die so neighbouring wires don't cross.
      const lead = withLeads
        ? { x: cx + (pad.x - cx) * 1.35 + s.nx * 75, y: cy + (pad.y - cy) * 1.35 + s.ny * 75 }
        : undefined;
      sites.push({ pad, lead, die });
    }
  }
  return sites;
}

export function layoutFor(program: Program, mode: Mode): Layout {
  if (mode === "die") {
    const die = { cx: C, cy: C, half: 120 };
    return { dies: [die], sites: padRing(C, C, die.half, program.pads, 0, true) };
  }
  const dies = [
    { cx: 192, cy: 192, half: 88 },
    { cx: 408, cy: 192, half: 88 },
    { cx: 408, cy: 408, half: 88 },
    { cx: 192, cy: 408, half: 88 },
  ];
  return { dies, sites: dies.flatMap((d, i) => padRing(d.cx, d.cy, d.half, WAFER_SITES / 4, i, false)) };
}

export function maxBonds(program: Program, mode: Mode) {
  return mode === "die" ? program.pads : WAFER_SITES;
}
