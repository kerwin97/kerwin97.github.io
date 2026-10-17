import { layoutFor, maxBonds, type Layout, type Mode, type ParamKey, type Params, type Point, type Program } from "./programs";

export type Phase = "move" | "descend1" | "ball" | "loop" | "descend2" | "stitch" | "lift" | "efo";
export type Outcome = "PASS" | "NSOP" | "NSOL" | "SHORT_TAIL" | "CRATER" | "LOW_SHEAR";
export type Status = "setup" | "running" | "paused" | "alarm" | "done" | "aborted";
export type AlarmAction = "retry" | "skip" | "abort";

export interface BondRecord {
  wire: number;
  site: number;
  outcome: Outcome;
  ballUm?: number;
  shearG?: number;
  offsetUm?: number;
  loopUm?: number;
  attempts: number;
}

export interface Alarm {
  code: string;
  outcome: Outcome;
  wire: number;
  message: string;
  hint: string;
}

const DIE_PHASES: Phase[] = ["move", "descend1", "ball", "loop", "descend2", "stitch", "lift", "efo"];
const WAFER_PHASES: Phase[] = ["move", "descend1", "ball", "lift", "efo"];
const PHASE_MS: Record<Phase, number> = {
  move: 380,
  descend1: 170,
  ball: 280,
  loop: 440,
  descend2: 150,
  stitch: 220,
  lift: 150,
  efo: 160,
};
// Real machines run around 70 ms per wire; the demo is slowed down so the motion is visible.
export const PRODUCTION_MS_PER_WIRE = 70;

export const PHASE_LABEL: Record<Phase, string> = {
  move: "Moving to bond site",
  descend1: "Descending to pad",
  ball: "1st bond · ball (ultrasonic)",
  loop: "Forming wire loop",
  descend2: "Descending to lead",
  stitch: "2nd bond · stitch",
  lift: "Lifting · tail break",
  efo: "EFO spark · forming free air ball",
};

const ALARMS: Partial<Record<Outcome, Omit<Alarm, "wire" | "outcome">>> = {
  NSOP: {
    code: "E-301",
    message: "Non-stick on pad (NSOP)",
    hint: "The ball didn't weld to the pad. Usually too little ultrasonic power, force or time, or a contaminated pad.",
  },
  NSOL: {
    code: "E-302",
    message: "Non-stick on lead (NSOL)",
    hint: "The stitch didn't bond to the lead. Usually the heater is too cold or ultrasonic power is too low.",
  },
  SHORT_TAIL: {
    code: "E-305",
    message: "Short tail · no free air ball",
    hint: "The wire tail broke short, so the EFO spark couldn't form the next ball. The wire must be re-threaded.",
  },
};

const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
const clamp01 = (x: number) => Math.min(0.9, Math.max(0, x));

export class BonderEngine {
  program: Program;
  mode: Mode = "die";
  bondCount: number;
  params: Params;
  speed = 1;
  status: Status = "setup";
  layout: Layout;
  records: BondRecord[] = [];
  alarm: Alarm | null = null;
  forcedFault: Outcome | null = null;
  wire = 0;
  phaseIndex = 0;
  phaseT = 0;
  cap: Point = { x: 300, y: 560 };
  z = 1;
  elapsedMs = 0;
  alarmCount = 0;
  private from: Point = { x: 300, y: 560 };
  outcome: Outcome = "PASS";
  private attempts = 1;

  constructor(program: Program) {
    this.program = program;
    this.params = { ...program.defaults };
    this.bondCount = Math.min(16, program.pads);
    this.layout = layoutFor(program, this.mode);
  }

  setProgram(p: Program) {
    if (this.status === "running") return;
    this.program = p;
    this.params = { ...p.defaults };
    this.bondCount = Math.min(this.bondCount, maxBonds(p, this.mode));
    this.reset();
  }

  setMode(mode: Mode) {
    if (this.status === "running") return;
    this.mode = mode;
    this.bondCount = Math.min(this.bondCount, maxBonds(this.program, mode));
    this.reset();
  }

  reset() {
    this.layout = layoutFor(this.program, this.mode);
    this.records = [];
    this.alarm = null;
    this.wire = 0;
    this.phaseIndex = 0;
    this.phaseT = 0;
    this.cap = { x: 300, y: 560 };
    this.from = { ...this.cap };
    this.z = 1;
    this.elapsedMs = 0;
    this.alarmCount = 0;
    this.status = "setup";
  }

  start() {
    if (this.status === "done" || this.status === "aborted") this.reset();
    if (this.status === "setup") this.beginWire(1);
    this.status = "running";
  }

  pause() {
    if (this.status === "running") this.status = "paused";
  }

  get phases() {
    return this.mode === "die" ? DIE_PHASES : WAFER_PHASES;
  }

  get phase(): Phase {
    return this.phases[this.phaseIndex];
  }

  get site() {
    return this.layout.sites[this.wire];
  }

  // Probability of each failure grows with how far a parameter sits outside its process window.
  failureOdds() {
    const w = this.program.window;
    const low = (k: ParamKey) => Math.max(0, (w[k][0] - this.params[k]) / (w[k][1] - w[k][0]));
    const high = (k: ParamKey) => Math.max(0, (this.params[k] - w[k][1]) / (w[k][1] - w[k][0]));
    return {
      NSOP: clamp01(0.008 + 0.9 * low("usgMa") + 0.6 * low("forceG") + 0.5 * low("timeMs") + 0.4 * low("tempC")),
      NSOL: this.mode === "die" ? clamp01(0.006 + 0.8 * low("tempC") + 0.4 * low("usgMa") + 0.3 * low("forceG")) : 0,
      SHORT_TAIL: 0.004,
      CRATER: clamp01(0.002 + 0.8 * high("forceG") + 0.6 * high("usgMa") + 0.3 * high("timeMs")),
    };
  }

  private beginWire(attempts: number) {
    this.phaseIndex = 0;
    this.phaseT = 0;
    this.from = { ...this.cap };
    this.attempts = attempts;
    if (this.forcedFault) {
      this.outcome = this.forcedFault;
      this.forcedFault = null;
      return;
    }
    const odds = this.failureOdds();
    const roll = (p: number) => Math.random() < p;
    this.outcome = roll(odds.NSOP)
      ? "NSOP"
      : roll(odds.NSOL)
        ? "NSOL"
        : roll(odds.CRATER)
          ? "CRATER"
          : roll(odds.SHORT_TAIL)
            ? "SHORT_TAIL"
            : "PASS";
  }

  // Where the bond lands and how strong it is, given the parameters.
  private measure(outcome: Outcome): BondRecord {
    const p = this.program;
    const w = p.window;
    const rel = (k: ParamKey) => (this.params[k] - (w[k][0] + w[k][1]) / 2) / (w[k][1] - w[k][0]);
    const ballUm = p.ballUm * (1 + 0.25 * rel("forceG") + 0.15 * rel("usgMa") + 0.08 * rel("timeMs")) + gauss() * p.ballUm * 0.03;
    let shearG = p.shearG * (1 + 0.5 * rel("usgMa") + 0.25 * rel("forceG") + 0.2 * rel("tempC")) * (1 + gauss() * 0.06);
    if (outcome === "CRATER") shearG *= 0.4;
    let result = outcome;
    if (result === "PASS" && shearG < p.shearSpecG) result = "LOW_SHEAR";
    return {
      wire: this.wire + 1,
      site: this.wire,
      outcome: result,
      ballUm: Math.round(ballUm * 10) / 10,
      shearG: Math.round(Math.max(0, shearG) * 10) / 10,
      offsetUm: Math.round(Math.hypot(gauss(), gauss()) * 1.6 * 10) / 10,
      loopUm: this.mode === "die" ? Math.round(p.loopUm + gauss() * 5) : undefined,
      attempts: this.attempts,
    };
  }

  private raise(outcome: Outcome) {
    const a = ALARMS[outcome]!;
    this.alarm = { ...a, outcome, wire: this.wire + 1 };
    this.alarmCount++;
    this.status = "alarm";
  }

  resolveAlarm(action: AlarmAction) {
    if (this.status !== "alarm" || !this.alarm) return;
    const outcome = this.alarm.outcome;
    this.alarm = null;
    if (action === "abort") {
      this.records.push({ wire: this.wire + 1, site: this.wire, outcome, attempts: this.attempts });
      this.status = "aborted";
      return;
    }
    if (action === "retry") {
      this.status = "running";
      this.beginWire(this.attempts + 1);
      return;
    }
    this.records.push({ wire: this.wire + 1, site: this.wire, outcome, attempts: this.attempts });
    this.status = "running";
    this.nextWire();
  }

  private nextWire() {
    this.wire++;
    if (this.wire >= this.bondCount) {
      this.status = "done";
      this.from = { ...this.cap };
      return;
    }
    this.beginWire(1);
  }

  step(dt: number) {
    if (this.status !== "running") return;
    this.elapsedMs += dt;
    this.phaseT += (dt * this.speed) / PHASE_MS[this.phase];
    while (this.phaseT >= 1 && this.status === "running") {
      this.phaseT -= 1;
      this.endPhase(this.phase);
      if (this.status !== "running") break;
    }
    this.updateCapillary();
  }

  private endPhase(phase: Phase) {
    const failsHere =
      (phase === "ball" && this.outcome === "NSOP") ||
      (phase === "stitch" && this.outcome === "NSOL") ||
      (phase === "lift" && this.outcome === "SHORT_TAIL");
    if (failsHere) {
      this.phaseT = 1;
      this.updateCapillary();
      this.raise(this.outcome);
      return;
    }
    if (this.phaseIndex < this.phases.length - 1) {
      this.phaseIndex++;
      if (this.phase === "move") this.from = { ...this.cap };
      return;
    }
    this.records.push(this.measure(this.outcome));
    this.nextWire();
  }

  private updateCapillary() {
    const site = this.site;
    if (!site) return;
    const t = Math.min(this.phaseT, 1);
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    const target = site.lead ?? site.pad;
    switch (this.phase) {
      case "move":
        this.cap = { x: this.from.x + (site.pad.x - this.from.x) * e, y: this.from.y + (site.pad.y - this.from.y) * e };
        this.z = 0.8;
        break;
      case "descend1":
        this.cap = { ...site.pad };
        this.z = 0.8 * (1 - e);
        break;
      case "ball":
        this.cap = { ...site.pad };
        this.z = 0;
        break;
      case "loop":
        this.cap = { x: site.pad.x + (target.x - site.pad.x) * e, y: site.pad.y + (target.y - site.pad.y) * e };
        this.z = Math.sin(Math.PI * t) * 0.9 + 0.05 * t;
        break;
      case "descend2":
        this.cap = { ...target };
        this.z = 0.05 * (1 - e);
        break;
      case "stitch":
        this.cap = { ...target };
        this.z = 0;
        break;
      case "lift":
        this.z = 0.5 * e;
        break;
      case "efo":
        this.z = 0.5;
        break;
    }
  }

  stats() {
    const done = this.records;
    const passed = done.filter((r) => r.outcome === "PASS").length;
    const measured = done.filter((r) => r.ballUm !== undefined);
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    return {
      bonded: done.length,
      passed,
      yieldPct: done.length ? (100 * passed) / done.length : null,
      alarms: this.alarmCount,
      avgBallUm: avg(measured.map((r) => r.ballUm!)),
      avgShearG: avg(measured.map((r) => r.shearG!)),
      uph: Math.round(3_600_000 / (PRODUCTION_MS_PER_WIRE * this.bondCount)),
    };
  }
}
