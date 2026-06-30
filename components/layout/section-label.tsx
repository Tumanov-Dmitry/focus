export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-caption font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}
