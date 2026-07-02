"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { signIn, signUp } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result =
        mode === "signin"
          ? await signIn(email, password)
          : await signUp(email, password);

      // On a successful sign-in the action redirects server-side and never
      // returns a value here, so guard against undefined.
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.message) {
        toast.success(result.message);
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Фокус</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            AI-first рабочее пространство для задач
          </p>
        </div>

        <Card className="rounded-2xl ring-1 ring-border">
          <CardContent className="p-6">
            <div className="mb-5 flex rounded-full bg-muted p-1">
              {(
                [
                  { id: "signin", label: "Вход" },
                  { id: "signup", label: "Регистрация" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMode(tab.id)}
                  className={cn(
                    "h-9 flex-1 rounded-full text-sm transition-colors",
                    mode === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm text-muted-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm text-muted-foreground">
                  Пароль
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Не короче 6 символов"
                />
              </div>

              <Button type="submit" className="mt-1 h-10 w-full rounded-full" disabled={pending}>
                {pending
                  ? "Подождите…"
                  : mode === "signin"
                    ? "Войти"
                    : "Создать аккаунт"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
