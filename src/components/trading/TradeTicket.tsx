import { useState } from "react";
import { Send, Shuffle } from "lucide-react";
import { routingKeyFor, type TradingEngine } from "./engine";
import { CLASS_LABEL, formatLevel, type AssetClass } from "./market";
import { PRODUCT_LABEL, SIDE_LABEL, type OptionType, type Product, type TradeRequest } from "./pricing";

const NOTIONALS = [1e6, 5e6, 10e6, 25e6, 50e6, 100e6];
const CLASSES: AssetClass[] = ["ir", "fx", "credit"];
const OPTION_TYPES: Record<AssetClass, OptionType[]> = {
  ir: ["payer", "receiver"],
  fx: ["call", "put"],
  credit: ["payer", "receiver"],
};

const selectClass =
  "w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500";
const labelClass = "block text-xs text-zinc-500 mb-1";

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-md border border-zinc-700 overflow-hidden">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
            o.value === value ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export function TradeTicket({ engine, onPublished }: { engine: TradingEngine; onPublished: (id: string) => void }) {
  const instrumentsFor = (cls: AssetClass) => Object.values(engine.market).filter((i) => i.cls === cls);
  const [req, setReq] = useState<TradeRequest>({
    cls: "ir",
    product: "linear",
    instrument: "USD.SOFR.10Y",
    side: 1,
    notional: 25e6,
  });

  const setClass = (cls: AssetClass) =>
    setReq((r) => ({ ...r, cls, instrument: instrumentsFor(cls)[0].id, optionType: r.product === "option" ? OPTION_TYPES[cls][0] : undefined }));
  const setProduct = (product: Product) =>
    setReq((r) => ({ ...r, product, optionType: product === "option" ? OPTION_TYPES[r.cls][0] : undefined }));

  const randomize = () => {
    const cls = pick(CLASSES);
    const product = pick<Product>(["linear", "option"]);
    setReq({
      cls,
      product,
      instrument: pick(instrumentsFor(cls)).id,
      side: pick<1 | -1>([1, -1]),
      optionType: product === "option" ? pick(OPTION_TYPES[cls]) : undefined,
      notional: pick(NOTIONALS),
    });
  };

  const sides = SIDE_LABEL[req.cls][req.product];
  const inst = engine.market[req.instrument];
  const preview = {
    exchange: "trades",
    routing_key: routingKeyFor(req),
    properties: { delivery_mode: 2, content_type: "application/json" },
    body: { tradeId: "assigned on publish", ...req },
  };

  return (
    <div className="space-y-3">
      <div>
        <span className={labelClass}>Asset class</span>
        <Segmented value={req.cls} options={CLASSES.map((c) => ({ value: c, label: CLASS_LABEL[c] }))} onChange={setClass} />
      </div>
      <div>
        <span className={labelClass}>Product</span>
        <Segmented
          value={req.product}
          options={(["linear", "option"] as Product[]).map((p) => ({ value: p, label: PRODUCT_LABEL[req.cls][p] }))}
          onChange={setProduct}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelClass}>Instrument</span>
          <select className={selectClass} value={req.instrument} onChange={(e) => setReq((r) => ({ ...r, instrument: e.target.value }))}>
            {instrumentsFor(req.cls).map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Notional</span>
          <select className={selectClass} value={req.notional} onChange={(e) => setReq((r) => ({ ...r, notional: Number(e.target.value) }))}>
            {NOTIONALS.map((n) => (
              <option key={n} value={n}>
                {req.cls === "fx" ? req.instrument.slice(0, 3) : "USD"} {n / 1e6}m
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <span className={labelClass}>Direction</span>
        <Segmented
          value={req.side}
          options={[
            { value: 1 as const, label: sides[0] },
            { value: -1 as const, label: sides[1] },
          ]}
          onChange={(side) => setReq((r) => ({ ...r, side }))}
        />
      </div>
      {req.product === "option" && (
        <div>
          <span className={labelClass}>Option type · struck at the money</span>
          <Segmented
            value={req.optionType!}
            options={OPTION_TYPES[req.cls].map((o) => ({ value: o, label: o[0].toUpperCase() + o.slice(1) }))}
            onChange={(optionType) => setReq((r) => ({ ...r, optionType }))}
          />
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Live {inst.label}: <span className="font-mono text-zinc-300">{formatLevel(inst)}</span>
      </p>

      <details className="group">
        <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">Message preview</summary>
        <pre className="mt-2 text-[11px] leading-relaxed bg-zinc-950 border border-zinc-800 rounded-md p-3 overflow-x-auto text-zinc-300">
          {JSON.stringify(preview, null, 2)}
        </pre>
      </details>

      <div className="flex gap-2">
        <button
          onClick={() => onPublished(engine.submitTrade(req))}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded transition-colors"
        >
          <Send size={14} /> Publish trade
        </button>
        <button
          onClick={randomize}
          aria-label="Fill the ticket with a random trade"
          title="Random trade"
          className="inline-flex items-center justify-center w-10 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors"
        >
          <Shuffle size={15} />
        </button>
      </div>
    </div>
  );
}
