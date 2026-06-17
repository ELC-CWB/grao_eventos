"use client";

import { useState, useMemo } from "react";
import type { Profile, Supplier, SupplierType } from "@/types";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { exportSuppliersToExcel } from "@/lib/excel-export";
import {
  Plus, Building2,
  Edit, Trash2, Download, X,
} from "lucide-react";

interface SuppliersClientProps {
  profile: Profile;
  suppliers: Supplier[];
}


const emptyForm = {
  supplier_type: "pf" as SupplierType,
  name: "",
  cnpj: "",
  company_name: "",
  contact_name: "",
  phone: "",
  email: "",
  category: "",
  item_supplied: "",
  address: "",
  notes: "",
};

export function SuppliersClient({ profile, suppliers: initialSuppliers }: SuppliersClientProps) {
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [filterName, setFilterName] = useState("__all__");
  const [filterContact, setFilterContact] = useState("__all__");
  const [filterPhone, setFilterPhone] = useState("__all__");
  const [filterItem, setFilterItem] = useState("__all__");
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

const uniqueNames = useMemo(() =>
    [...new Set(suppliers.map((s) => s.name))].sort((a, b) => a.localeCompare(b)), [suppliers]);
  const uniqueContacts = useMemo(() =>
    [...new Set(suppliers.map((s) => s.contact_name).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)), [suppliers]);
  const uniquePhones = useMemo(() =>
    [...new Set(suppliers.map((s) => s.phone).filter(Boolean) as string[])].sort(), [suppliers]);
const uniqueItems = useMemo(() =>
    [...new Set(suppliers.map((s) => s.item_supplied).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)), [suppliers]);

  const filtered = useMemo(() => suppliers.filter((s) => {
    if (filterName !== "__all__" && s.name !== filterName) return false;
    if (filterContact !== "__all__" && s.contact_name !== filterContact) return false;
    if (filterPhone !== "__all__" && s.phone !== filterPhone) return false;
    if (filterItem !== "__all__" && s.item_supplied !== filterItem) return false;
    return true;
  }), [suppliers, filterName, filterContact, filterPhone, filterItem]);

function openCreate() {
    setEditingSupplier(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(s: Supplier) {
    setEditingSupplier(s);
    setForm({
      supplier_type: s.supplier_type ?? "pf",
      name: s.name,
      cnpj: s.cnpj ?? "",
      company_name: s.company_name ?? "",
      contact_name: s.contact_name ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      category: s.category ?? "",
      item_supplied: s.item_supplied ?? "",
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
      supplier_type: form.supplier_type,
      name: form.name,
      cnpj: form.supplier_type === "pj" ? form.cnpj || null : null,
      company_name: form.supplier_type === "pj" ? form.company_name || null : null,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      email: form.email || null,
      category: form.category || null,
      item_supplied: form.item_supplied || null,
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

  async function handleExport() {
    const rows = suppliers.map((s) => ({
      name: s.name,
      contact: s.contact_name ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      item: s.item_supplied ?? "",
      notes: s.notes ?? "",
    }));
    await exportSuppliersToExcel(rows);
    toast.success("Exportação concluída");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black">Fornecedores</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {suppliers.length} fornecedor{suppliers.length !== 1 ? "es" : ""} cadastrado{suppliers.length !== 1 ? "s" : ""}
          </p>
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

      {/* Table */}
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
        <div className="rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: "rgba(243,112,34,0.06)" }}>
                  {/* Nome */}
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    <Select value={filterName} onValueChange={(v) => v && setFilterName(v)}>
                      <SelectTrigger className="h-7 border-0 bg-transparent px-0 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-none focus:ring-0 w-auto gap-1">
                        <SelectValue>{filterName === "__all__" ? "Nome" : filterName}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos</SelectItem>
                        {uniqueNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </th>
                  {/* Contato */}
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    <Select value={filterContact} onValueChange={(v) => v && setFilterContact(v)}>
                      <SelectTrigger className="h-7 border-0 bg-transparent px-0 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-none focus:ring-0 w-auto gap-1">
                        <SelectValue>{filterContact === "__all__" ? "Contato" : filterContact}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos</SelectItem>
                        {uniqueContacts.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </th>
                  {/* Telefone */}
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    <Select value={filterPhone} onValueChange={(v) => v && setFilterPhone(v)}>
                      <SelectTrigger className="h-7 border-0 bg-transparent px-0 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-none focus:ring-0 w-auto gap-1">
                        <SelectValue>{filterPhone === "__all__" ? "Telefone" : filterPhone}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos</SelectItem>
                        {uniquePhones.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </th>
                  {/* Item Fornecido */}
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    <Select value={filterItem} onValueChange={(v) => v && setFilterItem(v)}>
                      <SelectTrigger className="h-7 border-0 bg-transparent px-0 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-none focus:ring-0 w-auto gap-1">
                        <SelectValue>{filterItem === "__all__" ? "Item Fornecido" : filterItem}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos</SelectItem>
                        {uniqueItems.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </th>
                  <th className="px-4 py-2.5 w-28" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                      Nenhum fornecedor encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : filtered.map((s) => (
                  <tr key={s.id} className="group border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openEdit(s)}>
                    <td className="px-4 py-1.5 font-semibold">{s.name}</td>
                    <td className="px-4 py-1.5 text-muted-foreground">{s.contact_name ?? "—"}</td>
                    <td className="px-4 py-1.5 text-muted-foreground">{s.phone ?? "—"}</td>
                    <td className="px-4 py-1.5 text-muted-foreground">{s.item_supplied ?? "—"}</td>
                    <td className="px-4 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(s)}>
                          <Edit size={12} />
                        </Button>
                        {profile.role === "admin" && (
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => setDeletingId(s.id)}>
                            <Trash2 size={12} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingSupplier(null); }}>
        <DialogContent style={{ maxWidth: "900px", width: "calc(100vw - 2rem)" }}>
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-2.5">
            {/* PF / PJ toggle */}
            <div className="space-y-1">
              <Label className="text-xs">Tipo de Fornecedor *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["pf", "pj"] as const).map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => setForm((prev) => ({ ...prev, supplier_type: t, cnpj: "", company_name: "" }))}
                    className="py-2 rounded-xl font-semibold text-sm border-2 transition-all"
                    style={
                      form.supplier_type === t
                        ? { background: t === "pf" ? "#10b981" : "#3b82f6", borderColor: t === "pf" ? "#10b981" : "#3b82f6", color: "white" }
                        : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
                    }
                  >
                    {t === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}
                  </button>
                ))}
              </div>
            </div>

            {form.supplier_type === "pj" && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border" style={{ borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.03)" }}>
                <div className="space-y-1">
                  <Label htmlFor="company_name" className="text-xs">Razão Social</Label>
                  <Input id="company_name" name="company_name" value={form.company_name} onChange={handleChange} placeholder="Razão social da empresa" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cnpj" className="text-xs">CNPJ</Label>
                  <Input id="cnpj" name="cnpj" value={form.cnpj} onChange={handleChange} placeholder="00.000.000/0001-00" className="h-8 text-sm" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">{form.supplier_type === "pj" ? "Nome Fantasia *" : "Nome *"}</Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} required
                  placeholder={form.supplier_type === "pj" ? "Nome fantasia" : "Nome do fornecedor"} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_name" className="text-xs">{"Contato"}</Label>
                <Input id="contact_name" name="contact_name" value={form.contact_name} onChange={handleChange}
                  placeholder="Nome do contato" className="h-8 text-sm" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="item_supplied" className="text-xs">Item Fornecido</Label>
              <Input id="item_supplied" name="item_supplied" value={form.item_supplied} onChange={handleChange} placeholder="Ex: Mesas, Som, Iluminação..." className="h-8 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs">Telefone</Label>
                <Input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">E-mail</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@..." className="h-8 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="address" className="text-xs">Endereço</Label>
                <Input id="address" name="address" value={form.address} onChange={handleChange} placeholder="Endereço..." className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs">Observações</Label>
                <Input id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Notas opcionais..." className="h-8 text-sm" />
              </div>
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
