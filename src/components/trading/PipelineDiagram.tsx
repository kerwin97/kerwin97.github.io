import type { Packet } from "./broker";
import { NODES, type TradingEngine } from "./engine";
import { CLASS_COLOR, type AssetClass } from "./market";

type NodeKind = "worker" | "exchange" | "queue";

interface DiagramNode {
  x: number;
  y: number;
  kind: NodeKind;
  label: string;
  sub: string;
}

const LAYOUT: Record<string, DiagramNode> = {
  [NODES.mdWorker]: { x: 95, y: 75, kind: "worker", label: "Market data worker", sub: "publisher" },
  [NODES.ticket]: { x: 95, y: 215, kind: "worker", label: "Trade ticket", sub: "you · publisher" },
  "md.ticks": { x: 290, y: 75, kind: "exchange", label: "md.ticks", sub: "topic exchange" },
  trades: { x: 290, y: 215, kind: "exchange", label: "trades", sub: "topic exchange" },
  "trades.dlx": { x: 290, y: 345, kind: "exchange", label: "trades.dlx", sub: "dead-letter exchange" },
  "risk.md": { x: 490, y: 75, kind: "queue", label: "risk.md", sub: "x-max-length 25" },
  "risk.trades": { x: 490, y: 215, kind: "queue", label: "risk.trades", sub: "x-delivery-limit 3" },
  "trades.dlq": { x: 490, y: 345, kind: "queue", label: "trades.dlq", sub: "dead letters" },
  [NODES.risk]: { x: 690, y: 145, kind: "worker", label: "Risk & P&L worker", sub: "consumer · publisher" },
  "risk.results": { x: 690, y: 290, kind: "exchange", label: "risk.results", sub: "fanout exchange" },
  "ui.blotter": { x: 880, y: 290, kind: "queue", label: "ui.blotter", sub: "prefetch 10" },
  [NODES.blotter]: { x: 880, y: 145, kind: "worker", label: "Blotter", sub: "UI consumer" },
};

const SIZE: Record<NodeKind, { w: number; h: number }> = {
  worker: { w: 160, h: 54 },
  exchange: { w: 136, h: 46 },
  queue: { w: 160, h: 56 },
};

const EDGES: { from: string; to: string; label?: string; dead?: boolean }[] = [
  { from: NODES.mdWorker, to: "md.ticks" },
  { from: NODES.ticket, to: "trades" },
  { from: "md.ticks", to: "risk.md", label: "md.#" },
  { from: "trades", to: "risk.trades", label: "trade.*.new" },
  { from: "risk.md", to: NODES.risk },
  { from: "risk.trades", to: NODES.risk },
  { from: "risk.trades", to: "trades.dlx", label: "dead-letter", dead: true },
  { from: "trades.dlx", to: "trades.dlq" },
  { from: NODES.risk, to: "risk.results" },
  { from: "risk.results", to: "ui.blotter" },
  { from: "ui.blotter", to: NODES.blotter },
];

const RESULT_COLOR = "#8b5cf6";
const DEAD_COLOR = "#ef4444";
const MAX_SLOTS = 8;

function messageClass(payload: any): AssetClass | undefined {
  return payload?.cls ?? payload?.request?.cls;
}

function packetColor(p: Packet) {
  if (p.kind === "requeue" || p.kind === "deadletter") return DEAD_COLOR;
  if (p.msg.exchange === "risk.results") return RESULT_COLOR;
  const cls = messageClass(p.msg.payload);
  return cls ? CLASS_COLOR[cls] : "#a1a1aa";
}

interface Props {
  engine: TradingEngine;
  selectedTrade: string | null;
  onToggleRisk: () => void;
}

export function PipelineDiagram({ engine, selectedTrade, onToggleRisk }: Props) {
  const b = engine.broker;

  const workerStatus = (node: string) => {
    if (node === NODES.mdWorker) return engine.mdRunning ? `publishing · tick ${engine.ticks}` : "stopped";
    if (node === NODES.ticket) return "waiting for you";
    if (node === NODES.risk) {
      if (engine.riskPaused) return "stopped · click to start";
      const busy = engine.riskTradeConsumers.filter((_, i) => engine.isWorkerBusy(i)).length;
      return `${busy}/${engine.workerCount} booking · click to stop`;
    }
    return b.unacked.some((u) => u.consumer.node === node) ? "rendering" : "idle";
  };

  return (
    <svg viewBox="0 0 980 390" className="w-full min-w-[760px] select-none" role="img" aria-label="Live RabbitMQ topology with messages moving between workers, exchanges and queues">
      {EDGES.map((e) => {
        const a = LAYOUT[e.from];
        const z = LAYOUT[e.to];
        return (
          <g key={`${e.from}-${e.to}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={z.x}
              y2={z.y}
              className={e.dead ? "stroke-red-400" : "stroke-zinc-700"}
              strokeWidth={1.5}
              strokeDasharray={e.dead ? "5 4" : undefined}
            />
            {e.label && (
              <text
                x={(a.x + z.x) / 2 + (a.y === z.y ? 0 : 6)}
                y={a.y === z.y ? a.y - 33 : (a.y + z.y) / 2 - 6}
                textAnchor={a.y === z.y ? "middle" : "start"}
                fontSize={11}
                className={e.dead ? "fill-red-400" : "fill-zinc-500"}
                fontFamily="JetBrains Mono, monospace"
              >
                {e.label}
              </text>
            )}
          </g>
        );
      })}

      {Object.entries(LAYOUT).map(([id, n]) => {
        const isRisk = id === NODES.risk;
        const { w } = SIZE[n.kind];
        const h = isRisk ? 78 : SIZE[n.kind].h;
        const workers = engine.workerCount;
        const stopped = (isRisk && engine.riskPaused) || (id === NODES.mdWorker && !engine.mdRunning);
        const queue = n.kind === "queue" ? b.queues.get(id) : undefined;
        const rx = n.kind === "exchange" ? 23 : 10;
        const stroke =
          n.kind === "exchange" ? "stroke-violet-400" : id === "trades.dlq" && queue?.messages.length ? "stroke-red-400" : "stroke-zinc-700";

        return (
          <g
            key={id}
            {...(isRisk && {
              role: "button",
              tabIndex: 0,
              "aria-label": engine.riskPaused ? "Start risk worker" : "Stop risk worker",
              onClick: onToggleRisk,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleRisk();
                }
              },
              className: "cursor-pointer outline-none",
            })}
          >
            <rect
              x={n.x - w / 2}
              y={n.y - h / 2}
              width={w}
              height={h}
              rx={rx}
              className={`${stopped ? "fill-zinc-800" : "fill-zinc-950"} ${stroke} ${isRisk ? "hover:stroke-emerald-400" : ""}`}
              strokeWidth={n.kind === "exchange" ? 1.5 : 1}
              strokeDasharray={stopped ? "4 3" : undefined}
            />
            <text x={n.x} y={n.y - (isRisk ? 18 : queue ? 12 : 4)} textAnchor="middle" fontSize={13} fontWeight={600} className="fill-zinc-100">
              {isRisk ? `Risk & P&L workers ×${workers}` : n.label}
            </text>
            <text x={n.x} y={n.y + (isRisk ? -2 : queue ? 2 : 13)} textAnchor="middle" fontSize={10.5} className="fill-zinc-500">
              {n.kind === "worker" ? workerStatus(id) : n.sub}
            </text>
            {isRisk &&
              Array.from({ length: workers }, (_, i) => (
                <circle
                  key={i}
                  cx={n.x - ((workers - 1) * 13) / 2 + i * 13}
                  cy={n.y + 18}
                  r={4.5}
                  className={engine.riskPaused ? "fill-zinc-600" : engine.isWorkerBusy(i) ? "fill-amber-400" : "fill-emerald-400"}
                />
              ))}
            {queue && (
              <g>
                {queue.messages.slice(0, MAX_SLOTS).map((m, k) => (
                  <rect
                    key={m.id}
                    x={n.x + w / 2 - 18 - k * 15}
                    y={n.y + 10}
                    width={11}
                    height={11}
                    rx={2.5}
                    fill={id === "trades.dlq" ? DEAD_COLOR : packetColor({ msg: m, kind: "route", from: "", to: "", t: 0 })}
                    opacity={m.redelivered ? 0.55 : 1}
                  />
                ))}
                <text x={n.x - w / 2 + 8} y={n.y + 20} fontSize={10.5} className="fill-zinc-400" fontFamily="JetBrains Mono, monospace">
                  {queue.messages.length}
                  {queue.dropped ? ` ·${queue.dropped}↓` : ""}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {b.packets.map((p, i) => {
        const a = LAYOUT[p.from];
        const z = LAYOUT[p.to];
        if (!a || !z) return null;
        const t = p.t < 0.5 ? 2 * p.t * p.t : 1 - (-2 * p.t + 2) ** 2 / 2;
        const mine = selectedTrade && p.msg.payload?.tradeId === selectedTrade;
        return (
          <g key={`${p.msg.id}-${p.kind}-${p.to}-${i}`}>
            {mine && <circle cx={a.x + (z.x - a.x) * t} cy={a.y + (z.y - a.y) * t} r={11} fill="none" stroke={packetColor(p)} strokeWidth={2} />}
            <circle cx={a.x + (z.x - a.x) * t} cy={a.y + (z.y - a.y) * t} r={6} fill={packetColor(p)} />
          </g>
        );
      })}
    </svg>
  );
}
