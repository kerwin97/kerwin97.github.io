import { Broker, type Consumer, type Message } from "./broker";
import { initialMarket, snapshot, tick, type AssetClass, type Instrument, type MarketData } from "./market";
import { book, value, type BookedTrade, type TradeRequest, type Valuation } from "./pricing";

export type TradeStatus = "published" | "queued" | "processing" | "requeued" | "dead-lettered" | "booked";

export interface TradeRecord {
  id: string;
  request: TradeRequest;
  status: TradeStatus;
  attempts: number;
  booked?: BookedTrade;
  valuation?: Valuation;
  publishedAt: number;
  bookedAt?: number;
  history: { at: number; text: string }[];
}

export interface PipelineMetrics {
  depth: number;
  inFlight: number;
  avgLatencyMs: number | null;
  throughput: number;
  etaMs: number;
  pendingBurst: number;
}

interface TradeMsg {
  tradeId: string;
  request: TradeRequest;
}
interface MdMsg {
  cls: AssetClass;
  instruments: Instrument[];
}
interface RiskMsg {
  type: "booked" | "update";
  trades: { trade: BookedTrade; valuation: Valuation }[];
}

const LEG_MS = 420;
const MD_INTERVAL_MS = 1600;
const FAILURE_RATE = 0.35;
const CLASSES: AssetClass[] = ["ir", "fx", "credit"];
const BOOKING_MS = 500;
export const MAX_WORKERS = 10;
const BURST_GAP_MS = 35;
const LATENCY_WINDOW = 20;
const THROUGHPUT_WINDOW_MS = 10_000;

export const NODES = {
  mdWorker: "md-worker",
  ticket: "ticket",
  risk: "risk-worker",
  blotter: "blotter",
} as const;

export class TradingEngine {
  broker: Broker;
  market: MarketData = initialMarket();
  // The risk worker only knows the market data it has consumed.
  riskCache: MarketData = initialMarket();
  riskBook = new Map<string, BookedTrade>();
  trades = new Map<string, TradeRecord>();
  order: string[] = [];
  mdRunning = true;
  failures = false;
  ticks = 0;
  private mdAcc = 0;
  private nextTrade = 1;
  private burst: TradeRequest[] = [];
  private burstAcc = 0;
  private bookedTimes: number[] = [];
  riskTradeConsumers: Consumer[] = [];
  riskMdConsumer: Consumer;

  constructor() {
    const b = new Broker(LEG_MS, {
      onEnqueue: (q, m) => this.tradeEvent(m, q === "trades.dlq" ? "dead-lettered" : q === "risk.trades" ? "queued" : null, `enqueued on ${q}`),
      onDeliver: (q, m) => q === "risk.trades" && this.tradeEvent(m, "processing", `delivered to risk worker (attempt ${m.deliveryCount})`),
      onNack: (q, m, dead) => q === "risk.trades" && this.tradeEvent(m, dead ? null : "requeued", dead ? "nacked, retries exhausted → trades.dlx" : "nacked, requeued"),
    });
    this.broker = b;

    b.declareExchange("md.ticks", "topic");
    b.declareExchange("trades", "topic");
    b.declareExchange("trades.dlx", "fanout");
    b.declareExchange("risk.results", "fanout");

    b.declareQueue("risk.md", { maxLength: 25 });
    b.declareQueue("risk.trades", { deadLetterExchange: "trades.dlx", maxDeliveries: 3 });
    b.declareQueue("trades.dlq");
    b.declareQueue("ui.blotter");

    b.bind("md.ticks", "risk.md", "md.#");
    b.bind("trades", "risk.trades", "trade.*.new");
    b.bind("trades.dlx", "trades.dlq");
    b.bind("risk.results", "ui.blotter");

    this.setWorkerCount(1);
    this.riskMdConsumer = b.consume({
      tag: "risk-worker",
      queue: "risk.md",
      node: NODES.risk,
      prefetch: 3,
      processMs: 180,
      handle: (m) => this.onMarketData(m as Message<MdMsg>),
    });
    b.consume({
      tag: "blotter",
      queue: "ui.blotter",
      node: NODES.blotter,
      prefetch: 10,
      processMs: 120,
      handle: (m) => this.onRiskResult(m as Message<RiskMsg>),
    });
  }

  get riskPaused() {
    return this.riskMdConsumer?.paused ?? false;
  }

  get workerCount() {
    return this.riskTradeConsumers.length;
  }

  // Competing consumers on risk.trades: each trade goes to exactly one worker.
  setWorkerCount(n: number) {
    n = Math.max(1, Math.min(MAX_WORKERS, n));
    while (this.riskTradeConsumers.length < n) {
      const c = this.broker.consume({
        tag: `risk-worker-${this.riskTradeConsumers.length + 1}`,
        queue: "risk.trades",
        node: NODES.risk,
        prefetch: 1,
        processMs: BOOKING_MS,
        handle: (m, c) => this.onTrade(m as Message<TradeMsg>, c.tag),
      });
      c.paused = this.riskPaused;
      this.riskTradeConsumers.push(c);
      if (this.riskTradeConsumers.length > 1) this.broker.write("info", `${c.tag}: basic.consume risk.trades`);
    }
    while (this.riskTradeConsumers.length > n) {
      this.broker.cancel(this.riskTradeConsumers.pop()!);
    }
  }

  isWorkerBusy(i: number) {
    const c = this.riskTradeConsumers[i];
    return this.broker.inFlightFor(c) > 0;
  }

  setRiskPaused(paused: boolean) {
    for (const c of this.riskTradeConsumers) c.paused = paused;
    this.riskMdConsumer.paused = paused;
    this.broker.write("info", paused ? "risk-worker: basic.cancel (consumer stopped)" : "risk-worker: basic.consume (consumer resumed)");
  }

  step(dt: number) {
    if (this.mdRunning) {
      this.mdAcc += dt;
      if (this.mdAcc >= MD_INTERVAL_MS) {
        this.mdAcc = 0;
        this.publishMarketData();
      }
    }
    if (this.burst.length) {
      this.burstAcc += dt;
      while (this.burst.length && this.burstAcc >= BURST_GAP_MS) {
        this.burstAcc -= BURST_GAP_MS;
        this.submitTrade(this.burst.shift()!);
      }
    }
    this.broker.step(dt);
  }

  // IMM dates concentrate fixings: IMM-dated swaps and FX forwards, plus index CDS around the roll.
  simulateImmBurst(count = 80) {
    const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
    const ids = (cls: AssetClass) => Object.values(this.market).filter((i) => i.cls === cls).map((i) => i.id);
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const cls: AssetClass = r < 0.6 ? "ir" : r < 0.9 ? "fx" : "credit";
      this.burst.push({
        cls,
        product: "linear",
        instrument: pick(ids(cls)),
        side: pick([1, -1] as const),
        notional: pick([5e6, 10e6, 25e6, 50e6]),
        tag: "IMM",
      });
    }
    this.broker.write("info", `IMM fixing burst: ${count} trades incoming`);
  }

  metrics(): PipelineMetrics {
    const q = this.broker.queues.get("risk.trades")!;
    const inFlight = this.riskTradeConsumers.reduce((s, c) => s + this.broker.inFlightFor(c), 0);
    const now = this.broker.clock;
    this.bookedTimes = this.bookedTimes.filter((t) => now - t < THROUGHPUT_WINDOW_MS);
    const recent = [...this.trades.values()]
      .filter((r) => r.bookedAt !== undefined)
      .sort((a, b) => b.bookedAt! - a.bookedAt!)
      .slice(0, LATENCY_WINDOW);
    const avgLatencyMs = recent.length ? recent.reduce((s, r) => s + (r.bookedAt! - r.publishedAt), 0) / recent.length : null;
    const perTradeMs = this.broker.legMs + BOOKING_MS;
    const inTransit = this.broker.packets.filter((p) => p.msg.exchange === "trades" && (p.kind === "publish" || p.kind === "route")).length;
    const waiting = q.messages.length + this.burst.length + inTransit;
    return {
      depth: q.messages.length,
      inFlight,
      avgLatencyMs,
      throughput: this.bookedTimes.length / (THROUGHPUT_WINDOW_MS / 1000),
      etaMs: this.riskPaused ? Infinity : (waiting * perTradeMs) / this.workerCount,
      pendingBurst: this.burst.length,
    };
  }

  submitTrade(request: TradeRequest) {
    const id = `T-${String(this.nextTrade++).padStart(4, "0")}`;
    this.trades.set(id, { id, request, status: "published", attempts: 0, history: [], publishedAt: this.broker.clock });
    this.order.unshift(id);
    this.log(id, "published to trades exchange");
    this.broker.publish(NODES.ticket, "trades", routingKeyFor(request), { tradeId: id, request } satisfies TradeMsg);
    return id;
  }

  replayDeadLetters() {
    const n = this.broker.shovel("trades.dlq", "trades");
    for (const rec of this.trades.values()) {
      if (rec.status === "dead-lettered") {
        rec.status = "published";
        rec.attempts = 0;
        rec.publishedAt = this.broker.clock;
        this.log(rec.id, "replayed from trades.dlq");
      }
    }
    return n;
  }

  private publishMarketData() {
    tick(this.market);
    this.ticks++;
    for (const cls of CLASSES) {
      this.broker.publish(NODES.mdWorker, "md.ticks", `md.${cls}`, { cls, instruments: snapshot(this.market, cls) } satisfies MdMsg);
    }
  }

  private onTrade(m: Message<TradeMsg>, worker: string): "ack" | "nack" {
    const { tradeId, request } = m.payload;
    if (this.failures && Math.random() < FAILURE_RATE) {
      this.broker.write("info", `${worker}: ${tradeId} reference data lookup timed out`);
      return "nack";
    }
    this.log(tradeId, `booked by ${worker}`);
    const trade = book(tradeId, request, this.riskCache[request.instrument]);
    this.riskBook.set(tradeId, trade);
    const valuation = value(trade, this.riskCache[request.instrument]);
    this.broker.publish(NODES.risk, "risk.results", `risk.${request.cls}.booked`, { type: "booked", trades: [{ trade, valuation }] } satisfies RiskMsg);
    return "ack";
  }

  private onMarketData(m: Message<MdMsg>): "ack" {
    for (const inst of m.payload.instruments) this.riskCache[inst.id] = { ...inst };
    const trades = [...this.riskBook.values()]
      .filter((t) => t.cls === m.payload.cls)
      .map((trade) => ({ trade, valuation: value(trade, this.riskCache[trade.instrument]) }));
    if (trades.length) {
      this.broker.publish(NODES.risk, "risk.results", `risk.${m.payload.cls}.update`, { type: "update", trades } satisfies RiskMsg);
    }
    return "ack";
  }

  private onRiskResult(m: Message<RiskMsg>): "ack" {
    for (const { trade, valuation } of m.payload.trades) {
      const rec = this.trades.get(trade.id);
      if (!rec) continue;
      rec.booked = trade;
      rec.valuation = valuation;
      if (m.payload.type === "booked") {
        rec.status = "booked";
        rec.bookedAt = this.broker.clock;
        this.bookedTimes.push(this.broker.clock);
        this.log(trade.id, "booked, risk and P&L received by blotter");
      }
    }
    return "ack";
  }

  private tradeEvent(m: Message, status: TradeStatus | null, text: string) {
    const id = (m.payload as Partial<TradeMsg>)?.tradeId;
    if (!id) return;
    const rec = this.trades.get(id);
    if (!rec) return;
    if (status) rec.status = status;
    if (status === "processing") rec.attempts = m.deliveryCount;
    this.log(id, text);
  }

  private log(id: string, text: string) {
    this.trades.get(id)?.history.push({ at: this.broker.clock, text });
  }

  totals() {
    const by = Object.fromEntries(CLASSES.map((c) => [c, { pnl: 0, delta: 0, vega: 0, count: 0 }])) as Record<
      AssetClass,
      { pnl: number; delta: number; vega: number; count: number }
    >;
    for (const rec of this.trades.values()) {
      if (!rec.valuation) continue;
      const row = by[rec.request.cls];
      row.pnl += rec.valuation.pnl;
      row.delta += rec.valuation.delta;
      row.vega += rec.valuation.vega;
      row.count++;
    }
    return by;
  }
}

export function routingKeyFor(r: TradeRequest) {
  return `trade.${r.cls}.new`;
}
