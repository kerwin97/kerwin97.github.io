import type { TradeRequest } from "./pricing";
import type { TradeStatus } from "./engine";

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});

export const usd = (n: number) => usdFmt.format(Math.round(n));

export const notionalLabel = (r: Pick<TradeRequest, "cls" | "instrument" | "notional">) => {
  const ccy = r.cls === "fx" ? r.instrument.slice(0, 3) : "USD";
  return `${ccy} ${r.notional / 1e6}m`;
};

export const STATUS_STYLE: Record<TradeStatus, string> = {
  published: "bg-zinc-800 text-zinc-300",
  queued: "bg-blue-500/15 text-blue-400",
  processing: "bg-amber-500/15 text-amber-400",
  requeued: "bg-amber-500/15 text-amber-400",
  "dead-lettered": "bg-red-500/15 text-red-400",
  booked: "bg-emerald-500/15 text-emerald-400",
};

export const pnlClass = (n: number) => (n > 0.5 ? "text-emerald-400" : n < -0.5 ? "text-red-400" : "text-zinc-300");
