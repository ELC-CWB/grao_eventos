"use client";

import { useState } from "react";
import type { Profile } from "@/types";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Users, Phone, Mail, Shield, Edit, Trash2, Search } from "lucide-react";

interface UsersClientProps {
  currentProfile: Profile;
  profiles: Profile[];
}

const emptyForm = {
  email: "",
  password: "",
  full_name: "",
  phone: "",
  role: "manager" as "admin" | "manager",
};

export function UsersClient({ currentProfile, profiles: initialProfiles }: UsersClientProps) {
  const supabase = createClient();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const filtered = profiles.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (editingProfile) {
      // Update profile only (can't change email via client)
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          phone: form.phone || null,
          role: form.role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingProfile.id)
        .select()
        .single();

      if (error) {
        toast.error("Erro ao atualizar usuário");
      } else {
        setProfiles((prev) => prev.map((p) => p.id === editingProfile.id ? data as Profile : p));
        setShowForm(false);
        setEditingProfile(null);
        toast.success("Usuário atualizado");
      }
    } else {
      // Create new user via admin API
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone,
          role: form.role,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "Erro ao criar usuário");
      } else {
        setProfiles((prev) => [...prev, result.profile].sort((a, b) => a.full_name.localeCompare(b.full_name)));
        setForm(emptyForm);
        setShowForm(false);
        toast.success("Usuário criado com sucesso");
      }
    }

    setLoading(false);
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    // Note: Deleting auth users requires server-side admin action
    const response = await fetch("/api/admin/delete-user", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: deletingId }),
    });
    if (!response.ok) {
      toast.error("Erro ao excluir usuário");
    } else {
      setProfiles((prev) => prev.filter((p) => p.id !== deletingId));
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
          <p className="text-muted-foreground text-sm mt-1">{profiles.length} usuário{profiles.length !== 1 ? "s" : ""} cadastrado{profiles.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { setEditingProfile(null); setForm(emptyForm); setShowForm(true); }} style={{ background: "#f37022" }}>
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
            return (
              <div key={p.id} className="group flex items-center gap-3 p-4 rounded-2xl border bg-card card-hover">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className="text-sm font-bold text-white" style={{ background: "#f37022" }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm truncate">{p.full_name}</p>
                    {isCurrentUser && <span className="text-[10px] font-semibold text-muted-foreground">(você)</span>}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail size={9} /> {p.email}
                  </p>
                  {p.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone size={9} /> {p.phone}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${p.role === "admin" ? "status-ongoing" : "status-upcoming"}`}>
                    {p.role === "admin" ? "Admin" : "Gestor"}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingProfile(null); }}>
        <DialogContent className="max-w-md">
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
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required
                disabled={!!editingProfile} placeholder="email@..." />
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
              <div className="space-y-1.5">
                <Label>Perfil *</Label>
                <Select value={form.role} onValueChange={(v) => setForm((prev) => ({ ...prev, role: v as "admin" | "manager" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Gestor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
