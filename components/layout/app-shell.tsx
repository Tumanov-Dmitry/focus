import { TopNavigation } from "@/components/layout/top-navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <main className="px-5 py-10 md:py-16">{children}</main>
    </div>
  );
}
