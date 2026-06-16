import { cn } from "@/lib/utils";

export function CenterColumn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cn("mx-auto w-full max-w-2xl", className)}>{children}</section>;
}
