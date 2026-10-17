import { Microscope, Pause, Play, RotateCcw, SkipForward, Square } from "lucide-react";
import type { BonderEngine, Outcome } from "./engine";
import { PARAMS, PROGRAMS, maxBonds, type Mode } from "./programs";

const RESULT_STYLE: Record<Outcome, string> = {
  PASS: "text-[#4ade80]",
  NSOP: "text-[#f87171]",
  NSOL: "text-[#f87171]",
  SHORT_TAIL: "text-[#f87171]",
  CRATER: "text-[#f87171]",
  LOW_SHEAR: "text-[#fbbf24]",
};

const panel = "rounded-md border border-[#1e293b] bg-[#0f172a] p-3";
const heading = "text-[11px] font-semibold tracking-[0.15em] text-[#67e8f9] mb-2";
const btn = "inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

export function StackLight({ status }: { status: BonderEngine["status"] }) {
  const red = status === "alarm" || status === "aborted";
  const amber = status === "setup" || status === "paused" || status === "done";
  const green = status === "running";
  return (
    <div className="flex flex-col items-center" aria-label={`Machine status: ${status}`} role="img">
      <div className={`w-4 h-3 rounded-t-sm ${red ? "bg-[#ef4444] shadow-[0_0_10px_#ef4444] animate-pulse" : "bg-[#450a0a]"}`} />
      <div className={`w-4 h-3 ${amber ? "bg-[#f59e0b] shadow-[0_0_10px_#f59e0b]" : "bg-[#451a03]"}`} />
      <div className={`w-4 h-3 rounded-b-sm ${green ? "bg-[#22c55e] shadow-[0_0_10px_#22c55e]" : "bg-[#052e16]"}`} />
      <div className="w-1 h-2 bg-[#475569]" />
    </div>
  );
}

const fmt = (n: number | null | undefined, digits = 1) => (n === null || n === undefined ? "—" : n.toFixed(digits));

export function Console({ engine, rerender, onLook }: { engine: BonderEngine; rerender: () => void; onLook: () => void }) {
  const e = engine;
  const busy = e.status === "running" || e.status === "paused" || e.status === "alarm";
  const stats = e.stats();
  const max = maxBonds(e.program, e.mode);
  const act = (fn: () => void) => () => {
    fn();
    rerender();
  };

  return (
    <div className="rounded-lg border-4 border-[#334155] bg-[#0b1220] p-3 md:p-4 font-mono text-[#cbd5e1] text-xs space-y-3">
      <div className="flex items-center justify-between gap-3 border-b border-[#1e293b] pb-2">
        <div>
          <p className="text-[#67e8f9] font-semibold tracking-[0.2em] text-[11px]">BALL BONDER CONTROL · SIM</p>
          <p className="text-[#64748b] text-[11px]">
            Status <span className="text-[#e2e8f0] uppercase">{e.status}</span> · Run time {(e.elapsedMs / 1000).toFixed(1)}s
          </p>
        </div>
        <StackLight status={e.status} />
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <section className={panel}>
          <h4 className={heading}>1 · PROGRAM</h4>
          <div className="space-y-1.5">
            {PROGRAMS.map((p) => (
              <button
                key={p.id}
                disabled={busy}
                onClick={act(() => e.setProgram(p))}
                className={`w-full text-left rounded border px-2.5 py-2 transition-colors disabled:cursor-not-allowed ${
                  e.program.id === p.id ? "border-[#22d3ee] bg-[#083344]" : "border-[#1e293b] hover:border-[#334155]"
                }`}
              >
                <p className="text-[#e2e8f0] font-semibold">{p.name}</p>
                <p className="text-[#64748b] text-[11px]">
                  {p.device} · ball {p.ballUm} µm
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className={panel}>
          <h4 className={heading}>2 · SETUP</h4>
          <div className="flex rounded border border-[#1e293b] overflow-hidden mb-3">
            {(["die", "wafer"] as Mode[]).map((m) => (
              <button
                key={m}
                disabled={busy}
                onClick={act(() => e.setMode(m))}
                className={`flex-1 py-1.5 font-semibold disabled:cursor-not-allowed ${e.mode === m ? "bg-[#083344] text-[#67e8f9]" : "text-[#64748b] hover:text-[#cbd5e1]"}`}
              >
                {m === "die" ? "Die · wire bond" : "Wafer · stud bump"}
              </button>
            ))}
          </div>
          <label className="block mb-3">
            <span className="flex justify-between text-[#94a3b8]">
              <span>{e.mode === "die" ? "Wires to bond" : "Bumps to place"}</span>
              <span className="text-[#e2e8f0]">
                {e.bondCount} / {max}
              </span>
            </span>
            <input
              type="range"
              min={1}
              max={max}
              value={e.bondCount}
              disabled={busy}
              onChange={(ev) => {
                e.bondCount = Number(ev.target.value);
                e.reset();
                rerender();
              }}
              className="w-full accent-[#22d3ee]"
            />
          </label>
          {PARAMS.map((d) => {
            const v = e.params[d.key];
            const [lo, hi] = e.program.window[d.key];
            const pct = (x: number) => ((x - d.min) / (d.max - d.min)) * 100;
            const inWindow = v >= lo && v <= hi;
            return (
              <label key={d.key} className="block mb-2.5">
                <span className="flex justify-between text-[#94a3b8]">
                  <span>{d.label}</span>
                  <span className={inWindow ? "text-[#e2e8f0]" : "text-[#f87171]"}>
                    {v} {d.unit}
                  </span>
                </span>
                <span className="relative block h-1.5 rounded bg-[#1e293b] my-1">
                  <span className="absolute inset-y-0 rounded bg-[#14532d]" style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }} />
                  <span className={`absolute -top-0.5 w-1 h-2.5 rounded-sm ${inWindow ? "bg-[#4ade80]" : "bg-[#f87171]"}`} style={{ left: `calc(${pct(v)}% - 2px)` }} />
                </span>
                <input
                  type="range"
                  min={d.min}
                  max={d.max}
                  step={d.step}
                  value={v}
                  aria-label={`${d.label} (${d.unit}), process window ${lo} to ${hi}`}
                  onChange={(ev) => {
                    e.params[d.key] = Number(ev.target.value);
                    rerender();
                  }}
                  className="w-full accent-[#22d3ee]"
                />
              </label>
            );
          })}
          <button
            onClick={act(() => {
              e.params = { ...e.program.defaults };
            })}
            className="text-[11px] text-[#67e8f9] hover:underline"
          >
            Reset to recipe defaults
          </button>
        </section>

        <section className={`${panel} flex flex-col gap-3`}>
          <h4 className={heading}>3 · RUN</h4>
          <div className="flex gap-2">
            {e.status === "running" ? (
              <button className={`${btn} flex-1 bg-[#f59e0b] text-[#0b1220] hover:bg-[#fbbf24]`} onClick={act(() => e.pause())}>
                <Pause size={13} /> Pause
              </button>
            ) : (
              <button
                className={`${btn} flex-1 bg-[#22c55e] text-[#0b1220] hover:bg-[#4ade80]`}
                disabled={e.status === "alarm"}
                onClick={act(() => e.start())}
              >
                <Play size={13} /> {e.status === "paused" ? "Resume" : e.status === "done" || e.status === "aborted" ? "New lot" : "Start bonding"}
              </button>
            )}
            <button className={`${btn} border border-[#334155] hover:bg-[#1e293b]`} onClick={act(() => e.reset())} disabled={e.status === "setup"}>
              <RotateCcw size={13} /> Reset
            </button>
          </div>
          <div>
            <p className="text-[#94a3b8] mb-1">Speed</p>
            <div className="flex rounded border border-[#1e293b] overflow-hidden">
              {[1, 4, 12].map((s) => (
                <button key={s} onClick={act(() => (e.speed = s))} className={`flex-1 py-1 font-semibold ${e.speed === s ? "bg-[#083344] text-[#67e8f9]" : "text-[#64748b]"}`}>
                  {s}×
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[#94a3b8] mb-1">Inject a fault on the next wire</p>
            <div className="flex flex-wrap gap-1.5">
              {(["NSOP", "NSOL", "SHORT_TAIL", "CRATER"] as Outcome[])
                .filter((o) => e.mode === "die" || o !== "NSOL")
                .map((o) => (
                  <button
                    key={o}
                    onClick={act(() => (e.forcedFault = e.forcedFault === o ? null : o))}
                    className={`${btn} border ${e.forcedFault === o ? "border-[#f87171] text-[#f87171] bg-[#450a0a]" : "border-[#334155] hover:bg-[#1e293b]"}`}
                  >
                    {o.replace("_", " ")}
                  </button>
                ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[#94a3b8] mb-1">
              <span>Progress</span>
              <span className="text-[#e2e8f0]">
                {e.records.length} / {e.bondCount}
              </span>
            </div>
            <div className="h-2 rounded bg-[#1e293b] overflow-hidden">
              <div className="h-full bg-[#22d3ee] transition-[width]" style={{ width: `${(100 * e.records.length) / e.bondCount}%` }} />
            </div>
          </div>

          {e.status === "alarm" && e.alarm && (
            <div className="rounded border border-[#ef4444] bg-[#450a0a] p-3 space-y-2" role="alert">
              <p className="text-[#fca5a5] font-semibold">
                {e.alarm.code} · {e.alarm.message} · wire {e.alarm.wire}
              </p>
              <p className="text-[#fecaca] font-sans text-[11px] leading-relaxed">{e.alarm.hint}</p>
              <div className="flex flex-wrap gap-1.5">
                <button className={`${btn} bg-[#22c55e] text-[#0b1220]`} onClick={act(() => e.resolveAlarm("retry"))}>
                  <RotateCcw size={12} /> Retry wire
                </button>
                <button className={`${btn} border border-[#fca5a5] text-[#fca5a5]`} onClick={act(() => e.resolveAlarm("skip"))}>
                  <SkipForward size={12} /> Skip wire
                </button>
                <button className={`${btn} border border-[#fca5a5] text-[#fca5a5]`} onClick={act(() => e.resolveAlarm("abort"))}>
                  <Square size={12} /> Abort lot
                </button>
              </div>
            </div>
          )}

          <button className={`${btn} mt-auto border border-[#22d3ee] text-[#67e8f9] hover:bg-[#083344]`} onClick={onLook}>
            <Microscope size={13} /> Look into the microscope
          </button>
        </section>
      </div>

      <section className={panel}>
        <h4 className={heading}>4 · BOND DATA</h4>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
          {[
            ["Bonded", `${stats.bonded}`],
            ["Yield", stats.yieldPct === null ? "—" : `${fmt(stats.yieldPct)}%`],
            ["Avg ball Ø", stats.avgBallUm === null ? "—" : `${fmt(stats.avgBallUm)} µm`],
            ["Avg shear", stats.avgShearG === null ? "—" : `${fmt(stats.avgShearG)} g`],
            ["Alarms", `${stats.alarms}`],
            ["UPH at speed", stats.uph.toLocaleString()],
          ].map(([k, v]) => (
            <div key={k} className="rounded border border-[#1e293b] px-2 py-1.5">
              <p className="text-[#64748b] text-[10px]">{k}</p>
              <p className="text-[#e2e8f0] text-sm font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <div className="max-h-56 overflow-auto">
          <table className="w-full min-w-[560px]">
            <thead className="sticky top-0 bg-[#0f172a] text-[#64748b]">
              <tr className="text-left">
                {["Wire", "Pad", "Ball Ø µm", "Shear g", "Offset µm", e.mode === "die" ? "Loop µm" : "—", "Tries", "Result"].map((h) => (
                  <th key={h} className="font-normal py-1 pr-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...e.records].reverse().map((r) => (
                <tr key={`${r.wire}-${r.site}`} className="border-t border-[#1e293b]">
                  <td className="py-1 pr-2">{r.wire}</td>
                  <td className="py-1 pr-2">{r.site + 1}</td>
                  <td className="py-1 pr-2">{fmt(r.ballUm)}</td>
                  <td className="py-1 pr-2">{fmt(r.shearG)}</td>
                  <td className="py-1 pr-2">{fmt(r.offsetUm)}</td>
                  <td className="py-1 pr-2">{r.loopUm ?? "—"}</td>
                  <td className="py-1 pr-2">{r.attempts}</td>
                  <td className={`py-1 pr-2 font-semibold ${RESULT_STYLE[r.outcome]}`}>{r.outcome.replace("_", " ")}</td>
                </tr>
              ))}
              {!e.records.length && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-[#64748b]">
                    No bonds yet. Pick a program, set up the job and press Start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-[#475569] font-sans">
          UPH assumes about 70 ms per wire at production speed. The demo runs much slower so each bond is visible. Cratering and low shear
          aren't caught by the machine; they show up here, as they would at inspection.
        </p>
      </section>
    </div>
  );
}
