import { personal } from "../../data/resume";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 py-8 text-center text-zinc-500 text-sm">
      <p>
        Built by{" "}
        <span className="text-zinc-300 font-medium">{personal.displayName}</span>{" "}
        with React &amp; TypeScript · {new Date().getFullYear()}
      </p>
    </footer>
  );
}
