import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const sans = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-sans" });
const serif = Lora({ subsets: ["latin", "cyrillic"], variable: "--font-serif" });

export const metadata: Metadata = { title: "Фокус", description: "Минималистичный AI-first таск-трекер" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body className={cn(sans.variable, serif.variable, "min-h-screen")}><Toaster />{children}</body></html>;
}
