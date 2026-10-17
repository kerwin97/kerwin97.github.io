import type { AssetClass, Instrument } from "./market";

export type Product = "linear" | "option";
export type OptionType = "payer" | "receiver" | "call" | "put";

export interface TradeRequest {
  cls: AssetClass;
  product: Product;
  instrument: string;
  side: 1 | -1;
  optionType?: OptionType;
  notional: number;
  tag?: "IMM";
}

export interface BookedTrade extends TradeRequest {
  id: string;
  entryLevel: number;
  entryVol: number;
  strike?: number;
  expiry?: number;
  premium?: number;
}

export interface Valuation {
  tradeId: string;
  level: number;
  vol: number;
  pnl: number;
  delta: number;
  vega: number;
}

export const OPTION_EXPIRY: Record<AssetClass, number> = { ir: 1, fx: 0.5, credit: 0.25 };

export const PRODUCT_LABEL: Record<AssetClass, Record<Product, string>> = {
  ir: { linear: "Interest rate swap", option: "Swaption" },
  fx: { linear: "FX forward", option: "FX option" },
  credit: { linear: "Index CDS", option: "Index option" },
};

export const SIDE_LABEL: Record<AssetClass, Record<Product, [string, string]>> = {
  ir: { linear: ["Pay fixed", "Receive fixed"], option: ["Buy", "Sell"] },
  fx: { linear: ["Buy base", "Sell base"], option: ["Buy", "Sell"] },
  credit: { linear: ["Buy protection", "Sell protection"], option: ["Buy", "Sell"] },
};

export const DELTA_UNIT: Record<AssetClass, string> = { ir: "DV01 $/bp", fx: "$ per 1%", credit: "CS01 $/bp" };
export const VEGA_UNIT: Record<AssetClass, string> = { ir: "$ per bp vol", fx: "$ per vol pt", credit: "$ per bp vol" };

// Abramowitz–Stegun approximation of the standard normal CDF.
export function normCdf(x: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}
export const normPdf = (x: number) => 0.3989422804014327 * Math.exp((-x * x) / 2);

// Bachelier (normal) model, all in bp. Returns premium per unit annuity, delta, vega.
function bachelier(F: number, K: number, volBp: number, T: number, payer: boolean) {
  const s = volBp * Math.sqrt(T);
  const d = (F - K) / s;
  const price = payer ? (F - K) * normCdf(d) + s * normPdf(d) : (K - F) * normCdf(-d) + s * normPdf(d);
  const delta = payer ? normCdf(d) : -normCdf(-d);
  return { price, delta, vega: Math.sqrt(T) * normPdf(d) };
}

// Garman–Kohlhagen with zero rates. Prices per unit of base currency, in quote currency.
function blackFx(S: number, K: number, volPct: number, T: number, call: boolean) {
  const v = volPct / 100;
  const d1 = (Math.log(S / K) + (v * v * T) / 2) / (v * Math.sqrt(T));
  const d2 = d1 - v * Math.sqrt(T);
  const price = call ? S * normCdf(d1) - K * normCdf(d2) : K * normCdf(-d2) - S * normCdf(-d1);
  return { price, delta: call ? normCdf(d1) : normCdf(d1) - 1, vega: S * normPdf(d1) * Math.sqrt(T) * 0.01 };
}

const toBp = (inst: Pick<Instrument, "cls" | "level">, level: number) => (inst.cls === "ir" ? level * 100 : level);

function optionPremium(t: TradeRequest, inst: Instrument, level: number, vol: number, strike: number) {
  const T = OPTION_EXPIRY[t.cls];
  if (t.cls === "fx") return blackFx(level, strike, vol, T, t.optionType === "call").price;
  return bachelier(toBp(inst, level), toBp(inst, strike), vol, T, t.optionType === "payer").price;
}

export function book(id: string, req: TradeRequest, inst: Instrument): BookedTrade {
  const trade: BookedTrade = { ...req, id, entryLevel: inst.level, entryVol: inst.vol };
  if (req.product === "option") {
    trade.strike = inst.level;
    trade.expiry = OPTION_EXPIRY[req.cls];
    trade.premium = optionPremium(req, inst, inst.level, inst.vol, inst.level);
  }
  return trade;
}

export function value(t: BookedTrade, inst: Instrument): Valuation {
  const { level, vol } = inst;
  const base = { tradeId: t.id, level, vol };

  if (t.cls === "fx") {
    const usd = (quoteAmount: number) => (inst.quoteCcy === "JPY" ? quoteAmount / level : quoteAmount);
    if (t.product === "linear") {
      return {
        ...base,
        pnl: usd(t.side * t.notional * (level - t.entryLevel)),
        delta: usd(t.side * t.notional * level * 0.01),
        vega: 0,
      };
    }
    const g = blackFx(level, t.strike!, vol, t.expiry!, t.optionType === "call");
    return {
      ...base,
      pnl: usd(t.side * t.notional * (g.price - t.premium!)),
      delta: usd(t.side * t.notional * g.delta * level * 0.01),
      vega: usd(t.side * t.notional * g.vega),
    };
  }

  // Rates and credit: risk scales with notional × annuity per bp.
  const bpValue = t.notional * inst.annuity! * 1e-4;
  if (t.product === "linear") {
    const moveBp = toBp(inst, level) - toBp(inst, t.entryLevel);
    return { ...base, pnl: t.side * moveBp * bpValue, delta: t.side * bpValue, vega: 0 };
  }
  const b = bachelier(toBp(inst, level), toBp(inst, t.strike!), vol, t.expiry!, t.optionType === "payer");
  return {
    ...base,
    pnl: t.side * (b.price - t.premium!) * bpValue,
    delta: t.side * b.delta * bpValue,
    vega: t.side * b.vega * bpValue,
  };
}
