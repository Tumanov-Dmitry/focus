import Link from "next/link";

import { Button } from "@/components/ui/button";

const navigationItems = [
  { href: "/today", label: "Сегодня" },
  { href: "/inbox", label: "Входящие" },
  { href: "/projects", label: "Проекты" },
  { href: "/library", label: "Библиотека" },
];

export function TopNavigation() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/today" className="font-serif text-xl font-semibold tracking-[-0.04em]">
          Фокус
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Главная навигация">
          {navigationItems.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <Button asChild size="sm">
          <Link href="/design-system">Design</Link>
        </Button>
      </div>
    </header>
  );
}
