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

export function exportToXML(data: Record<string, unknown>[], rootTag: string, itemTag: string): string {
  const escapeXML = (str: string) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const toXML = (obj: Record<string, unknown>): string => {
    return Object.entries(obj)
      .map(([key, val]) => {
        if (val === null || val === undefined) return `<${key}/>`;
        return `<${key}>${escapeXML(String(val))}</${key}>`;
      })
      .join("");
  };

  const items = data.map((item) => `  <${itemTag}>${toXML(item)}</${itemTag}>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag}>\n${items}\n</${rootTag}>`;
}

export function downloadXML(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
