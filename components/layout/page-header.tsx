export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-10 space-y-3 md:mb-12">
      {eyebrow ? (
        <p className="text-caption font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-heading text-title font-semibold md:text-hero">{title}</h1>
      {description ? (
        <p className="max-w-xl text-lead text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
