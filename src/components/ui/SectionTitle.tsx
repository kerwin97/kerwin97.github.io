interface SectionTitleProps {
  children: React.ReactNode;
}

export function SectionTitle({ children }: SectionTitleProps) {
  return (
    <h2 className="text-3xl font-bold text-zinc-100 mb-12 flex items-center gap-4">
      {children}
      <span className="flex-1 h-px bg-zinc-800" />
    </h2>
  );
}
