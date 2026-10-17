import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Workflow, Zap, Play, Pause, TriangleAlert, RotateCcw } from "lucide-react";
import { SectionTitle } from "../ui/SectionTitle";

const QUEUES = [
  { name: "Equities", color: "#3b82f6", y: 60 },
  { name: "FX", color: "#10b981", y: 150 },
  { name: "Rates", color: "#f59e0b", y: 240 },
];
const PRODUCER = { x: 80, y: 150 };
const EXCHANGE = { x: 250, y: 150 };
const Q_IN = 400;
const Q_OUT = 590;
const CONSUMER_X = 710;

const LEG_MS = 550;
const PROCESS_MS = 650;
const AUTO_MS = 900;
const BURST_GAP_MS = 90;
const BURST_SIZE = 15;
const FAIL_RATE = 0.2;
const MAX_RETRIES = 3;
const MAX_SLOTS = 10;
const SLOT_GAP = 17;

type Leg = "toExchange" | "toQueue" | "toConsumer" | "requeue";

interface Msg {
  id: number;
  queue: number;
  pnl: number;
  retries: number;
}

interface Flight {
  msg: Msg;
  leg: Leg;
  t: number;
}

interface Popup {
  id: number;
  queue: number;
  text: string;
  good: boolean;
  age: number;
}

interface Sim {
  flights: Flight[];
  queues: Msg[][];
  processing: (Msg | null)[];
  busy: number[];
  paused: boolean[];
  popups: Popup[];
  ackTimes: number[];
  pnl: number;
  acked: number;
  requeued: number;
  nextId: number;
  autoAcc: number;
  burstLeft: number;
  burstAcc: number;
  auto: boolean;
  failures: boolean;
}

const freshSim = (): Sim => ({
  flights: [],
  queues: [[], [], []],
  processing: [null, null, null],
  busy: [0, 0, 0],
  paused: [false, false, false],
  popups: [],
  ackTimes: [],
  pnl: 0,
  acked: 0,
  requeued: 0,
  nextId: 1,
  autoAcc: 0,
  burstLeft: 0,
  burstAcc: 0,
  auto: true,
  failures: false,
});

// Skewed slightly positive so a healthy pipeline trends up.
const randomPnl = () => {
  const n = (Math.random() + Math.random() + Math.random() - 1.5) * 2;
  return Math.round(n * 300 + 90);
};

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function flightPos(f: Flight) {
  const y = QUEUES[f.msg.queue].y;
  const t = ease(Math.min(f.t, 1));
  switch (f.leg) {
    case "toExchange":
      return { x: lerp(PRODUCER.x, EXCHANGE.x, t), y: PRODUCER.y };
    case "toQueue":
      return { x: lerp(EXCHANGE.x, Q_IN, t), y: lerp(EXCHANGE.y, y, t) };
    case "toConsumer":
      return { x: lerp(Q_OUT, CONSUMER_X, t), y };
    case "requeue":
      return { x: lerp(CONSUMER_X, Q_IN, t), y: y - 34 * Math.sin(Math.PI * t) };
  }
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
  signDisplay: "always",
});

function publish(sim: Sim) {
  const msg: Msg = {
    id: sim.nextId++,
    queue: Math.floor(Math.random() * QUEUES.length),
    pnl: randomPnl(),
    retries: 0,
  };
  sim.flights.push({ msg, leg: "toExchange", t: 0 });
}

function step(sim: Sim, dt: number, now: number) {
  if (sim.auto) {
    sim.autoAcc += dt;
    if (sim.autoAcc >= AUTO_MS) {
      sim.autoAcc = 0;
      publish(sim);
    }
  }
  if (sim.burstLeft > 0) {
    sim.burstAcc += dt;
    if (sim.burstAcc >= BURST_GAP_MS) {
      sim.burstAcc = 0;
      sim.burstLeft--;
      publish(sim);
    }
  }

  const stillFlying: Flight[] = [];
  for (const f of sim.flights) {
    f.t += dt / LEG_MS;
    if (f.t < 1) {
      stillFlying.push(f);
      continue;
    }
    const q = f.msg.queue;
    if (f.leg === "toExchange") {
      stillFlying.push({ msg: f.msg, leg: "toQueue", t: 0 });
    } else if (f.leg === "toQueue" || f.leg === "requeue") {
      sim.queues[q].push(f.msg);
    } else {
      sim.processing[q] = f.msg;
      sim.busy[q] = PROCESS_MS;
    }
  }
  sim.flights = stillFlying;

  QUEUES.forEach((_, q) => {
    const msg = sim.processing[q];
    if (msg) {
      sim.busy[q] -= dt;
      if (sim.busy[q] <= 0) {
        sim.processing[q] = null;
        if (sim.failures && msg.retries < MAX_RETRIES && Math.random() < FAIL_RATE) {
          msg.retries++;
          sim.requeued++;
          sim.flights.push({ msg, leg: "requeue", t: 0 });
          sim.popups.push({ id: msg.id * 10 + msg.retries, queue: q, text: "nack", good: false, age: 0 });
        } else {
          sim.pnl += msg.pnl;
          sim.acked++;
          sim.ackTimes.push(now);
          sim.popups.push({ id: msg.id * 10, queue: q, text: money.format(msg.pnl), good: msg.pnl >= 0, age: 0 });
        }
      }
    }
    const fetching = sim.flights.some((f) => f.leg === "toConsumer" && f.msg.queue === q);
    if (!sim.processing[q] && !fetching && !sim.paused[q] && sim.queues[q].length > 0) {
      sim.flights.push({ msg: sim.queues[q].shift()!, leg: "toConsumer", t: 0 });
    }
  });

  sim.popups = sim.popups.filter((p) => (p.age += dt) < 1000);
  sim.ackTimes = sim.ackTimes.filter((t) => now - t < 5000);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const color = tone === "up" ? "text-emerald-400" : tone === "down" ? "text-red-500" : "text-zinc-100";
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

const controlClass =
  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors";
const offClass = "bg-zinc-800 text-zinc-300 border-transparent hover:bg-zinc-700";
const onClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";

export function MessageFlow() {
  const simRef = useRef<Sim>(freshSim());
  const [, setFrame] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const visible = useInView(containerRef, { amount: 0.2 });
  const sim = simRef.current;
  const rerender = () => setFrame((n) => n + 1);

  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      step(simRef.current, Math.min(now - last, 50), now);
      last = now;
      rerender();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const togglePause = (q: number) => {
    sim.paused[q] = !sim.paused[q];
    rerender();
  };

  const throughput = sim.ackTimes.length / 5;

  return (
    <section id="playground" className="max-w-5xl mx-auto px-6 py-24">
      <SectionTitle>
        <Workflow size={24} className="text-emerald-400" />
        Trade pipeline
      </SectionTitle>

      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl mb-6">
          A toy RabbitMQ-style pipeline. A trade feed publishes to a topic exchange, which routes each trade to a
          queue by asset class. Consumers settle trades into P&amp;L. Fire a burst, pause a consumer to watch its
          queue back up, or inject failures to see messages get nacked and requeued.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label="Realized P&L" value={money.format(sim.pnl)} tone={sim.pnl > 0 ? "up" : sim.pnl < 0 ? "down" : undefined} />
          <Stat label="Trades settled" value={sim.acked.toLocaleString()} />
          <Stat label="Requeued (nack)" value={sim.requeued.toLocaleString()} />
          <Stat label="Throughput" value={`${throughput.toFixed(1)} msg/s`} />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className={`${controlClass} ${offClass}`}
            onClick={() => {
              sim.burstLeft += BURST_SIZE;
              rerender();
            }}
          >
            <Zap size={15} /> Publish burst
          </button>
          <button
            className={`${controlClass} ${sim.auto ? onClass : offClass}`}
            aria-pressed={sim.auto}
            onClick={() => {
              sim.auto = !sim.auto;
              rerender();
            }}
          >
            {sim.auto ? <Pause size={15} /> : <Play size={15} />} Auto feed
          </button>
          <button
            className={`${controlClass} ${sim.failures ? onClass : offClass}`}
            aria-pressed={sim.failures}
            onClick={() => {
              sim.failures = !sim.failures;
              rerender();
            }}
          >
            <TriangleAlert size={15} /> Inject failures
          </button>
          <button
            className={`${controlClass} ${offClass}`}
            onClick={() => {
              simRef.current = freshSim();
              rerender();
            }}
          >
            <RotateCcw size={15} /> Reset
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
          <svg
            viewBox="0 0 800 300"
            className="w-full min-w-[640px] select-none"
            role="img"
            aria-label="Animated message pipeline: trade feed to exchange to three queues to consumers"
          >
            {QUEUES.map((q) => (
              <g key={`wires-${q.name}`} className="stroke-zinc-700" strokeWidth={1.5} fill="none">
                <line x1={EXCHANGE.x} y1={EXCHANGE.y} x2={Q_IN} y2={q.y} />
                <line x1={Q_OUT} y1={q.y} x2={CONSUMER_X - 45} y2={q.y} />
              </g>
            ))}
            <line x1={PRODUCER.x} y1={PRODUCER.y} x2={EXCHANGE.x} y2={EXCHANGE.y} className="stroke-zinc-700" strokeWidth={1.5} />

            <g>
              <rect x={PRODUCER.x - 55} y={PRODUCER.y - 28} width={110} height={56} rx={10} className="fill-zinc-950 stroke-zinc-700" />
              <text x={PRODUCER.x} y={PRODUCER.y - 3} textAnchor="middle" className="fill-zinc-100" fontSize={15} fontWeight={600}>Trade feed</text>
              <text x={PRODUCER.x} y={PRODUCER.y + 16} textAnchor="middle" className="fill-zinc-500" fontSize={12}>producer</text>
            </g>

            <g>
              <rect x={EXCHANGE.x - 55} y={EXCHANGE.y - 28} width={110} height={56} rx={10} className="fill-zinc-950 stroke-emerald-500" strokeWidth={1.5} />
              <text x={EXCHANGE.x} y={EXCHANGE.y - 3} textAnchor="middle" className="fill-zinc-100" fontSize={15} fontWeight={600}>Exchange</text>
              <text x={EXCHANGE.x} y={EXCHANGE.y + 16} textAnchor="middle" className="fill-zinc-500" fontSize={12}>topic: trades.*</text>
            </g>

            {QUEUES.map((q, i) => {
              const depth = sim.queues[i].length;
              const backedUp = depth >= MAX_SLOTS - 2;
              const shown = sim.queues[i].slice(0, MAX_SLOTS);
              return (
                <g key={q.name}>
                  <text x={Q_IN} y={q.y - 22} className="fill-zinc-400" fontSize={12}>
                    {q.name.toLowerCase()} queue · {depth}
                  </text>
                  <rect
                    x={Q_IN}
                    y={q.y - 15}
                    width={Q_OUT - Q_IN}
                    height={30}
                    rx={6}
                    className={backedUp ? "fill-zinc-950 stroke-red-500" : "fill-zinc-950 stroke-zinc-700"}
                    strokeWidth={backedUp ? 1.5 : 1}
                  />
                  {shown.map((m, k) => (
                    <rect
                      key={m.id}
                      x={Q_OUT - 20 - k * SLOT_GAP}
                      y={q.y - 7}
                      width={13}
                      height={14}
                      rx={3}
                      fill={q.color}
                      opacity={m.retries > 0 ? 0.55 : 1}
                    />
                  ))}
                  {depth > MAX_SLOTS && (
                    <text x={Q_IN + 6} y={q.y + 4} className="fill-zinc-400" fontSize={11}>+{depth - MAX_SLOTS}</text>
                  )}

                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={`${sim.paused[i] ? "Resume" : "Pause"} ${q.name} consumer`}
                    aria-pressed={sim.paused[i]}
                    onClick={() => togglePause(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        togglePause(i);
                      }
                    }}
                    className="cursor-pointer outline-none"
                  >
                    <rect
                      x={CONSUMER_X - 45}
                      y={q.y - 26}
                      width={110}
                      height={52}
                      rx={10}
                      className={sim.paused[i] ? "fill-zinc-800 stroke-zinc-600" : "fill-zinc-950 stroke-zinc-700 hover:stroke-emerald-500"}
                      strokeDasharray={sim.paused[i] ? "4 3" : undefined}
                    />
                    <text x={CONSUMER_X + 10} y={q.y - 4} textAnchor="middle" className="fill-zinc-100" fontSize={13} fontWeight={600}>
                      {q.name} desk
                    </text>
                    <text x={CONSUMER_X + 10} y={q.y + 14} textAnchor="middle" className="fill-zinc-500" fontSize={11}>
                      {sim.paused[i] ? "paused · click to resume" : sim.processing[i] ? "settling…" : "idle · click to pause"}
                    </text>
                    {sim.processing[i] && (
                      <rect
                        x={CONSUMER_X - 35}
                        y={q.y + 19}
                        width={90 * (1 - Math.max(sim.busy[i], 0) / PROCESS_MS)}
                        height={3}
                        rx={1.5}
                        fill={q.color}
                      />
                    )}
                  </g>
                </g>
              );
            })}

            {sim.flights.map((f) => {
              const p = flightPos(f);
              return (
                <circle
                  key={`${f.msg.id}-${f.leg}-${f.msg.retries}`}
                  cx={p.x}
                  cy={p.y}
                  r={6}
                  fill={f.leg === "requeue" ? "#ef4444" : QUEUES[f.msg.queue].color}
                />
              );
            })}

            {sim.popups.map((p) => (
              <text
                key={p.id}
                x={CONSUMER_X + 10}
                y={QUEUES[p.queue].y - 32 - p.age / 50}
                textAnchor="middle"
                opacity={1 - p.age / 1000}
                fontSize={12}
                fontWeight={600}
                className={p.good ? "fill-emerald-400" : "fill-red-500"}
              >
                {p.text}
              </text>
            ))}
          </svg>
        </div>
      </motion.div>
    </section>
  );
}
