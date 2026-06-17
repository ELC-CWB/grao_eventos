"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Event, Profile } from "@/types";
import { formatDateRange, getEventStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Plus,
  Search,
  CalendarRange,
  ChevronRight,
  Trash2,
  Edit,
  MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EventForm } from "@/components/events/event-form";

const STATUS_CONFIG = {
  upcoming: { label: "Próximo", className: "status-upcoming" },
  ongoing: { label: "Em andamento", className: "status-ongoing" },
  completed: { label: "Concluído", className: "status-completed" },
};

const EVENT_COLORS = [
  "#f37022", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16", "#ec4899", "#6366f1",
];

interface EventsClientProps {
  profile: Profile;
  events: Event[];
}

export function EventsClient({ profile, events: initialEvents }: EventsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [events, setEvents] = useState(initialEvents);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Abre o modal automaticamente se vier de ?novo=1
  useEffect(() => {
    if (searchParams.get("novo") === "1" && profile.role === "admin") {
      setEditingEvent(null);
      setShowForm(true);
      router.replace("/eventos");
    }
  }, [searchParams, profile.role, router]);

  const filtered = events.filter((ev) =>
    ev.name.toLowerCase().includes(search.toLowerCase()) ||
    ev.location?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    const { error } = await supabase.from("events").delete().eq("id", deletingId);
    if (error) {
      toast.error("Erro ao excluir evento");
    } else {
      toast.success("Evento excluído");
      setEvents((prev) => prev.filter((e) => e.id !== deletingId));
    }
    setDeletingId(null);
    setDeleting(false);
  }

  function handleSaved(event: Event) {
    if (editingEvent) {
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
    } else {
      setEvents((prev) => [...prev, event]);
    }
    setShowForm(false);
    setEditingEvent(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black">Eventos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {events.length} evento{events.length !== 1 ? "s" : ""} cadastrado{events.length !== 1 ? "s" : ""}
          </p>
        </div>
        {profile.role === "admin" && (
          <Button
            onClick={() => { setEditingEvent(null); setShowForm(true); }}
            style={{ background: "#f37022" }}
          >
            <Plus size={16} className="mr-2" />
            Novo Evento
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar eventos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Events list */}
      {events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(243, 112, 34, 0.1)" }}>
              <CalendarRange size={28} style={{ color: "#f37022" }} />
            </div>
            {profile.role === "manager" ? (
              <>
                <p className="font-bold">Aguardando acesso aos eventos</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                  Sua conta está ativa, mas nenhum evento foi vinculado ao seu perfil ainda.
                  Entre em contato com um administrador para obter acesso.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold">Nenhum evento cadastrado</p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="mt-4"
                  style={{ background: "#f37022" }}
                >
                  <Plus size={14} className="mr-2" /> Criar Evento
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="font-semibold">Nenhum evento encontrado</p>
            </div>
          ) : (() => {
            const sorted = [...filtered].sort((a, b) =>
              new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            );

            const byYear = sorted.reduce<{ year: number; events: typeof sorted }[]>((acc, ev) => {
              const year = new Date(ev.start_date).getFullYear();
              const group = acc.find((g) => g.year === year);
              if (group) group.events.push(ev);
              else acc.push({ year, events: [ev] });
              return acc;
            }, []);

            return byYear.map(({ year, events: yearEvents }) => (
              <div key={year} className="space-y-2">
                {/* Year separator */}
                <div className="flex items-center gap-3 py-2">
                  <span className="text-sm font-black tracking-widest px-3 py-0.5 rounded-full text-white" style={{ background: "#f37022" }}>{year}</span>
                  <div className="flex-1 h-0.5 rounded-full" style={{ background: "rgba(243,112,34,0.25)" }} />
                </div>

                <div className="grid gap-2">
                  {yearEvents.map((ev, i) => {
                    const status = getEventStatus(ev.start_date, ev.end_date);
                    const statusConfig = STATUS_CONFIG[status];
                    const color = ev.color || EVENT_COLORS[i % EVENT_COLORS.length];

                    return (
                      <div
                        key={ev.id}
                        className="group relative flex items-center gap-4 p-4 rounded-2xl border bg-card card-hover cursor-pointer"
                        onClick={() => router.push(`/eventos/${ev.id}`)}
                      >
                        <div className="flex-shrink-0 w-1.5 h-16 rounded-full" style={{ background: color }} />

                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-base truncate">{ev.name}</h3>
                          <p className="text-xs text-muted-foreground font-medium">
                            {formatDateRange(ev.start_date, ev.end_date)}
                          </p>
                          {ev.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {ev.location}
                            </p>
                          )}
                        </div>

                        {ev.image_url && (
                          <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border bg-muted/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={ev.image_url} alt={ev.name} className="w-full h-full object-contain" />
                          </div>
                        )}

                        {profile.role === "admin" && (
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                              onClick={() => { setEditingEvent(ev); setShowForm(true); }}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={() => setDeletingId(ev.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        )}
                        <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Event Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingEvent(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>
          <EventForm
            event={editingEvent ?? undefined}
            onSaved={handleSaved}
            onCancel={() => { setShowForm(false); setEditingEvent(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Evento</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita e
            todos os lançamentos associados serão perdidos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
