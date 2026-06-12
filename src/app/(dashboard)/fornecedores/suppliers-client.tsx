"use client";

import { useState } from "react";
import type { Profile, Supplier } from "@/types";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { exportToXML, downloadXML } from "@/lib/utils";
import {
  Plus, Search, Building2, Phone, Mail, MapPin,
  Edit, Trash2, Download, Tag,
} from "lucide-react";

interface SuppliersClientProps {
  profile: Profile;
  suppliers: Supplier[];
}

const emptyForm = {
  name: "",
  contact_name: "",
  phone: "",
  email: "",
  category: "",
  address: "",
  notes: "",
};

export function SuppliersClient({ profile, suppliers: initialSuppliers }: SuppliersClientProps) {
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditingSupplier(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(s: Supplier) {
    setEditingSupplier(s);
    setForm({
      name: s.name,
      contact_name: s.contact_name ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      category: s.category ?? "",
      address: s.address ?? "",
      notes: s.notes ?? "",
    });
    setShowForm(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      name: form.name,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      email: form.email || null,
      category: form.category || null,
      address: form.address || null,
      notes: form.notes || null,
    };

    let result;
    if (editingSupplier) {
      result = await supabase
        .from("suppliers")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingSupplier.id)
        .select()
        .single();
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      result = await supabase
        .from("suppliers")
        .insert({ ...payload, created_by: user!.id })
        .select()
        .single();
    }

    if (result.error) {
      toast.error("Erro ao salvar fornecedor");
    } else {
      if (editingSupplier) {
        setSuppliers((prev) => prev.map((s) => s.id === result.data.id ? result.data as Supplier : s));
        toast.success("Fornecedor atualizado");
      } else {
        setSuppliers((prev) => [...prev, result.data as Supplier].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success("Fornecedor cadastrado");
      }
      setShowForm(false);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    const { error } = await supabase.from("suppliers").delete().eq("id", deletingId);
    if (error) {
      toast.error("Erro ao excluir fornecedor");
    } else {
      setSuppliers((prev) => prev.filter((s) => s.id !== deletingId));
      toast.success("Fornecedor excluído");
    }
    setDeletingId(null);
    setDeleting(false);
  }

  function handleExport() {
    const data = suppliers.map((s) => ({
      id: s.id,
      nome: s.name,
      contato: s.contact_name ?? "",
      telefone: s.phone ?? "",
      email: s.email ?? "",
      categoria: s.category ?? "",
      endereco: s.address ?? "",
      notas: s.notes ?? "",
    }));
    const xml = exportToXML(data as Record<string, unknown>[], "fornecedores", "fornecedor");
    downloadXML(xml, "fornecedores.xml");
    toast.success("Exportação concluída");
  }

  // Group by category
  const categories = [...new Set(suppliers.map((s) => s.category || "Sem categoria"))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black">Fornecedores</h1>
          <p className="text-muted-foreground text-sm mt-1">{suppliers.length} fornecedor{suppliers.length !== 1 ? "es" : ""} cadastrado{suppliers.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download size={14} />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button onClick={openCreate} style={{ background: "#f37022" }}>
            <Plus size={14} className="mr-1.5" />
            Novo Fornecedor
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar fornecedores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Suppliers */}
      {suppliers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(243,112,34,0.1)" }}>
              <Building2 size={28} style={{ color: "#f37022" }} />
            </div>
            <p className="font-bold">Nenhum fornecedor cadastrado</p>
            <Button onClick={openCreate} className="mt-4" style={{ background: "#f37022" }}>
              <Plus size={14} className="mr-1.5" /> Cadastrar Fornecedor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="group card-hover rounded-2xl border bg-card overflow-hidden">
              <div className="h-1" style={{ background: "#f37022" }} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-sm truncate">{s.name}</h3>
                    {s.category && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1"
                        style={{ background: "rgba(243,112,34,0.1)", color: "#f37022" }}>
                        <Tag size={9} />{s.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(s)}>
                      <Edit size={12} />
                    </Button>
                    {profile.role === "admin" && (
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(s.id)}>
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  {s.contact_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Building2 size={10} className="flex-shrink-0" />
                      {s.contact_name}
                    </p>
                  )}
                  {s.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone size={10} className="flex-shrink-0" />
                      {s.phone}
                    </p>
                  )}
                  {s.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Mail size={10} className="flex-shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </p>
                  )}
                  {s.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <MapPin size={10} className="flex-shrink-0" />
                      <span className="truncate">{s.address}</span>
                    </p>
                  )}
                </div>

                {s.notes && (
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50 line-clamp-2">
                    {s.notes}
                  </p>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && search && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <p className="font-semibold">Nenhum fornecedor encontrado</p>
            </div>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingSupplier(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Nome do fornecedor" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contact_name">Contato</Label>
                <Input id="contact_name" name="contact_name" value={form.contact_name} onChange={handleChange} placeholder="Nome do responsável" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Categoria</Label>
                <Input id="category" name="category" value={form.category} onChange={handleChange} placeholder="Ex: Buffet, Decoração..." />
              </div>
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
            <div className="space-y-1.5">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" name="address" value={form.address} onChange={handleChange} placeholder="Endereço..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Input id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Notas opcionais..." />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" disabled={loading} className="flex-1" style={{ background: "#f37022" }}>
                {loading ? "Salvando..." : editingSupplier ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir Fornecedor</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este fornecedor?</p>
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
