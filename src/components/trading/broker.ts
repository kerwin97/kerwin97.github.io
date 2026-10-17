export type ExchangeType = "topic" | "fanout";
export type PacketKind = "publish" | "route" | "deliver" | "requeue" | "deadletter";
export type LogKind = "publish" | "route" | "deliver" | "ack" | "nack" | "dlx" | "drop" | "info";

export interface Message<P = any> {
  id: number;
  exchange: string;
  routingKey: string;
  payload: P;
  deliveryCount: number;
  redelivered: boolean;
}

export interface QueueOptions {
  maxLength?: number;
  deadLetterExchange?: string;
  maxDeliveries?: number;
}

export interface Queue extends QueueOptions {
  name: string;
  messages: Message[];
  dropped: number;
  enqueued: number;
}

export interface Consumer {
  tag: string;
  queue: string;
  node: string;
  prefetch: number;
  processMs: number;
  paused: boolean;
  handle: (msg: Message, consumer: Consumer) => "ack" | "nack";
}

export interface Packet {
  msg: Message;
  kind: PacketKind;
  from: string;
  to: string;
  t: number;
  consumer?: Consumer;
}

export interface LogLine {
  id: number;
  at: number;
  kind: LogKind;
  text: string;
}

interface Unacked {
  msg: Message;
  tag: number;
  consumer: Consumer;
  remaining: number;
}

export interface BrokerEvents {
  onEnqueue?: (queue: string, msg: Message) => void;
  onDeliver?: (queue: string, msg: Message) => void;
  onNack?: (queue: string, msg: Message, deadLettered: boolean) => void;
}

const LOG_LIMIT = 80;

// AMQP topic matching: "*" is exactly one word, "#" is zero or more words.
export function topicMatches(pattern: string, key: string): boolean {
  const p = pattern.split(".");
  const k = key.split(".");
  const match = (i: number, j: number): boolean => {
    if (i === p.length) return j === k.length;
    if (p[i] === "#") return match(i + 1, j) || (j < k.length && match(i, j + 1));
    if (j === k.length) return false;
    return (p[i] === "*" || p[i] === k[j]) && match(i + 1, j + 1);
  };
  return match(0, 0);
}

export class Broker {
  exchanges = new Map<string, ExchangeType>();
  bindings: { exchange: string; queue: string; pattern: string }[] = [];
  queues = new Map<string, Queue>();
  consumers: Consumer[] = [];
  packets: Packet[] = [];
  unacked: Unacked[] = [];
  log: LogLine[] = [];
  clock = 0;
  private nextId = 1;
  private nextTag = 1;
  private nextLog = 1;

  constructor(public legMs: number, public events: BrokerEvents = {}) {}

  declareExchange(name: string, type: ExchangeType) {
    this.exchanges.set(name, type);
  }

  declareQueue(name: string, opts: QueueOptions = {}) {
    this.queues.set(name, { name, messages: [], dropped: 0, enqueued: 0, ...opts });
  }

  bind(exchange: string, queue: string, pattern = "#") {
    this.bindings.push({ exchange, queue, pattern });
  }

  consume(c: Omit<Consumer, "paused">) {
    const consumer = { ...c, paused: false };
    this.consumers.push(consumer);
    return consumer;
  }

  publish(fromNode: string, exchange: string, routingKey: string, payload: any) {
    const msg: Message = { id: this.nextId++, exchange, routingKey, payload, deliveryCount: 0, redelivered: false };
    this.packets.push({ msg, kind: "publish", from: fromNode, to: exchange, t: 0 });
    this.write("publish", `basic.publish → ${exchange}  rk=${routingKey}`);
    return msg;
  }

  // Moves a message already sitting in a queue back onto an exchange (a manual shovel).
  shovel(fromQueue: string, exchange: string) {
    const q = this.queues.get(fromQueue)!;
    const moved = q.messages.splice(0);
    for (const m of moved) {
      const msg: Message = { ...m, id: this.nextId++, exchange, deliveryCount: 0, redelivered: false };
      this.packets.push({ msg, kind: "publish", from: fromQueue, to: exchange, t: 0 });
    }
    if (moved.length) this.write("publish", `shovel ${moved.length} msg ${fromQueue} → ${exchange}`);
    return moved.length;
  }

  inFlightFor(consumer: Consumer) {
    return (
      this.unacked.filter((u) => u.consumer === consumer).length +
      this.packets.filter((p) => p.kind === "deliver" && p.consumer === consumer).length
    );
  }

  // basic.cancel: unacked and in-transit deliveries go back to the head of the queue, marked redelivered.
  cancel(consumer: Consumer) {
    this.consumers = this.consumers.filter((c) => c !== consumer);
    const q = this.queues.get(consumer.queue)!;
    const returned = [
      ...this.unacked.filter((u) => u.consumer === consumer).map((u) => u.msg),
      ...this.packets.filter((p) => p.kind === "deliver" && p.consumer === consumer).map((p) => p.msg),
    ];
    this.unacked = this.unacked.filter((u) => u.consumer !== consumer);
    this.packets = this.packets.filter((p) => !(p.kind === "deliver" && p.consumer === consumer));
    for (const msg of returned.reverse()) {
      msg.redelivered = true;
      q.messages.unshift(msg);
      this.events.onNack?.(q.name, msg, false);
    }
    this.write("info", `${consumer.tag}: basic.cancel${returned.length ? `, ${returned.length} unacked requeued` : ""}`);
  }

  step(dt: number) {
    this.clock += dt;

    const moving = this.packets;
    this.packets = [];
    for (const p of moving) {
      p.t += dt / this.legMs;
      if (p.t < 1) this.packets.push(p);
      else this.arrive(p);
    }

    const pending = this.unacked;
    this.unacked = [];
    for (const u of pending) {
      u.remaining -= dt;
      if (u.remaining > 0) {
        this.unacked.push(u);
        continue;
      }
      this.settle(u);
    }

    for (const c of this.consumers) {
      if (c.paused) continue;
      const q = this.queues.get(c.queue)!;
      while (q.messages.length && this.inFlightFor(c) < c.prefetch) {
        const msg = q.messages.shift()!;
        msg.deliveryCount++;
        const tag = this.nextTag++;
        (msg as Message & { tag?: number }).tag = tag;
        this.packets.push({ msg, kind: "deliver", from: q.name, to: c.node, t: 0, consumer: c });
        this.write("deliver", `basic.deliver ${q.name} → ${c.tag}  tag=${tag}${msg.redelivered ? "  redelivered" : ""}`);
        this.events.onDeliver?.(q.name, msg);
      }
    }
  }

  private arrive(p: Packet) {
    if (p.kind === "publish" || p.kind === "deadletter") {
      this.route(p.msg, p.to);
    } else if (p.kind === "route" || p.kind === "requeue") {
      const q = this.queues.get(p.to)!;
      if (p.kind === "requeue") q.messages.unshift(p.msg);
      else this.enqueue(q, p.msg);
    } else {
      const tag = (p.msg as Message & { tag?: number }).tag ?? 0;
      this.unacked.push({ msg: p.msg, tag, consumer: p.consumer!, remaining: p.consumer!.processMs });
    }
  }

  private route(msg: Message, exchange: string) {
    const type = this.exchanges.get(exchange);
    const targets = this.bindings.filter(
      (b) => b.exchange === exchange && (type === "fanout" || topicMatches(b.pattern, msg.routingKey))
    );
    if (!targets.length) {
      this.write("drop", `${exchange}: unroutable rk=${msg.routingKey}, dropped`);
      return;
    }
    for (const b of targets) {
      this.packets.push({ msg: { ...msg }, kind: "route", from: exchange, to: b.queue, t: 0 });
    }
  }

  private enqueue(q: Queue, msg: Message) {
    if (q.maxLength && q.messages.length >= q.maxLength) {
      q.messages.shift();
      q.dropped++;
      this.write("drop", `${q.name}: x-max-length ${q.maxLength} reached, oldest dropped`);
    }
    q.messages.push(msg);
    q.enqueued++;
    this.events.onEnqueue?.(q.name, msg);
  }

  private settle(u: Unacked) {
    const result = u.consumer.handle(u.msg, u.consumer);
    const q = this.queues.get(u.consumer.queue)!;
    if (result === "ack") {
      this.write("ack", `basic.ack ${u.consumer.tag}  tag=${u.tag}`);
      return;
    }
    const dead = !!q.deadLetterExchange && u.msg.deliveryCount >= (q.maxDeliveries ?? Infinity);
    this.events.onNack?.(q.name, u.msg, dead);
    if (dead) {
      this.write("dlx", `basic.nack tag=${u.tag}, delivery ${u.msg.deliveryCount}/${q.maxDeliveries} → dead-letter ${q.deadLetterExchange}`);
      this.packets.push({ msg: u.msg, kind: "deadletter", from: q.name, to: q.deadLetterExchange!, t: 0 });
    } else {
      u.msg.redelivered = true;
      this.write("nack", `basic.nack ${u.consumer.tag}  tag=${u.tag}  requeue=true`);
      this.packets.push({ msg: u.msg, kind: "requeue", from: u.consumer.node, to: q.name, t: 0 });
    }
  }

  write(kind: LogKind, text: string) {
    this.log.push({ id: this.nextLog++, at: this.clock, kind, text });
    if (this.log.length > LOG_LIMIT) this.log.shift();
  }
}
