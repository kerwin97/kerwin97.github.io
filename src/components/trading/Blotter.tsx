import type { TradingEngine, TradeRecord } from "./engine";
import { CLASS_COLOR, CLASS_LABEL, formatLevel, formatVol, type AssetClass } from "./market";
import { DELTA_UNIT, PRODUCT_LABEL, SIDE_LABEL, VEGA_UNIT } from "./pricing";
import { STATUS_STYLE, notionalLabel, pnlClass, usd } from "./format";

const CLASSES: AssetClass[] = ["ir", "fx", "credit"];

export function RiskSummary({ engine }: { engine: TradingEngine }) {
  const totals = engine.totals();
  const pnl = CLASSES.reduce((s, c) => s + totals[c].pnl, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="text-sm font-semibold text-zinc-200">Risk by asset class</h4>
        <p className="text-sm">
          <span className="text-zinc-500 mr-2">Total P&amp;L</span>
          <span className={`font-mono font-semibold ${pnlClass(pnl)}`}>{usd(pnl)}</span>
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {CLASSES.map((c) => (
          <div key={c} className="bg-zinc-950 border border-zinc-800 rounded-md p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ background: CLASS_COLOR[c] }} />
              {CLASS_LABEL[c]}
              <span className="text-zinc-500 font-normal">· {totals[c].count}</span>
            </p>
            <dl className="space-y-1 text-[11px]">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">P&amp;L</dt>
                <dd className={`font-mono ${pnlClass(totals[c].pnl)}`}>{usd(totals[c].pnl)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500" title={DELTA_UNIT[c]}>Delta</dt>
                <dd className="font-mono text-zinc-200">{usd(totals[c].delta)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500" title={VEGA_UNIT[c]}>Vega</dt>
                <dd className="font-mono text-zinc-200">{usd(totals[c].vega)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function sideText(r: TradeRecord) {
  const q = r.request;
  const side = SIDE_LABEL[q.cls][q.product][q.side === 1 ? 0 : 1];
  return q.optionType ? `${side} ${q.optionType}` : side;
}

export function BlotterTable({
  engine,
  selected,
  onSelect,
}: {
  engine: TradingEngine;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  if (!engine.order.length) {
    return (
      <p className="text-sm text-zinc-500 py-8 text-center">
        No trades yet. Publish one from the ticket and follow it through the pipeline.
      </p>
    );
  }
  return (
    <div className="overflow-auto max-h-96 -mx-1">
      <table className="w-full text-xs min-w-[640px]">
        <thead>
          <tr className="text-left text-zinc-500 border-b border-zinc-800 sticky top-0 bg-zinc-900">
            {["Trade", "Product", "Instrument", "Side", "Notional", "Status", "P&L", "Delta", "Vega"].map((h, i) => (
              <th key={h} className={`font-medium py-2 px-1 ${i >= 6 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {engine.order.map((id) => {
            const r = engine.trades.get(id)!;
            const v = r.valuation;
            const inst = engine.market[r.request.instrument];
            return (
              <tr
                key={id}
                onClick={() => onSelect(id)}
                className={`border-b border-zinc-800/60 cursor-pointer transition-colors ${
                  selected === id ? "bg-emerald-500/10" : "hover:bg-zinc-800/50"
                }`}
              >
                <td className="py-2 px-1 font-mono text-zinc-200">
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: CLASS_COLOR[r.request.cls] }} />
                  {id}
                  {r.request.tag && (
                    <span className="ml-1.5 px-1.5 py-px rounded text-[10px] font-sans font-medium bg-amber-500/15 text-amber-400">{r.request.tag}</span>
                  )}
                </td>
                <td className="py-2 px-1 text-zinc-300">{PRODUCT_LABEL[r.request.cls][r.request.product]}</td>
                <td className="py-2 px-1 text-zinc-300">{inst.label}</td>
                <td className="py-2 px-1 text-zinc-400">{sideText(r)}</td>
                <td className="py-2 px-1 text-zinc-400 font-mono">{notionalLabel(r.request)}</td>
                <td className="py-2 px-1">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                </td>
                <td className={`py-2 px-1 text-right font-mono ${v ? pnlClass(v.pnl) : "text-zinc-600"}`}>{v ? usd(v.pnl) : "—"}</td>
                <td className="py-2 px-1 text-right font-mono text-zinc-300">{v ? usd(v.delta) : "—"}</td>
                <td className="py-2 px-1 text-right font-mono text-zinc-300">{v ? usd(v.vega) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, value, mono = true, className = "" }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div>
      <dt className="text-[11px] text-zinc-500">{label}</dt>
      <dd className={`text-sm ${mono ? "font-mono" : ""} ${className || "text-zinc-200"}`}>{value}</dd>
    </div>
  );
}

export function TradeDetails({ engine, id }: { engine: TradingEngine; id: string }) {
  const r = engine.trades.get(id);
  if (!r) return null;
  const q = r.request;
  const inst = engine.market[q.instrument];
  const b = r.booked;
  const v = r.valuation;
  const asLevel = (level: number) => formatLevel({ ...inst, level });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h4 className="text-sm font-semibold text-zinc-100 font-mono">{id}</h4>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
        {r.attempts > 1 && <span className="text-[11px] text-amber-400">delivered {r.attempts}×</span>}
        <span className="text-xs text-zinc-500">
          {PRODUCT_LABEL[q.cls][q.product]} · {inst.label} · {sideText(r)} · {notionalLabel(q)}
        </span>
      </div>

      {b && v ? (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Field label="Booked at" value={asLevel(b.entryLevel)} />
          <Field label="Risk worker's level" value={asLevel(v.level)} />
          <Field label="Implied vol" value={formatVol({ cls: q.cls, vol: v.vol })} />
          {b.strike !== undefined ? <Field label={`Strike · ${b.expiry}y expiry`} value={asLevel(b.strike)} /> : <Field label="Strike" value="—" />}
          <Field label="P&L" value={usd(v.pnl)} className={pnlClass(v.pnl)} />
          <Field label={`Delta (${DELTA_UNIT[q.cls]})`} value={usd(v.delta)} />
          <Field label={`Vega (${VEGA_UNIT[q.cls]})`} value={q.product === "option" ? usd(v.vega) : "— linear"} />
          <Field label="Routing key" value={`trade.${q.cls}.new`} />
        </dl>
      ) : (
        <p className="text-xs text-zinc-500 mb-4">Risk and P&amp;L appear once the risk worker books the trade and the blotter receives the result.</p>
      )}

      <h5 className="text-xs font-medium text-zinc-400 mb-2">Message lifecycle</h5>
      <ol className="space-y-1 border-l border-zinc-800 pl-3">
        {r.history.map((h, i) => (
          <li key={i} className="text-xs text-zinc-400">
            <span className="font-mono text-zinc-500 mr-2">{(h.at / 1000).toFixed(1)}s</span>
            {h.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
