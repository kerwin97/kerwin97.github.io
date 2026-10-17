interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "featured";
}

const styles: Record<string, string> = {
  default:
    "inline-block bg-zinc-800 text-zinc-300 text-xs px-2.5 py-0.5 rounded-full font-mono hover:scale-105 transition-transform cursor-default",
  outline:
    "inline-block border border-zinc-600 text-zinc-300 text-xs px-2.5 py-0.5 rounded-full font-mono hover:scale-105 hover:border-zinc-400 transition-transform cursor-default",
  featured:
    "inline-block border border-emerald-500/60 bg-emerald-500/10 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-medium hover:scale-110 hover:bg-emerald-500/20 transition-transform cursor-default",
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return <span className={styles[variant]}>{children}</span>;
}
