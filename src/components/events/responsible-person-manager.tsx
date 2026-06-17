"use client";

import { useState } from "react";
import type { Profile, ResponsiblePerson } from "@/types";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Phone, Mail, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ResponsiblePersonManagerProps {
  eventId: string;
  persons: ResponsiblePerson[];
  onPersonsChange: (persons: ResponsiblePerson[]) => void;
  allProfiles?: Profile[];
  eventUsers?: { id: string; user_id: string; profile?: Profile }[];
  onEventUsersChange?: (users: { id: string; user_id: string; profile?: Profile }[]) => void;
}

const emptyForm = { name: "", phone: "", email: "", role: "" };

export function ResponsiblePersonManager({
  eventId, persons, onPersonsChange,
  allProfiles = [], eventUsers = [], onEventUsersChange,
}: ResponsiblePersonManagerProps) {
  const supabase = createClient();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedProfileId, setSelectedProfileId] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSelectProfile(profileId: string) {
    setSelectedProfileId(profileId);
    if (profileId === "__manual__") {
      setForm(emptyForm);
      return;
    }
    const p = allProfiles.find((p) => p.id === profileId);
    if (p) setForm({ name: p.full_name, phone: p.phone ?? "", email: p.email, role: "" });
  }

  function openForm() {
    setForm(emptyForm);
    setSelectedProfileId("");
    setShowForm(true);
  }

  async function linkProfileToEvent(profileId: string, profileData?: Profile) {
    const alreadyLinked = eventUsers.some((eu) => eu.user_id === profileId);
    if (alreadyLinked) return;

    const { data } = await supabase
      .from("event_users")
      .insert({ event_id: eventId, user_id: profileId })
      .select("*, profile:profiles(*)")
      .single();

    if (data && onEventUsersChange) {
      onEventUsersChange([...eventUsers, data as { id: string; user_id: string; profile?: Profile }]);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // 1. Create responsible_person record
    const { data, error } = await supabase
      .from("responsible_persons")
      .insert({ event_id: eventId, name: form.name, phone: form.phone || null, email: form.email || null, role: form.role || null })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao adicionar usuário");
      setLoading(false);
      return;
    }

    onPersonsChange([...persons, data as ResponsiblePerson]);

    // 2. Link to event_users
    if (selectedProfileId && selectedProfileId !== "__manual__") {
      // Selected from dropdown → link directly
      await linkProfileToEvent(selectedProfileId);
    } else if (form.email) {
      // Manual entry with email → look up or create profile
      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", form.email)
        .single();

      if (existing) {
        await linkProfileToEvent(existing.id, existing as Profile);
      } else {
        // Create new apoiador user
        const tempPassword = `Apoio@${Math.random().toString(36).slice(2, 8)}`;
        const res = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: tempPassword, full_name: form.name, phone: form.phone || "", role: "manager" }),
        });
        if (res.ok) {
          const result = await res.json();
          await linkProfileToEvent(result.profile.id, result.profile as Profile);
          toast.success(`Usuário criado! Senha temporária: ${tempPassword}`, { duration: 10000 });
        } else {
          toast.error("Usuário adicionado, mas não foi possível criar conta de acesso");
        }
      }
    }

    setForm(emptyForm);
    setSelectedProfileId("");
    setShowForm(false);
    setLoading(false);
    if (!form.email || (form.email && !selectedProfileId)) toast.success("Usuário adicionado");
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("responsible_persons").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover usuário");
    } else {
      onPersonsChange(persons.filter((p) => p.id !== id));
      toast.success("Usuário removido");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openForm} size="sm" style={{ background: "#f37022" }}>
          <Plus size={14} className="mr-1.5" />
          Adicionar Usuário
        </Button>
      </div>

      {persons.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <User size={32} className="mx-auto mb-2 opacity-30" />
          <p className="font-semibold">Nenhum usuário cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {persons.map((p) => (
            <div key={p.id} className="group flex items-start gap-3 p-4 rounded-xl border bg-card">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(243,112,34,0.12)" }}>
                <User size={14} style={{ color: "#f37022" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{p.name}</p>
                {p.role && <p className="text-xs text-muted-foreground">{p.role}</p>}
                {p.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone size={10} /> {p.phone}
                  </p>
                )}
                {p.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail size={10} /> {p.email}
                  </p>
                )}
              </div>
              <Button
                variant="ghost" size="icon"
                className="w-7 h-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive flex-shrink-0"
                onClick={() => handleDelete(p.id)}
              >
                <Trash2 size={12} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setForm(emptyForm); setSelectedProfileId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            {allProfiles.length > 0 && (
              <div className="space-y-1.5">
                <Label>Selecionar usuário do sistema</Label>
                <Select value={selectedProfileId} onValueChange={(v) => v && handleSelectProfile(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolher usuário..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">— Preencher manualmente —</SelectItem>
                    {allProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Os dados do usuário serão preenchidos automaticamente</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Função / Categoria</Label>
              <Input id="role" name="role" value={form.role} onChange={handleChange} placeholder="Ex: Financeiro, Coordenador..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@..." />
              </div>
            </div>
            {!selectedProfileId && form.email && (
              <p className="text-xs text-muted-foreground rounded-lg border px-3 py-2" style={{ borderColor: "rgba(243,112,34,0.3)", background: "rgba(243,112,34,0.05)" }}>
                Se não houver cadastro com este e-mail, será criada uma conta de Apoiador automaticamente.
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" disabled={loading} className="flex-1" style={{ background: "#f37022" }}>
                {loading ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
