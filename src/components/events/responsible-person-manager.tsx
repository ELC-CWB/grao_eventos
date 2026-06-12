"use client";

import { useState } from "react";
import type { ResponsiblePerson } from "@/types";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Phone, Mail, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ResponsiblePersonManagerProps {
  eventId: string;
  persons: ResponsiblePerson[];
  onPersonsChange: (persons: ResponsiblePerson[]) => void;
}

export function ResponsiblePersonManager({ eventId, persons, onPersonsChange }: ResponsiblePersonManagerProps) {
  const supabase = createClient();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", role: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase
      .from("responsible_persons")
      .insert({
        event_id: eventId,
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        role: form.role || null,
      })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao adicionar responsável");
    } else {
      onPersonsChange([...persons, data as ResponsiblePerson]);
      setForm({ name: "", phone: "", email: "", role: "" });
      setShowForm(false);
      toast.success("Responsável adicionado");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("responsible_persons").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover responsável");
    } else {
      onPersonsChange(persons.filter((p) => p.id !== id));
      toast.success("Responsável removido");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} size="sm" style={{ background: "#f37022" }}>
          <Plus size={14} className="mr-1.5" />
          Adicionar Responsável
        </Button>
      </div>

      {persons.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <User size={32} className="mx-auto mb-2 opacity-30" />
          <p className="font-semibold">Nenhum responsável cadastrado</p>
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Responsável</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Função / Categoria</Label>
              <Input id="role" name="role" value={form.role} onChange={handleChange} placeholder="Ex: Financeiro, Buffet..." />
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
