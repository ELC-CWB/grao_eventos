"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Event, Profile } from "@/types";
import { formatDateRange, formatCurrency, getEventStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarRange,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ChevronRight,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

interface DashboardClientProps {
  profile: Profile;
  events: Event[];
  summaries: Record<string, { revenue: number; expense: number }>;
}

const STATUS_CONFIG = {
  upcoming: { label: "Próximo", className: "status-upcoming" },
  ongoing: { label: "Em andamento", className: "status-ongoing" },
  completed: { label: "Concluído", className: "status-completed" },
};

const EVENT_COLORS = [
  "#f37022", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16", "#ec4899", "#6366f1",
];

export function DashboardClient({ profile, events, summaries }: DashboardClientProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const eventsWithStatus = useMemo(
    () =>
      events.map((ev, i) => ({
        ...ev,
        computedStatus: getEventStatus(ev.start_date, ev.end_date),
        color: ev.color || EVENT_COLORS[i % EVENT_COLORS.length],
      })),
    [events]
  );

  const filtered = filterStatus === "all"
    ? eventsWithStatus
    : eventsWithStatus.filter((e) => e.computedStatus === filterStatus);

  // Global totals
  const totals = Object.values(summaries).reduce(
    (acc, s) => ({
      revenue: acc.revenue + s.revenue,
      expense: acc.expense + s.expense,
    }),
    { revenue: 0, expense: 0 }
  );

  const totalProfit = totals.revenue - totals.expense;

  const statusCounts = {
    upcoming: eventsWithStatus.filter((e) => e.computedStatus === "upcoming").length,
    ongoing: eventsWithStatus.filter((e) => e.computedStatus === "ongoing").length,
    completed: eventsWithStatus.filter((e) => e.computedStatus === "completed").length,
  };

  // Group events by year/month for timeline
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach((ev) => {
      const date = new Date(ev.start_date + "T00:00:00");
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground">
            Olá, {profile.full_name.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Aqui está o panorama geral dos eventos da escola
          </p>
        </div>
        {profile.role === "admin" && (
          <Link
            href="/eventos/novo"
            className={cn(buttonVariants({ variant: "default" }), "flex-shrink-0")}
            style={{ background: "#f37022", borderColor: "#f37022" }}
          >
            <Plus size={16} className="mr-2" />
            Novo Evento
          </Link>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(243, 112, 34, 0.12)" }}>
                <CalendarRange size={16} style={{ color: "#f37022" }} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Total</span>
            </div>
            <p className="text-2xl font-black">{events.length}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Eventos</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(16, 185, 129, 0.12)" }}>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Receitas</span>
            </div>
            <p className="text-xl font-black text-emerald-600">{formatCurrency(totals.revenue)}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Total recebido</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(239, 68, 68, 0.12)" }}>
                <TrendingDown size={16} className="text-red-500" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Despesas</span>
            </div>
            <p className="text-xl font-black text-red-500">{formatCurrency(totals.expense)}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Total gasto</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: totalProfit >= 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)" }}>
                <DollarSign size={16} className={totalProfit >= 0 ? "text-emerald-500" : "text-red-500"} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Resultado</span>
            </div>
            <p className={cn("text-xl font-black", totalProfit >= 0 ? "text-emerald-600" : "text-red-500")}>
              {formatCurrency(totalProfit)}
            </p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Lucro / Prejuízo</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar size={18} style={{ color: "#f37022" }} />
            <h2 className="text-lg font-black">Linha do Tempo</h2>
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {[
              { key: "all", label: "Todos", count: events.length },
              { key: "ongoing", label: "Andamento", count: statusCounts.ongoing },
              { key: "upcoming", label: "Próximos", count: statusCounts.upcoming },
              { key: "completed", label: "Concluídos", count: statusCounts.completed },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
                  filterStatus === f.key
                    ? "text-white border-transparent"
                    : "text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                )}
                style={filterStatus === f.key ? { background: "#f37022", borderColor: "#f37022" } : undefined}
              >
                {f.label}
                {f.count > 0 && (
                  <span className={cn(
                    "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                    filterStatus === f.key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {events.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(243, 112, 34, 0.1)" }}>
                <CalendarRange size={28} style={{ color: "#f37022" }} />
              </div>
              <p className="font-bold text-foreground">Nenhum evento cadastrado</p>
              <p className="text-muted-foreground text-sm mt-1">
                {profile.role === "admin"
                  ? "Crie o primeiro evento para começar"
                  : "Você ainda não foi adicionado a nenhum evento"}
              </p>
              {profile.role === "admin" && (
                <Link
                  href="/eventos/novo"
                  className={cn(buttonVariants({ variant: "default" }), "mt-4")}
                  style={{ background: "#f37022", borderColor: "#f37022" }}
                >
                  <Plus size={14} className="mr-2" />
                  Criar Evento
                </Link>
              )}
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-semibold">Nenhum evento neste filtro</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByMonth.map(([monthKey, monthEvents]) => {
              const [year, month] = monthKey.split("-");
              const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`;

              return (
                <div key={monthKey} className="relative">
                  {/* Month header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#f37022" }} />
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                      {monthLabel}
                    </h3>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {monthEvents.length} evento{monthEvents.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Events in this month */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pl-5">
                    {monthEvents.map((ev) => {
                      const summary = summaries[ev.id] || { revenue: 0, expense: 0 };
                      const profit = summary.revenue - summary.expense;
                      const statusConfig = STATUS_CONFIG[ev.computedStatus];

                      return (
                        <Link key={ev.id} href={`/eventos/${ev.id}`}>
                          <div
                            className="card-hover rounded-2xl border bg-card overflow-hidden cursor-pointer group"
                            style={{ borderColor: "var(--border)" }}
                          >
                            {/* Color accent bar */}
                            <div className="h-1.5 w-full" style={{ background: ev.color }} />

                            <div className="p-5">
                              {/* Status + date */}
                              <div className="flex items-center justify-between mb-3">
                                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full", statusConfig.className)}>
                                  {ev.computedStatus === "ongoing" && (
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 timeline-dot-active" />
                                  )}
                                  {statusConfig.label}
                                </span>
                                <ArrowUpRight
                                  size={14}
                                  className="text-muted-foreground group-hover:text-primary transition-colors"
                                />
                              </div>

                              {/* Name */}
                              <h4 className="font-black text-base leading-tight mb-1 group-hover:text-primary transition-colors">
                                {ev.name}
                              </h4>

                              {/* Date */}
                              <p className="text-xs text-muted-foreground font-medium mb-4">
                                {formatDateRange(ev.start_date, ev.end_date)}
                              </p>

                              {/* Financials */}
                              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
                                <div>
                                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                                    Receita
                                  </p>
                                  <p className="text-sm font-bold text-emerald-600">
                                    {formatCurrency(summary.revenue)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                                    Despesa
                                  </p>
                                  <p className="text-sm font-bold text-red-500">
                                    {formatCurrency(summary.expense)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                                    Lucro
                                  </p>
                                  <p className={cn("text-sm font-bold", profit >= 0 ? "text-emerald-600" : "text-red-500")}>
                                    {formatCurrency(profit)}
                                  </p>
                                </div>
                              </div>

                              {ev.location && (
                                <p className="text-[11px] text-muted-foreground mt-2">
                                  📍 {ev.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
