"use client";

import {
  BarChart3,
  Bell,
  CalendarDays,
  CircleUserRound,
  FolderKanban,
  LogOut,
  Menu,
  NotebookPen,
  Search,
  Target,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useTransition } from "react";

import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const railItems: Array<{
  href: string | null;
  icon: typeof Target;
  label: string;
}> = [
  { href: "/today", icon: Target, label: "Фокус" },
  { href: "/inbox", icon: CalendarDays, label: "Задачи" },
  { href: "/projects", icon: FolderKanban, label: "Проекты" },
  { href: null, icon: UsersRound, label: "Клиенты" },
  { href: null, icon: BarChart3, label: "Аналитика" },
  { href: "/library", icon: NotebookPen, label: "Заметки" },
];

function ProfileMenu({ userEmail }: { userEmail?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Профиль">
          <CircleUserRound className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {userEmail ?? "Гость"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending || !userEmail}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(async () => {
              await signOut();
            });
          }}
        >
          <LogOut className="size-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LeftRail() {
  const pathname = usePathname();

  return (
    <aside
      className="workspace-rail fixed left-5 top-1/2 z-30 hidden -translate-y-1/2 py-8 lg:block"
      aria-label="Разделы рабочего пространства"
    >
      <div className="workspace-rail-stack flex w-40 flex-col items-start gap-1">
        {railItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href !== null && pathname.startsWith(item.href);

          const className = cn(
            "group h-10 w-28 justify-start rounded-full border border-transparent px-3.5 text-sm backdrop-blur-md transition-colors duration-300",
            isActive
              ? "border-border/80 bg-background text-foreground shadow-sm hover:bg-background"
              : "bg-background/10 text-muted-foreground shadow-none hover:bg-background/10 hover:text-muted-foreground",
          );
          const content = (
            <span
              className={cn(
                "flex items-center gap-2.5 transition-opacity duration-300",
                !isActive && "opacity-55 group-hover:opacity-100",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </span>
          );

          if (item.href) {
            return (
              <Button key={item.label} asChild variant="ghost" size="sm" className={className}>
                <Link href={item.href}>{content}</Link>
              </Button>
            );
          }

          return (
            <Button key={item.label} variant="ghost" size="sm" disabled className={className}>
              {content}
            </Button>
          );
        })}
      </div>
    </aside>
  );
}

export function WorkspaceShell({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail?: string;
}) {
  return (
    <div
      id="workspace-root"
      className="workspace-theme relative min-h-screen overflow-x-hidden text-foreground"
    >
      <div className="fixed left-5 top-5 z-40 flex items-center rounded-full border bg-background/92 p-1 shadow-sm backdrop-blur-xl">
        <ProfileMenu userEmail={userEmail} />
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Открыть меню">
          <Menu className="size-5" />
        </Button>
      </div>

      <div className="fixed right-5 top-5 z-40 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden h-12 w-36 justify-start rounded-full bg-background/92 px-4 text-sm text-muted-foreground shadow-sm backdrop-blur-xl sm:flex"
        >
          <Search className="size-5" />
          Поиск
        </Button>
        <Button
          variant="outline"
          size="icon-lg"
          className="size-12 rounded-full bg-background/92 shadow-sm backdrop-blur-xl"
          aria-label="Уведомления"
        >
          <Bell className="size-5" />
        </Button>
      </div>

      <LeftRail />

      <main className="min-h-screen min-w-0 px-4 sm:px-8">{children}</main>
    </div>
  );
}
