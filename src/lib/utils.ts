import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateShort(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");

  if (start === end) {
    return startDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  if (startDate.getFullYear() === endDate.getFullYear()) {
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.getDate()} – ${endDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`;
    }
    return `${startDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    })} – ${endDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  }

  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function getEventStatus(start: string, end: string): "upcoming" | "ongoing" | "completed" {
  const now = new Date();
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T23:59:59");

  if (now < startDate) return "upcoming";
  if (now > endDate) return "completed";
  return "ongoing";
}

export function exportToCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return s.includes(";") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [headers, ...rows].map((row) => row.map(escape).join(";"));
  // BOM (Byte Order Mark) so Excel opens UTF-8 with accents correctly
  return "﻿" + lines.join("\r\n");
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
