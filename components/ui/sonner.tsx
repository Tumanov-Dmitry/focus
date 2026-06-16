"use client";
import { Toaster as Sonner } from "sonner";
export function Toaster() { return <Sonner toastOptions={{ classNames: { toast: "bg-card text-card-foreground border-border" } }} />; }
