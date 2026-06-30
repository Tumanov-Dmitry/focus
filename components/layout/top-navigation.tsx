"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/today", label: "Сегодня" },
  { href: "/inbox", label: "Входящие" },
  { href: "/projects", label: "Проекты" },
  { href: "/library", label: "Библиотека" },
];

const allNavigationItems = [
  ...navigationItems,
  { href: "/design-system", label: "Design system" },
];

export function TopNavigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/today" className="font-heading text-lg font-semibold tracking-[-0.035em]">
          Фокус
        </Link>
        <nav
          className="hidden items-center gap-1 rounded-lg border bg-background/35 p-1 md:flex"
          aria-label="Главная навигация"
        >
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                pathname === item.href && "bg-secondary text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button asChild size="sm" variant={pathname === "/design-system" ? "secondary" : "outline"}>
            <Link href="/design-system">Design system</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden" aria-label="Открыть меню">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[min(88vw,360px)] border-border bg-card p-0">
            <SheetHeader className="border-b p-5 text-left">
              <SheetTitle className="font-heading">Меню</SheetTitle>
            </SheetHeader>
            <nav className="grid gap-1 p-3" aria-label="Мобильная навигация">
              {allNavigationItems.map((item) => (
                <SheetClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                      pathname === item.href && "bg-secondary text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
