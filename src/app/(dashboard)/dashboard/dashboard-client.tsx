"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Event, Profile } from "@/types";
import { formatDateRange, formatCurrency, getEventStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarRange,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ChevronRight,
  Calendar,
  ArrowUpRight,
  Camera,
  ImagePlus,
  Trash2,
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
  const router = useRouter();
  const currentYear = new Date().getFullYear().toString();
  const [filterYear, setFilterYear] = useState<string>(currentYear);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    eventId: string;
    hasImage: boolean;
  } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const openContextMenu = (e: React.MouseEvent, eventId: string, hasImage: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, eventId, hasImage });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const eventId = pendingEventIdRef.current;
    if (!file || !eventId) return;
    pendingEventIdRef.current = null;
    setUploading(eventId);
    e.target.value = "";

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("eventId", eventId);

      const res = await fetch("/api/events/upload-image", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? "Erro ao salvar imagem");

      toast.success("Imagem salva com sucesso!");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar imagem";
      toast.error(msg);
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = async () => {
    if (!contextMenu) return;
    const eventId = contextMenu.eventId;
    setContextMenu(null);
    setUploading(eventId);

    try {
      const res = await fetch("/api/events/upload-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao remover imagem");
      toast.success("Imagem removida!");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao remover imagem";
      toast.error(msg);
    } finally {
      setUploading(null);
    }
  };

  const eventsWithStatus = useMemo(
    () =>
      events.map((ev, i) => ({
        ...ev,
        computedStatus: getEventStatus(ev.start_date, ev.end_date),
        color: ev.color || EVENT_COLORS[i % EVENT_COLORS.length],
      })),
    [events]
  );

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (let y = 2025; y <= 2034; y++) years.add(y.toString());
    eventsWithStatus.forEach((ev) =>
      years.add(new Date(ev.start_date + "T00:00:00").getFullYear().toString())
    );
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [eventsWithStatus]);

  const filtered = eventsWithStatus.filter(
    (e) => new Date(e.start_date + "T00:00:00").getFullYear().toString() === filterYear
  );

  // Totals filtered by selected year
  const totals = useMemo(() =>
    filtered.reduce(
      (acc, ev) => {
        const s = summaries[ev.id] ?? { revenue: 0, expense: 0 };
        return { revenue: acc.revenue + s.revenue, expense: acc.expense + s.expense };
      },
      { revenue: 0, expense: 0 }
    ),
    [filtered, summaries]
  );

  const totalProfit = totals.revenue - totals.expense;

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-muted-foreground">
            Grão Eventos
          </h1>
        </div>
        {profile.role === "admin" && (
          <Link
            href="/eventos?novo=1"
            className={cn(buttonVariants({ variant: "default" }), "flex-shrink-0")}
            style={{ background: "#f37022", borderColor: "#f37022" }}
          >
            <Plus size={16} className="mr-2" />
            Novo Evento
          </Link>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="card-hover">
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(243, 112, 34, 0.12)" }}>
                <CalendarRange size={13} style={{ color: "#f37022" }} />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Total</span>
            </div>
            <p className="text-xl font-black">{filtered.length}</p>
            <p className="text-[11px] text-muted-foreground font-medium">Eventos</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(16, 185, 129, 0.12)" }}>
                <TrendingUp size={13} className="text-emerald-500" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Receitas</span>
            </div>
            <p className="text-lg font-black text-emerald-600">{formatCurrency(totals.revenue)}</p>
            <p className="text-[11px] text-muted-foreground font-medium">Total recebido</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(239, 68, 68, 0.12)" }}>
                <TrendingDown size={13} className="text-red-500" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Despesas</span>
            </div>
            <p className="text-lg font-black text-red-500">{formatCurrency(totals.expense)}</p>
            <p className="text-[11px] text-muted-foreground font-medium">Total gasto</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: totalProfit >= 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)" }}>
                <DollarSign size={13} className={totalProfit >= 0 ? "text-emerald-500" : "text-red-500"} />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Resultado</span>
            </div>
            <p className={cn("text-lg font-black", totalProfit >= 0 ? "text-emerald-600" : "text-red-500")}>
              {formatCurrency(totalProfit)}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium">Lucro / Prejuízo</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar size={18} style={{ color: "#f37022" }} />
            <h2 className="text-lg font-black text-muted-foreground">Linha do Tempo</h2>
          </div>

          {/* Year filter */}
          {availableYears.length > 0 && (
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger
                className="h-9 min-w-[110px] font-black text-sm border-2 rounded-xl"
                style={{ borderColor: "#f37022", color: "#f37022", background: "rgba(243,112,34,0.07)" }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
                  href="/eventos?novo=1"
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
            <p className="font-semibold">Nenhum evento em {filterYear}</p>
          </div>
        ) : (
          <>
            {/* ── Horizontal Timeline (desktop lg+) ── */}
            <div className="hidden lg:block overflow-x-auto pb-2">
              <div style={{ minWidth: `${Math.max(560, filtered.length * 145)}px` }}>
                <div className="relative flex items-stretch" style={{ height: "420px" }}>
                  {/* Center line */}
                  <div
                    className="absolute left-0 right-0 h-px bg-border"
                    style={{ top: "50%" }}
                  />

                  {/* START */}
                  <div className="flex items-center pr-4 z-10 flex-shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                      Início
                    </span>
                  </div>

                  {/* Event columns */}
                  <div className="flex flex-1">
                    {filtered.map((ev, idx) => {
                      const isAbove = idx % 2 === 0;
                      const summary = summaries[ev.id] || { revenue: 0, expense: 0 };
                      const profit = summary.revenue - summary.expense;
                      const statusConfig = STATUS_CONFIG[ev.computedStatus];
                      const eventDate = new Date(ev.start_date + "T00:00:00");
                      const monthYear = eventDate.toLocaleDateString("pt-BR");

                      return (
                        <div
                          key={ev.id}
                          className="flex flex-col items-center h-full"
                          style={{ flex: "1 0 125px", maxWidth: "170px" }}
                        >
                          {/* TOP HALF */}
                          <div className="flex-1 flex flex-col justify-end w-full px-2 overflow-hidden">
                            {isAbove && (
                              <>
                                <p className={cn("text-center text-[11px] font-bold mb-1", profit >= 0 ? "text-emerald-600" : "text-red-500")}>
                                  {formatCurrency(profit)}
                                </p>
                                <div className="relative w-full">
                                  <Link href={`/eventos/${ev.id}`} className="w-full block">
                                    <div
                                      onContextMenu={(e) => openContextMenu(e, ev.id, !!ev.image_url)}
                                      className={cn(
                                        "rounded-xl text-center transition-opacity p-2",
                                        uploading === ev.id ? "opacity-50 pointer-events-none" : "hover:opacity-80"
                                      )}
                                      style={{ border: `1.5px solid ${ev.color}` }}
                                    >
                                      {uploading === ev.id ? (
                                        <div className="w-full h-10 flex items-center justify-center rounded-lg bg-muted/40">
                                          <div className="w-4 h-4 border-2 border-muted-foreground/20 rounded-full animate-spin" style={{ borderTopColor: ev.color }} />
                                        </div>
                                      ) : ev.image_url ? (
                                        <img src={ev.image_url} alt={ev.name} className="w-full h-[58px] object-contain rounded-lg" />
                                      ) : (
                                        <div className="w-full h-10 flex items-center justify-center rounded-lg bg-muted/30">
                                          <Camera size={14} style={{ color: ev.color, opacity: 0.5 }} />
                                        </div>
                                      )}
                                      <div className="pt-1.5">
                                        <p className="text-[10px] font-black leading-tight line-clamp-2" style={{ color: ev.color }}>{ev.name}</p>
                                        <p className="text-[9px] text-muted-foreground mt-0.5">{monthYear}</p>
                                      </div>
                                    </div>
                                  </Link>
                                </div>
                                <div
                                  className="self-center flex-shrink-0 mt-1"
                                  style={{
                                    width: 0, height: 0,
                                    borderLeft: "10px solid transparent",
                                    borderRight: "10px solid transparent",
                                    borderTop: `10px solid ${ev.color}`,
                                  }}
                                />
                              </>
                            )}
                          </div>

                          {/* DOT */}
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-background border-2 z-10 flex-shrink-0"
                            style={{ borderColor: ev.color }}
                          >
                            <span className="text-sm font-black leading-none" style={{ color: ev.color }}>+</span>
                          </div>

                          {/* BOTTOM HALF */}
                          <div className="flex-1 flex flex-col w-full px-2 overflow-hidden">
                            {!isAbove && (
                              <>
                                <div
                                  className="self-center flex-shrink-0"
                                  style={{
                                    width: 0, height: 0,
                                    borderLeft: "10px solid transparent",
                                    borderRight: "10px solid transparent",
                                    borderBottom: `10px solid ${ev.color}`,
                                  }}
                                />
                                <div className="relative w-full">
                                  <Link href={`/eventos/${ev.id}`} className="w-full block">
                                    <div
                                      onContextMenu={(e) => openContextMenu(e, ev.id, !!ev.image_url)}
                                      className={cn(
                                        "rounded-xl text-center transition-opacity p-2",
                                        uploading === ev.id ? "opacity-50 pointer-events-none" : "hover:opacity-80"
                                      )}
                                      style={{ border: `1.5px solid ${ev.color}` }}
                                    >
                                      <div className="pb-1.5">
                                        <p className="text-[9px] text-muted-foreground">{monthYear}</p>
                                        <p className="text-[10px] font-black leading-tight line-clamp-2 mt-0.5" style={{ color: ev.color }}>{ev.name}</p>
                                      </div>
                                      {uploading === ev.id ? (
                                        <div className="w-full h-10 flex items-center justify-center rounded-lg bg-muted/40">
                                          <div className="w-4 h-4 border-2 border-muted-foreground/20 rounded-full animate-spin" style={{ borderTopColor: ev.color }} />
                                        </div>
                                      ) : ev.image_url ? (
                                        <img src={ev.image_url} alt={ev.name} className="w-full h-[58px] object-contain rounded-lg" />
                                      ) : (
                                        <div className="w-full h-10 flex items-center justify-center rounded-lg bg-muted/30">
                                          <Camera size={14} style={{ color: ev.color, opacity: 0.5 }} />
                                        </div>
                                      )}
                                    </div>
                                  </Link>
                                </div>
                                <p className={cn("text-center text-[11px] font-bold mt-1.5", profit >= 0 ? "text-emerald-600" : "text-red-500")}>
                                  {formatCurrency(profit)}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* END */}
                  <div className="flex items-center pl-4 z-10 flex-shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                      Fim
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Vertical cards (mobile <lg) ── */}
            <div className="lg:hidden space-y-8">
              {groupedByMonth.map(([monthKey, monthEvents]) => {
                const [year, month] = monthKey.split("-");
                const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`;

                return (
                  <div key={monthKey} className="relative">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-5">
                      {monthEvents.map((ev) => {
                        const summary = summaries[ev.id] || { revenue: 0, expense: 0 };
                        const profit = summary.revenue - summary.expense;
                        const statusConfig = STATUS_CONFIG[ev.computedStatus];

                        return (
                          <Link key={ev.id} href={`/eventos/${ev.id}`}>
                            <div className="card-hover rounded-2xl border bg-card overflow-hidden cursor-pointer group">
                              <div onContextMenu={(e) => openContextMenu(e, ev.id, !!ev.image_url)}>
                              {uploading === ev.id ? (
                                <div className="w-full h-14 flex items-center justify-center" style={{ background: ev.color }}>
                                  <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                </div>
                              ) : ev.image_url ? (
                                <img src={ev.image_url} alt={ev.name} className="w-full h-16 object-contain bg-black/10" />
                              ) : (
                                <div className="w-full h-14 flex items-center justify-center" style={{ background: ev.color }}>
                                  <Camera size={24} className="text-white opacity-50" />
                                </div>
                              )}
                              </div>
                              <div className="p-5">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-black text-base leading-tight group-hover:text-primary transition-colors">
                                    {ev.name}
                                  </h4>
                                  <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                                </div>
                                <p className="text-xs text-muted-foreground font-medium mb-4">
                                  {formatDateRange(ev.start_date, ev.end_date)}
                                </p>
                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Receita</p>
                                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(summary.revenue)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Despesa</p>
                                    <p className="text-sm font-bold text-red-500">{formatCurrency(summary.expense)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Lucro</p>
                                    <p className={cn("text-sm font-bold", profit >= 0 ? "text-emerald-600" : "text-red-500")}>
                                      {formatCurrency(profit)}
                                    </p>
                                  </div>
                                </div>
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
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-xl border bg-popover text-popover-foreground shadow-lg py-1 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-accent rounded-lg transition-colors"
            onClick={() => {
              pendingEventIdRef.current = contextMenu.eventId;
              setContextMenu(null);
              setTimeout(() => fileInputRef.current?.click(), 0);
            }}
          >
            <ImagePlus size={14} className="text-muted-foreground" />
            {contextMenu.hasImage ? "Trocar imagem" : "Adicionar imagem"}
          </button>
          {contextMenu.hasImage && (
            <button
              className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-accent text-red-500 rounded-lg transition-colors"
              onClick={handleRemoveImage}
            >
              <Trash2 size={14} />
              Remover imagem
            </button>
          )}
        </div>
      )}
    </div>
  );
}
