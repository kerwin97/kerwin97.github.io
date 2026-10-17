import { useEffect, useRef, useState } from "react";
import { Activity, Minus, Pause, Play, Plus, RotateCcw, TriangleAlert, Undo2, Zap } from "lucide-react";
import { DemoModal } from "../ui/DemoModal";
import { MAX_WORKERS, TradingEngine, type PipelineMetrics } from "./engine";
import { PipelineDiagram } from "./PipelineDiagram";
import { TradeTicket } from "./TradeTicket";
import { BlotterTable, RiskSummary, TradeDetails } from "./Blotter";
import { CLASS_COLOR, formatLevel, formatVol } from "./market";
import type { LogKind } from "./broker";

const LOG_COLOR: Record<LogKind, string> = {
  publish: "text-blue-400",
  route: "text-zinc-400",
  deliver: "text-zinc-300",
  ack: "text-emerald-400",
  nack: "text-amber-400",
  dlx: "text-red-400",
  drop: "text-red-400",
  info: "text-violet-400",
};

const IMM_TRADES = 80;

function seconds(ms: number | null) {
  if (ms === null) return "—";
  if (!isFinite(ms)) return "∞";
  return `${(ms / 1000).toFixed(1)}s`;
}

function BacklogPanel({ m, workers }: { m: PipelineMetrics; workers: number }) {
  const backlog = m.depth + m.pendingBurst;
  const struggling = backlog > workers * 6;
  const stats = [
    { label: "risk.trades depth", value: String(m.depth), alert: struggling },
    { label: "Being booked", value: `${m.inFlight} / ${workers}` },
    { label: "Avg publish → booked", value: seconds(m.avgLatencyMs) },
    { label: "Throughput", value: `${m.throughput.toFixed(1)} trades/s` },
    { label: "Time to clear backlog", value: backlog ? seconds(m.etaMs) : "—", alert: struggling },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-md border px-3 py-2 ${s.alert ? "border-red-500/50 bg-red-500/10" : "border-zinc-800 bg-zinc-900"}`}>
            <p className="text-[11px] text-zinc-500">{s.label}</p>
            <p className={`font-mono text-sm font-semibold ${s.alert ? "text-red-400" : "text-zinc-100"}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <p className={`text-xs mt-2 ${struggling ? "text-red-400" : "text-zinc-500"}`}>
        {struggling
          ? `Backlog is building faster than ${workers} worker${workers > 1 ? "s" : ""} can book. Scale out the risk workers to drain it.`
          : "Each worker books one trade at a time. More workers means more trades booked in parallel off the same queue."}
      </p>
    </div>
  );
}

const card = "bg-zinc-900 border border-zinc-800 rounded-lg p-4";
const control = "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors";
const controlOff = "bg-zinc-800 text-zinc-300 border-transparent hover:bg-zinc-700";
const controlOn = "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
const controlWarn = "bg-red-500/15 text-red-400 border-red-500/40";

export function TradeSimulator({ onClose }: { onClose: () => void }) {
  const engineRef = useRef<TradingEngine | null>(null);
  if (!engineRef.current) engineRef.current = new TradingEngine();
  const engine = engineRef.current;
  const [, setFrame] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
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


  const dlqDepth = engine.broker.queues.get("trades.dlq")!.messages.length;
  const toggleRisk = () => {
    engine.setRiskPaused(!engine.riskPaused);
    rerender();
  };

  return (
    <DemoModal
      titleId="trade-sim-title"
      onClose={onClose}
      title={
        <>
          <Activity size={18} className="text-emerald-400" /> FICC trade pipeline
        </>
      }
      description={
        <>
          A simulated RabbitMQ setup. A market data worker streams rates, FX and credit ticks. You publish trades to a
          topic exchange. A risk and P&amp;L worker books them, revalues the book on every tick and fans results out to
          the blotter. Stop the risk worker to watch queues back up, or inject failures to see nacks, redeliveries and
          dead-lettering.
        </>
      }
    >
        <div className="flex flex-wrap gap-2">
          <button
            className={`${control} ${engine.mdRunning ? controlOn : controlOff}`}
            aria-pressed={engine.mdRunning}
            onClick={() => {
              engine.mdRunning = !engine.mdRunning;
              rerender();
            }}
          >
            {engine.mdRunning ? <Pause size={13} /> : <Play size={13} />} Market data feed
          </button>
          <button className={`${control} ${engine.riskPaused ? controlWarn : controlOn}`} aria-pressed={!engine.riskPaused} onClick={toggleRisk}>
            {engine.riskPaused ? <Play size={13} /> : <Pause size={13} />} Risk worker {engine.riskPaused ? "stopped" : "running"}
          </button>
          <div className="inline-flex items-center rounded-full border border-zinc-700 text-xs">
            <button
              aria-label="Remove a risk worker"
              disabled={engine.workerCount <= 1}
              onClick={() => {
                engine.setWorkerCount(engine.workerCount - 1);
                rerender();
              }}
              className="w-8 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
            >
              <Minus size={13} />
            </button>
            <span className="px-1 font-medium text-zinc-200 tabular-nums whitespace-nowrap" aria-live="polite">
              {engine.workerCount} risk worker{engine.workerCount > 1 ? "s" : ""}
            </span>
            <button
              aria-label="Add a risk worker"
              disabled={engine.workerCount >= MAX_WORKERS}
              onClick={() => {
                engine.setWorkerCount(engine.workerCount + 1);
                rerender();
              }}
              className="w-8 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
            >
              <Plus size={13} />
            </button>
          </div>
          <button
            className={`${control} bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25`}
            onClick={() => {
              engine.simulateImmBurst(IMM_TRADES);
              rerender();
            }}
          >
            <Zap size={13} /> Simulate IMM fixing burst ({IMM_TRADES} trades)
          </button>
          <button
            className={`${control} ${engine.failures ? controlWarn : controlOff}`}
            aria-pressed={engine.failures}
            onClick={() => {
              engine.failures = !engine.failures;
              rerender();
            }}
          >
            <TriangleAlert size={13} /> Inject failures
          </button>
          <button
            className={`${control} ${controlOff} disabled:opacity-40 disabled:cursor-not-allowed`}
            disabled={!dlqDepth}
            onClick={() => {
              engine.replayDeadLetters();
              rerender();
            }}
          >
            <Undo2 size={13} /> Replay dead letters ({dlqDepth})
          </button>
          <button
            className={`${control} ${controlOff}`}
            onClick={() => {
              engineRef.current = new TradingEngine();
              setSelected(null);
            }}
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>

        <BacklogPanel m={engine.metrics()} workers={engine.workerCount} />

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 overflow-x-auto">
          <PipelineDiagram engine={engine} selectedTrade={selected} onToggleRisk={toggleRisk} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 pb-1 text-[11px] text-zinc-500">
            {(["ir", "fx", "credit"] as const).map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: CLASS_COLOR[c] }} />
                {c === "ir" ? "Rates" : c === "fx" ? "FX" : "Credit"} messages
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" /> Risk results
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Nacked / dead-lettered
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] gap-4">
          <div className="space-y-4">
            <div className={card}>
              <h4 className="text-sm font-semibold text-zinc-200 mb-3">Trade ticket</h4>
              <TradeTicket engine={engine} onPublished={setSelected} />
            </div>
            <div className={card}>
              <h4 className="text-sm font-semibold text-zinc-200 mb-2">Market data feed</h4>
              <table className="w-full text-xs">
                <tbody>
                  {Object.values(engine.market).map((i) => (
                    <tr key={i.id} className="border-b border-zinc-800/60 last:border-0">
                      <td className="py-1.5 text-zinc-300">
                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: CLASS_COLOR[i.cls] }} />
                        {i.label}
                      </td>
                      <td className="py-1.5 text-right font-mono text-zinc-200">{formatLevel(i)}</td>
                      <td className="py-1.5 text-right font-mono text-zinc-500">σ {formatVol(i)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 min-w-0">
            <div className={card}>
              <RiskSummary engine={engine} />
            </div>
            <div className={card}>
              <h4 className="text-sm font-semibold text-zinc-200 mb-2">Blotter</h4>
              <BlotterTable engine={engine} selected={selected} onSelect={setSelected} />
            </div>
            {selected && (
              <div className={card}>
                <TradeDetails engine={engine} id={selected} />
              </div>
            )}
          </div>
        </div>

        <div className={card}>
          <h4 className="text-sm font-semibold text-zinc-200 mb-2">AMQP log</h4>
          <ol className="font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto">
            {[...engine.broker.log].reverse().slice(0, 40).map((l) => (
              <li key={l.id} className="flex gap-3">
                <span className="text-zinc-600 shrink-0 w-12 text-right">{(l.at / 1000).toFixed(1)}s</span>
                <span className={LOG_COLOR[l.kind]}>{l.text}</span>
              </li>
            ))}
          </ol>
        </div>
    </DemoModal>
  );
}
