import { useState } from "react";

// Each sprite: 10 body rows shared by both frames, then 2 leg rows per walking frame. Facing right.
const SPRITES = {
  chicken: {
    palette: { W: "#f8fafc", G: "#cbd5e1", R: "#ef4444", O: "#f59e0b", K: "#18181b" },
    body: [
      ".......RR...",
      "......WWWW..",
      "......WWKWO.",
      "......WWWWOO",
      "......WWWR..",
      "W....WWWW...",
      "WW..WWWWWW..",
      "WWWWWWGWWW..",
      ".WWWWGGWWW..",
      "..WWWWWWW...",
    ],
    legs: [
      ["....O..O....", "...OO..OO..."],
      [".....OO.....", "....OO.OO..."],
    ],
    sound: "cluck!",
  },
  duck: {
    palette: { Y: "#facc15", D: "#eab308", O: "#f97316", K: "#18181b" },
    body: [
      "............",
      "......YYY...",
      ".....YYKY...",
      ".....YYYYOOO",
      "......YYY...",
      "Y.....YYY...",
      "YY..YYYYYY..",
      "YYYYYYDYYYY.",
      ".YYYYDDYYYY.",
      "..YYYYYYYY..",
    ],
    legs: [
      ["....O..O....", "...OO..OO..."],
      [".....OO.....", "....OO.OO..."],
    ],
    sound: "quack!",
  },
} as const;

type Kind = keyof typeof SPRITES;

function Pixels({ rows, palette, yOffset = 0 }: { rows: readonly string[]; palette: Record<string, string>; yOffset?: number }) {
  return (
    <>
      {rows.flatMap((row, y) =>
        Array.from(row).map((ch, x) =>
          ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y + yOffset} width={1.02} height={1.02} fill={palette[ch]} />
        )
      )}
    </>
  );
}

function Sprite({ kind, scale }: { kind: Kind; scale: number }) {
  const s = SPRITES[kind];
  return (
    <svg width={12 * scale} height={12 * scale} viewBox="0 0 12 12" shapeRendering="crispEdges" className="farm-bob block" aria-hidden="true">
      <Pixels rows={s.body} palette={s.palette} />
      <g className="farm-legs-a">
        <Pixels rows={s.legs[0]} palette={s.palette} yOffset={10} />
      </g>
      <g className="farm-legs-b">
        <Pixels rows={s.legs[1]} palette={s.palette} yOffset={10} />
      </g>
    </svg>
  );
}

interface Walker {
  kind: Kind;
  scale: number;
  duration: number;
  delay: number;
  reverse?: boolean;
}

const WALKERS: Walker[] = [
  { kind: "chicken", scale: 3, duration: 24, delay: 0 },
  { kind: "duck", scale: 3, duration: 30, delay: -6, reverse: true },
  { kind: "duck", scale: 2, duration: 30, delay: -5.2, reverse: true },
  { kind: "duck", scale: 2, duration: 30, delay: -4.5, reverse: true },
  { kind: "chicken", scale: 3, duration: 20, delay: -13 },
  { kind: "chicken", scale: 2, duration: 27, delay: -19, reverse: true },
];

export function PixelFarm() {
  const [talking, setTalking] = useState<number | null>(null);

  const speak = (i: number) => {
    setTalking(i);
    window.setTimeout(() => setTalking((t) => (t === i ? null : t)), 900);
  };

  return (
    <div className="absolute inset-x-0 bottom-0 h-12 overflow-hidden rounded-b-lg border-t border-dashed border-zinc-800">
      {WALKERS.map((w, i) => (
        <button
          key={i}
          type="button"
          onClick={() => speak(i)}
          aria-label={`A pixel ${w.kind}. Click to say hi.`}
          className="farm-walker cursor-pointer"
          style={{
            ["--farm-i" as string]: i,
            animationName: w.reverse ? "farm-walk-rev" : "farm-walk",
            animationDuration: `${w.duration}s`,
            animationDelay: `${w.delay}s`,
          }}
        >
          {talking === i && (
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-100 px-1.5 py-px text-[10px] font-mono font-semibold text-zinc-950">
              {SPRITES[w.kind].sound}
            </span>
          )}
          <span className="block" style={{ transform: w.reverse ? "scaleX(-1)" : undefined }}>
            <Sprite kind={w.kind} scale={w.scale} />
          </span>
        </button>
      ))}
    </div>
  );
}
