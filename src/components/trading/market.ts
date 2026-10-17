export type AssetClass = "ir" | "fx" | "credit";

export interface Instrument {
  id: string;
  cls: AssetClass;
  label: string;
  level: number; // IR: rate %, FX: spot, Credit: spread bp
  vol: number; // IR/Credit: normal vol bp/yr, FX: lognormal vol %
  annuity?: number; // IR/Credit: risky annuity in years
  quoteCcy?: "USD" | "JPY";
}

export type MarketData = Record<string, Instrument>;

export const CLASS_LABEL: Record<AssetClass, string> = { ir: "Rates", fx: "FX", credit: "Credit" };
export const CLASS_COLOR: Record<AssetClass, string> = { ir: "#3b82f6", fx: "#10b981", credit: "#f59e0b" };

export function initialMarket(): MarketData {
  const list: Instrument[] = [
    { id: "USD.SOFR.2Y", cls: "ir", label: "USD SOFR 2Y", level: 4.1, vol: 95, annuity: 1.9 },
    { id: "USD.SOFR.5Y", cls: "ir", label: "USD SOFR 5Y", level: 3.85, vol: 105, annuity: 4.5 },
    { id: "USD.SOFR.10Y", cls: "ir", label: "USD SOFR 10Y", level: 3.95, vol: 100, annuity: 8.3 },
    { id: "EURUSD", cls: "fx", label: "EUR/USD", level: 1.085, vol: 7.5, quoteCcy: "USD" },
    { id: "GBPUSD", cls: "fx", label: "GBP/USD", level: 1.27, vol: 8.0, quoteCcy: "USD" },
    { id: "USDJPY", cls: "fx", label: "USD/JPY", level: 151.2, vol: 9.5, quoteCcy: "JPY" },
    { id: "CDX.IG.5Y", cls: "credit", label: "CDX IG 5Y", level: 55, vol: 25, annuity: 4.5 },
    { id: "CDX.HY.5Y", cls: "credit", label: "CDX HY 5Y", level: 330, vol: 110, annuity: 4.2 },
    { id: "ITRX.MAIN.5Y", cls: "credit", label: "iTraxx Main 5Y", level: 60, vol: 28, annuity: 4.5 },
  ];
  return Object.fromEntries(list.map((i) => [i.id, i]));
}

const gauss = () => {
  const u = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
};
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function tick(m: MarketData) {
  for (const i of Object.values(m)) {
    if (i.cls === "ir") {
      i.level = clamp(i.level + gauss() * 0.012, 0.5, 9);
      i.vol = clamp(i.vol + gauss() * 0.8, 40, 200);
    } else if (i.cls === "fx") {
      i.level *= Math.exp(gauss() * 0.0012);
      i.vol = clamp(i.vol + gauss() * 0.08, 4, 20);
    } else {
      i.level = clamp(i.level + gauss() * i.level * 0.012, 5, 1500);
      i.vol = clamp(i.vol + gauss() * 1, 10, 250);
    }
  }
}

export function snapshot(m: MarketData, cls: AssetClass) {
  return Object.values(m)
    .filter((i) => i.cls === cls)
    .map((i) => ({ ...i }));
}

export function formatLevel(i: Pick<Instrument, "cls" | "level" | "quoteCcy">) {
  if (i.cls === "ir") return `${i.level.toFixed(3)}%`;
  if (i.cls === "credit") return `${i.level.toFixed(1)}bp`;
  return i.level.toFixed(i.quoteCcy === "JPY" ? 2 : 4);
}

export function formatVol(i: Pick<Instrument, "cls" | "vol">) {
  return i.cls === "fx" ? `${i.vol.toFixed(2)}%` : `${i.vol.toFixed(1)}bp`;
}
