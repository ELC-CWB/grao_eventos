"use client";

import { useState } from "react";
import type { Profile } from "@/types";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Users, Phone, Mail, Edit, Trash2, Search, CalendarRange, Check, AlertCircle } from "lucide-react";

type EventRow = { id: string; name: string; start_date: string; end_date: string };

interface UsersClientProps {
  currentProfile: Profile;
  profiles: Profile[];
  events: EventRow[];
  userEventMap: Record<string, string[]>;
}

const emptyForm = {
  email: "",
  password: "",
  full_name: "",
  phone: "",
  role: "manager" as "admin" | "manager",
};

export function UsersClient({ currentProfile, profiles: initialProfiles, events, userEventMap: initialUserEventMap }: UsersClientProps) {
  const supabase = createClient();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [userEventMap, setUserEventMap] = useState(initialUserEventMap);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  const filtered = profiles.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function toggleEvent(id: string) {
    setSelectedEventIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function openCreate() {
    setEditingProfile(null);
    setForm(emptyForm);
    setSelectedEventIds([]);
    setShowForm(true);
  }

  function openEdit(p: Profile) {
    setEditingProfile(p);
    setForm({
      email: p.email,
      password: "",
      full_name: p.full_name,
      phone: p.phone ?? "",
      role: p.role,
    });
    setSelectedEventIds(userEventMap[p.id] ?? []);
    setShowForm(true);
  }

  async function syncEventUsers(userId: string, eventIds: string[]): Promise<boolean> {
    const { error: delErr } = await supabase.from("event_users").delete().eq("user_id", userId);
    if (delErr) { toast.error("Erro ao atualizar vínculos de eventos"); return false; }
    if (eventIds.length > 0) {
      const { error: insErr } = await supabase.from("event_users").insert(
        eventIds.map((eid) => ({ event_id: eid, user_id: userId }))
      );
      if (insErr) { toast.error("Erro ao vincular eventos ao usuário"); return false; }
    }
    return true;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    if (editingProfile) {
      const response = await fetch("/api/admin/update-user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: editingProfile.id, full_name: form.full_name, phone: form.phone, role: form.role }),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "Erro ao atualizar usuário");
      } else {
        await syncEventUsers(editingProfile.id, form.role === "manager" ? selectedEventIds : []);
        setProfiles((prev) =>
          prev.map((p) => p.id === editingProfile.id ? result.profile as Profile : p)
            .sort((a, b) => a.role === b.role ? a.full_name.localeCompare(b.full_name) : a.role === "admin" ? -1 : 1)
        );
        setUserEventMap((prev) => ({ ...prev, [editingProfile.id]: form.role === "manager" ? selectedEventIds : [] }));
        setShowForm(false);
        setEditingProfile(null);
        toast.success("Usuário atualizado");
      }
    } else {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, full_name: form.full_name, phone: form.phone, role: form.role }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "Erro ao criar usuário");
      } else {
        if (form.role === "manager" && selectedEventIds.length > 0) {
          await syncEventUsers(result.profile.id, selectedEventIds);
        }
        setProfiles((prev) => [...prev, result.profile].sort((a, b) =>
          a.role === b.role ? a.full_name.localeCompare(b.full_name) : a.role === "admin" ? -1 : 1
        ));
        setUserEventMap((prev) => ({ ...prev, [result.profile.id]: form.role === "manager" ? selectedEventIds : [] }));
        setForm(emptyForm);
        setSelectedEventIds([]);
        setShowForm(false);
        toast.success("Usuário criado com sucesso");
      }
    }

    setLoading(false);
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    const response = await fetch("/api/admin/delete-user", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: deletingId }),
    });
    if (!response.ok) {
      toast.error("Erro ao excluir usuário");
    } else {
      setProfiles((prev) => prev.filter((p) => p.id !== deletingId));
      setUserEventMap((prev) => { const next = { ...prev }; delete next[deletingId!]; return next; });
      toast.success("Usuário excluído");
    }
    setDeletingId(null);
    setDeleting(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black">Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {profiles.length} usuário{profiles.length !== 1 ? "s" : ""} cadastrado{profiles.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} style={{ background: "#f37022" }}>
          <Plus size={14} className="mr-1.5" />
          Novo Usuário
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar usuários..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      {/* Users list */}
      {profiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Users size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="font-bold">Nenhum usuário cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((p) => {
            const initials = p.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
            const isCurrentUser = p.id === currentProfile.id;
            const linkedEvents = (userEventMap[p.id] ?? [])
              .map((eid) => events.find((e) => e.id === eid)?.name)
              .filter(Boolean) as string[];

            return (
              <div key={p.id} className="group flex items-start gap-3 p-4 rounded-2xl border bg-card card-hover">
                <Avatar className="w-10 h-10 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="text-sm font-bold text-white" style={{ background: "#f37022" }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm">{p.full_name}</p>
                    {isCurrentUser && <span className="text-[10px] font-semibold text-muted-foreground">(você)</span>}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${p.role === "admin" ? "status-ongoing" : "status-upcoming"}`}>
                      {p.role === "admin" ? "Admin" : "Apoiador"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Mail size={9} /> {p.email}
                  </p>
                  {p.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone size={9} /> {p.phone}
                    </p>
                  )}
                  {p.role === "manager" && (
                    <div className="mt-2">
                      {linkedEvents.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-destructive font-semibold">
                          <AlertCircle size={10} /> Sem projetos vinculados
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {linkedEvents.map((name) => (
                            <span key={name} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(243,112,34,0.1)", color: "#d4601a" }}>
                              <CalendarRange size={8} />{name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(p)}>
                    <Edit size={12} />
                  </Button>
                  {!isCurrentUser && (
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(p.id)}>
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && search && (
            <div className="col-span-full text-center py-6 text-muted-foreground text-sm">Nenhum usuário encontrado</div>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingProfile(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProfile ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input id="full_name" name="full_name" value={form.full_name} onChange={handleChange} required placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange}
                required disabled={!!editingProfile} placeholder="email@..." />
              {editingProfile && <p className="text-xs text-muted-foreground">E-mail não pode ser alterado</p>}
            </div>
            {!editingProfile && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha *</Label>
                <Input id="password" name="password" type="password" value={form.password} onChange={handleChange}
                  required={!editingProfile} placeholder="Mínimo 6 caracteres" minLength={6} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999" />
              </div>
              {editingProfile ? (
                <div className="space-y-1.5">
                  <Label>Perfil *</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => {
                      setForm((prev) => ({ ...prev, role: v as "admin" | "manager" }));
                      if (v === "admin") setSelectedEventIds([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {form.role === "admin" ? "Administrador" : "Apoiador"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Apoiador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Perfil</Label>
                  <div className="h-8 flex items-center px-2.5 rounded-lg border bg-muted/40 text-sm text-muted-foreground">
                    Apoiador
                  </div>
                </div>
              )}
            </div>

            {/* Event linking — only for managers */}
            {form.role === "manager" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <CalendarRange size={13} />
                    Projetos vinculados
                  </Label>
                  {selectedEventIds.length > 0 && (
                    <span className="text-xs font-semibold" style={{ color: "#f37022" }}>
                      {selectedEventIds.length} selecionado{selectedEventIds.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3 border rounded-xl text-center">
                    Nenhum projeto cadastrado ainda
                  </p>
                ) : (
                  <div className="border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {events.map((ev, i) => {
                      const selected = selectedEventIds.includes(ev.id);
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => toggleEvent(ev.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                          style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
                        >
                          <div
                            className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all"
                            style={selected
                              ? { background: "#f37022", borderColor: "#f37022" }
                              : { borderColor: "var(--border)" }
                            }
                          >
                            {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                          </div>
                          <span className="text-sm font-medium flex-1 min-w-0 truncate">{ev.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedEventIds.length === 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle size={11} /> Selecione pelo menos um projeto
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" disabled={loading} className="flex-1" style={{ background: "#f37022" }}>
                {loading ? "Salvando..." : editingProfile ? "Salvar" : "Criar Usuário"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir Usuário</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza? Esta ação não pode ser desfeita.</p>
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
