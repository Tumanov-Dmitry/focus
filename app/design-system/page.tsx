import { AiInputBar } from "@/components/layout/ai-input-bar";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SectionLabel } from "@/components/layout/section-label";
import { TaskRow } from "@/components/layout/task-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const swatches = [
  { name: "background", className: "bg-background" },
  { name: "card", className: "bg-card" },
  { name: "muted", className: "bg-muted" },
  { name: "border", className: "bg-border" },
  { name: "primary", className: "bg-primary" },
  { name: "accent", className: "bg-accent" },
];

const themeSettings = [
  { label: "Стиль", value: "Maia" },
  { label: "Базовый цвет", value: "Neutral" },
  { label: "Тема", value: "Neutral Dark" },
  { label: "Заголовки", value: "Geist" },
  { label: "Интерфейс", value: "Inter" },
  { label: "Радиус", value: "Medium" },
  { label: "Иконки", value: "Lucide" },
];

export default function DesignSystemPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Design system"
          title="Neutral Focus"
          description="Тёмная нейтральная система с плоскими поверхностями, средним радиусом и тихими состояниями."
        />

        <div className="grid gap-10">
          <section>
            <SectionLabel>Preset</SectionLabel>
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>Параметры темы</CardTitle>
                <CardDescription>Системные решения, применённые ко всему интерфейсу.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {themeSettings.map((setting) => (
                  <div
                    key={setting.label}
                    className="rounded-lg border bg-background/35 px-4 py-3"
                  >
                    <p className="text-xs text-muted-foreground">{setting.label}</p>
                    <p className="mt-1 text-sm font-semibold">{setting.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionLabel>Цвета</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              {swatches.map((swatch) => (
                <div key={swatch.name} className="rounded-xl border bg-card p-4">
                  <div className={`mb-3 h-20 rounded-lg border ${swatch.className}`} />
                  <p className="text-sm">{swatch.name}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionLabel>Типографика</SectionLabel>
            <div className="space-y-4">
              <h2 className="font-heading text-hero font-semibold">Geist для ясной иерархии</h2>
              <p className="text-lead text-muted-foreground">
                Inter сохраняет плотный продуктовый ритм и остаётся спокойным на длинных строках.
              </p>
              <p className="text-caption text-muted-foreground">Caption / подпись / вторичный контекст</p>
            </div>
          </section>

          <section>
            <SectionLabel>Компоненты</SectionLabel>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Карточка</CardTitle>
                  <CardDescription>Плоская нейтральная поверхность с тихой границей.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Button>Primary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                  </div>
                  <Input placeholder="Название задачи" />
                  <Textarea placeholder="Заметка" />
                  <Badge>Neutral</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Task row</CardTitle>
                  <CardDescription>Базовый ряд задачи.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TaskRow title="Написать заметку о проекте" meta="Inbox · 10 минут" />
                  <TaskRow title="Закрытая задача" meta="Готово" checked />
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <SectionLabel>AI input bar</SectionLabel>
            <AiInputBar />
          </section>

          <section>
            <SectionLabel>Пустое состояние</SectionLabel>
            <EmptyState
              title="Пока тихо"
              description="Когда появятся задачи, они будут отображаться здесь без визуального шума."
            />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
