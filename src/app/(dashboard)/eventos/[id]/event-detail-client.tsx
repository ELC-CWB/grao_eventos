"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import type { Event, Profile, Transaction, Category, ResponsiblePerson, Supplier, EventUser } from "@/types";
import { formatCurrency, formatDate, formatDateRange, getEventStatus } from "@/lib/utils";
import { exportTransactionsToExcel } from "@/lib/excel-export";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { EventChart } from "@/components/charts/event-chart";
import { CategoryManager } from "@/components/events/category-manager";
import {
  ArrowLeft, Plus, TrendingUp, TrendingDown, DollarSign, Download,
  Edit, Trash2, Calendar, MapPin, FileSpreadsheet, Users, X, Tag, ImageIcon,
} from "lucide-react";

interface EventDetailClientProps {
  profile: Profile;
  event: Event;
  transactions: Transaction[];
  categories: Category[];
  responsiblePersons: ResponsiblePerson[];
  suppliers: Supplier[];
  eventUsers: (EventUser & { profile?: Profile })[];
  allProfiles: Profile[];
}

export function EventDetailClient({
  profile,
  event,
  transactions: initialTransactions,
  categories: initialCategories,
  responsiblePersons: initialResponsiblePersons,
  suppliers,
  eventUsers: initialEventUsers,
  allProfiles,
}: EventDetailClientProps) {
  const supabase = createClient();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [categories, setCategories] = useState(initialCategories);
  const [responsiblePersons, setResponsiblePersons] = useState(initialResponsiblePersons);
  const [eventUsers, setEventUsers] = useState(initialEventUsers);
  const [showTxForm, setShowTxForm] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterDesc, setFilterDesc] = useState("__all__");
  const [filterDate, setFilterDate] = useState("__all__");
  const [filterCategory, setFilterCategory] = useState("__all__");
  const [filterUser, setFilterUser] = useState("__all__");
  const [filterSupplier, setFilterSupplier] = useState("__all__");
  const [showCategories, setShowCategories] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [linkProfileId, setLinkProfileId] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: "", email: "", phone: "" });
  const [addingUser, setAddingUser] = useState(false);
  const [eventImageUrl, setEventImageUrl] = useState<string | null>(event.image_url ?? null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = profile.role === "admin";

  const filteredTransactions = useMemo(() => transactions.filter((t) => {
    if (filterDesc !== "__all__" && t.description !== filterDesc) return false;
    if (filterDate !== "__all__" && t.date !== filterDate) return false;
    if (filterCategory !== "__all__") {
      const catId = (t.category as Category)?.id ?? null;
      if (filterCategory === "__none__") { if (catId) return false; }
      else if (catId !== filterCategory) return false;
    }
    if (filterUser !== "__all__") {
      const uid = (t.created_by_profile as { id?: string } | undefined)?.id ?? null;
      if (uid !== filterUser) return false;
    }
    if (filterSupplier !== "__all__") {
      const sid = (t.supplier as { id?: string } | undefined)?.id ?? null;
      if (sid !== filterSupplier) return false;
    }
    return true;
  }), [transactions, filterDesc, filterDate, filterCategory, filterUser, filterSupplier]);

  const hasFilters = filterDesc !== "__all__" || filterDate !== "__all__" || filterCategory !== "__all__" || filterUser !== "__all__" || filterSupplier !== "__all__";

  const summary = useMemo(() => {
    const revenue = filteredTransactions.filter((t) => t.type === "revenue").reduce((s, t) => s + Number(t.amount), 0);
    const expense = filteredTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { revenue, expense, profit: revenue - expense };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; expense: number }> = {};
    transactions.forEach((t) => {
      const catName = (t.category as Category)?.name || "Sem categoria";
      if (!map[catName]) map[catName] = { name: catName, revenue: 0, expense: 0 };
      if (t.type === "revenue") map[catName].revenue += Number(t.amount);
      else map[catName].expense += Number(t.amount);
    });
    return Object.values(map);
  }, [transactions]);

  const uniqueDates = useMemo(() =>
    [...new Set(transactions.map((t) => t.date))].sort((a, b) => b.localeCompare(a)),
    [transactions]);

  const uniqueDescs = useMemo(() =>
    [...new Set(transactions.map((t) => t.description))].sort((a, b) => a.localeCompare(b)),
    [transactions]);

  const usedCategories = useMemo(() => {
    const seen = new Map<string, string>();
    transactions.forEach((t) => {
      const cat = t.category as Category | undefined;
      if (cat?.id) seen.set(cat.id, cat.name);
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const uniqueUsers = useMemo(() => {
    const seen = new Map<string, string>();
    transactions.forEach((t) => {
      const p = (t.created_by_profile as { id?: string; full_name?: string } | undefined);
      if (p?.id && p?.full_name) seen.set(p.id, p.full_name);
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const uniqueSuppliers = useMemo(() => {
    const seen = new Map<string, string>();
    transactions.forEach((t) => {
      const s = (t.supplier as { id?: string; name?: string } | undefined);
      if (s?.id && s?.name) seen.set(s.id, s.name);
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  function clearFilters() {
    setFilterDesc("__all__");
    setFilterDate("__all__");
    setFilterCategory("__all__");
    setFilterUser("__all__");
    setFilterSupplier("__all__");
  }

  async function handleDeleteTx() {
    if (!deletingTxId) return;
    setDeleting(true);
    const { error } = await supabase.from("transactions").delete().eq("id", deletingTxId);
    if (error) {
      toast.error("Erro ao excluir lançamento");
    } else {
      toast.success("Lançamento excluído");
      setTransactions((prev) => prev.filter((t) => t.id !== deletingTxId));
    }
    setDeletingTxId(null);
    setDeleting(false);
  }

  function handleTxSaved(tx: Transaction) {
    if (editingTx) {
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
    } else {
      setTransactions((prev) => [tx, ...prev]);
    }
    setShowTxForm(false);
    setEditingTx(null);
  }

  function canEditTx(tx: Transaction) {
    return isAdmin || tx.created_by === profile.id;
  }

  async function handleExportCSV() {
    const rows = transactions.map((t) => ({
      date: formatDate(t.date),
      type: t.type === "revenue" ? "Receita" : "Despesa",
      description: t.description,
      category: (t.category as Category)?.name ?? "",
      supplier: (t.supplier as { name?: string } | undefined)?.name ?? "",
      user: (t.created_by_profile as { full_name?: string } | undefined)?.full_name ?? "",
      revenue: t.type === "revenue" ? Number(t.amount).toFixed(2).replace(".", ",") : "",
      expense: t.type === "expense" ? Number(t.amount).toFixed(2).replace(".", ",") : "",
      notes: t.notes ?? "",
    }));
    await exportTransactionsToExcel(event.name, rows);
    toast.success("Exportação concluída");
  }

  async function handleLinkUser() {
    if (!linkProfileId) return;
    setLinking(true);
    const { data, error } = await supabase
      .from("event_users")
      .insert({ event_id: event.id, user_id: linkProfileId })
      .select("*, profile:profiles(*)")
      .single();
    if (error) {
      toast.error("Erro ao vincular usuário");
    } else {
      setEventUsers((prev) => [...prev, data as typeof prev[0]]);
      setLinkProfileId("");
      toast.success("Usuário vinculado");
    }
    setLinking(false);
  }

  async function handleUnlinkUser(euId: string) {
    setUnlinkingId(euId);
    const { error } = await supabase.from("event_users").delete().eq("id", euId);
    if (error) {
      toast.error("Erro ao desvincular usuário");
    } else {
      setEventUsers((prev) => prev.filter((eu) => eu.id !== euId));
      toast.success("Usuário desvinculado");
    }
    setUnlinkingId(null);
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddingUser(true);
    const { email, name, phone } = newUserForm;

    // Check if profile exists
    const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).single();

    let profileId: string | null = existing?.id ?? null;

    if (!profileId) {
      const tempPassword = `Apoio@${Math.random().toString(36).slice(2, 8)}`;
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: tempPassword, full_name: name, phone: phone || "", role: "manager" }),
      });
      if (!res.ok) {
        toast.error("Erro ao criar usuário");
        setAddingUser(false);
        return;
      }
      const result = await res.json();
      profileId = result.profile.id;
      toast.success(`Usuário criado! Senha temporária: ${tempPassword}`, { duration: 10000 });
    }

    const alreadyLinked = eventUsers.some((eu) => eu.user_id === profileId);
    if (!alreadyLinked) {
      const { data, error } = await supabase
        .from("event_users")
        .insert({ event_id: event.id, user_id: profileId })
        .select("*, profile:profiles(*)")
        .single();
      if (error) {
        toast.error("Erro ao vincular usuário ao projeto");
      } else {
        setEventUsers((prev) => [...prev, data as typeof prev[0]]);
        toast.success("Usuário adicionado ao projeto");
      }
    } else {
      toast.info("Usuário já está vinculado a este projeto");
    }

    setNewUserForm({ name: "", email: "", phone: "" });
    setShowAddUser(false);
    setAddingUser(false);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const ext = file.name.split(".").pop();
    const path = `${event.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("event-images").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro ao enviar imagem"); setUploadingImage(false); return; }
    const { data } = supabase.storage.from("event-images").getPublicUrl(path);
    const { error: updateError } = await supabase.from("events").update({ image_url: data.publicUrl }).eq("id", event.id);
    if (updateError) { toast.error("Erro ao salvar imagem"); }
    else { setEventImageUrl(data.publicUrl); toast.success("Imagem salva"); }
    setUploadingImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/eventos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft size={14} />
          Voltar aos eventos
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-1 h-14 rounded-full flex-shrink-0 mt-1" style={{ background: event.color || "#f37022" }} />

            <div>
              <h1 className="text-2xl lg:text-3xl font-black leading-tight">{event.name}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDateRange(event.start_date, event.end_date)}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {event.location}
                  </span>
                )}
              </div>
            </div>

            {/* Image or upload zone — after the name */}
            <div className="flex-shrink-0 relative group/img">
              {eventImageUrl ? (
                <div className="w-14 h-14 rounded-xl overflow-hidden border bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={eventImageUrl} alt={event.name} className="w-full h-full object-contain" />
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white rounded-xl"
                      title="Trocar imagem"
                    >
                      <ImageIcon size={13} />
                    </button>
                  )}
                </div>
              ) : isAdmin ? (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-14 h-14 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  {uploadingImage ? <span className="text-[9px]">...</span> : <><ImageIcon size={14} /><span className="text-[9px] font-medium">Foto</span></>}
                </button>
              ) : null}
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex-shrink-0 gap-2">
            <Download size={14} />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>
        </div>
      </div>

      {/* Summary cards + Gráfico button */}
      <div className="flex gap-2 items-stretch">
        <Card className="flex-1 min-w-0">
          <CardContent className="px-3 py-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.12)" }}>
                <TrendingUp size={11} className="text-emerald-500" />
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Receitas</span>
            </div>
            <p className="text-base font-black text-emerald-600 mt-1">{formatCurrency(summary.revenue)}</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-0">
          <CardContent className="px-3 py-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.12)" }}>
                <TrendingDown size={11} className="text-red-500" />
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Despesas</span>
            </div>
            <p className="text-base font-black text-red-500 mt-1">{formatCurrency(summary.expense)}</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-0">
          <CardContent className="px-3 py-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: summary.profit >= 0 ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)" }}>
                <DollarSign size={11} className={summary.profit >= 0 ? "text-emerald-500" : "text-red-500"} />
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Resultado</span>
            </div>
            <p className={cn("text-base font-black mt-1", summary.profit >= 0 ? "text-emerald-600" : "text-red-500")}>
              {formatCurrency(summary.profit)}
            </p>
          </CardContent>
        </Card>
        <button
          type="button"
          onClick={() => setShowChart(true)}
          className="flex-shrink-0 flex flex-col items-center justify-center gap-1 px-2 w-16 rounded-xl border text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors leading-tight"
        >
          <FileSpreadsheet size={13} />
          Gráfico Categoria
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setShowCategories(true)} className="gap-2">
          <Tag size={14} />
          Categorias
        </Button>
        <Button variant="outline" onClick={() => setShowUsers(true)} className="gap-2">
          <Users size={14} />
          Usuários
        </Button>
      </div>

      {/* Transactions table — always visible */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-black text-sm">Lançamentos</h2>
          <Button onClick={() => { setEditingTx(null); setShowTxForm(true); }} size="sm" style={{ background: "#f37022" }}>
            <Plus size={13} className="mr-1.5" />
            Lançamento
          </Button>
        </div>


        {transactions.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <FileSpreadsheet size={28} className="mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-sm">Nenhum lançamento</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: "rgba(0,0,0,0.02)" }}>
                  <th className="text-left px-2 py-1.5">
                    <Select value={filterDate} onValueChange={setFilterDate}>
                      <SelectTrigger className="h-6 border-0 shadow-none bg-transparent px-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground w-auto gap-0.5">
                        <SelectValue>{filterDate === "__all__" ? "Data" : formatDate(filterDate)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="[&_[data-slot=select-item]]:!text-[10px] [&_[data-slot=select-item]]:py-0.5">
                        <SelectItem value="__all__">Todas as datas</SelectItem>
                        {uniqueDates.map((d) => (
                          <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </th>
                  <th className="text-left px-2 py-1.5 hidden lg:table-cell">
                    <Select value={filterUser} onValueChange={setFilterUser}>
                      <SelectTrigger className="h-6 border-0 shadow-none bg-transparent px-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground w-auto gap-0.5">
                        <SelectValue>{filterUser === "__all__" ? "Usuário" : (uniqueUsers.find(u => u.id === filterUser)?.name ?? "Usuário")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="[&_[data-slot=select-item]]:!text-[10px] [&_[data-slot=select-item]]:py-0.5">
                        <SelectItem value="__all__">Todos os usuários</SelectItem>
                        {uniqueUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </th>
                  <th className="text-left px-2 py-1.5 hidden md:table-cell">
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="h-6 border-0 shadow-none bg-transparent px-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground w-auto gap-0.5">
                        <SelectValue>
                          {filterCategory === "__all__" ? "Categoria" : filterCategory === "__none__" ? "Sem categoria" : usedCategories.find(c => c.id === filterCategory)?.name ?? "Categoria"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="[&_[data-slot=select-item]]:!text-[10px] [&_[data-slot=select-item]]:py-0.5">
                        <SelectItem value="__all__">Todas as categorias</SelectItem>
                        {usedCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </th>
                  <th className="text-left px-2 py-1.5 hidden md:table-cell">
                    <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                      <SelectTrigger className="h-6 border-0 shadow-none bg-transparent px-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground w-auto gap-0.5">
                        <SelectValue>{filterSupplier === "__all__" ? "Fornecedor" : (uniqueSuppliers.find(s => s.id === filterSupplier)?.name ?? "Fornecedor")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="[&_[data-slot=select-item]]:!text-[10px] [&_[data-slot=select-item]]:py-0.5">
                        <SelectItem value="__all__">Todos os fornecedores</SelectItem>
                        {uniqueSuppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </th>
                  <th className="text-left px-2 py-1.5">
                    <Select value={filterDesc} onValueChange={setFilterDesc}>
                      <SelectTrigger className="h-6 border-0 shadow-none bg-transparent px-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground w-auto gap-0.5 max-w-[200px]">
                        <SelectValue>{filterDesc === "__all__" ? "Descrição" : filterDesc}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="[&_[data-slot=select-item]]:!text-[10px] [&_[data-slot=select-item]]:py-0.5">
                        <SelectItem value="__all__">Todas as descrições</SelectItem>
                        {uniqueDescs.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-emerald-600">Receita</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-red-500">Despesa</th>
                  <th className="w-16 text-right pr-2">
                    {hasFilters && (
                      <button onClick={clearFilters} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-auto">
                        <X size={10} /> Limpar
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum lançamento encontrado para os filtros selecionados
                    </td>
                  </tr>
                ) : filteredTransactions.map((tx) => {
                  const cat = tx.category as Category | undefined;
                  return (
                    <tr
                      key={tx.id}
                      className="group border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                        {(tx.created_by_profile as { full_name?: string } | undefined)?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {cat?.name ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(243,112,34,0.1)", color: "#d4601a" }}>
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">
                        {(tx.supplier as { name?: string } | undefined)?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{tx.description}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-600 whitespace-nowrap">
                        {tx.type === "revenue" ? formatCurrency(Number(tx.amount)) : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-red-500 whitespace-nowrap">
                        {tx.type === "expense" ? formatCurrency(Number(tx.amount)) : ""}
                      </td>
                      <td className="px-2 py-3">
                        {canEditTx(tx) && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <Button variant="ghost" size="icon" className="w-6 h-6"
                              onClick={() => { setEditingTx(tx); setShowTxForm(true); }}>
                              <Edit size={11} />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:text-destructive"
                              onClick={() => setDeletingTxId(tx.id)}>
                              <Trash2 size={11} />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Gráfico Dialog */}
      <Dialog open={showChart} onOpenChange={setShowChart}>
        <DialogContent style={{ maxWidth: "780px", width: "calc(100vw - 2rem)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet size={15} style={{ color: "#f37022" }} /> Gráfico por Categoria
            </DialogTitle>
          </DialogHeader>
          <div className="px-1">
            <EventChart data={chartData} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Categorias Dialog */}
      <Dialog open={showCategories} onOpenChange={setShowCategories}>
        <DialogContent style={{ maxWidth: "750px", width: "calc(100vw - 2rem)" }} className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Tag size={15} /> Categorias</DialogTitle>
          </DialogHeader>
          <CategoryManager
            eventId={event.id}
            categories={categories}
            onCategoriesChange={setCategories}
          />
        </DialogContent>
      </Dialog>

      {/* Usuários Dialog */}
      <Dialog open={showUsers} onOpenChange={(open) => { setShowUsers(open); if (!open) { setLinkProfileId(""); setShowAddUser(false); setNewUserForm({ name: "", email: "", phone: "" }); }}}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users size={15} /> Usuários do Projeto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Linked users list */}
            {eventUsers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users size={28} className="mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-sm">Nenhum usuário vinculado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {eventUsers.map((eu) => {
                  const p = eu.profile as Profile | undefined;
                  if (!p) return null;
                  const initials = p.full_name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
                  return (
                    <div key={eu.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                        style={{ background: "#f37022" }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                        {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${p.role === "admin" ? "status-ongoing" : "status-upcoming"}`}>
                        {p.role === "admin" ? "Admin" : "Apoiador"}
                      </span>
                      {isAdmin && (
                        <Button
                          variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive flex-shrink-0"
                          disabled={unlinkingId === eu.id}
                          onClick={() => handleUnlinkUser(eu.id)}
                          title="Desvincular"
                        >
                          <X size={13} />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Vincular usuário existente */}
            {(() => {
              const unlinked = allProfiles.filter((p) => !eventUsers.some((eu) => eu.user_id === p.id));
              if (unlinked.length === 0) return null;
              return (
                <div className="space-y-1.5 pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vincular usuário existente</p>
                  <div className="flex gap-2">
                    <Select value={linkProfileId} onValueChange={setLinkProfileId}>
                      <SelectTrigger className="flex-1 h-9 text-sm">
                        <SelectValue>{linkProfileId ? allProfiles.find(p => p.id === linkProfileId)?.full_name : "Selecionar usuário..."}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {unlinked.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" disabled={!linkProfileId || linking} onClick={handleLinkUser} style={{ background: "#f37022" }}>
                      {linking ? "..." : "Vincular"}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Adicionar novo usuário — apenas admin */}
            {isAdmin && (
              <div className="pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddUser((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus size={13} />
                  {showAddUser ? "Cancelar" : "Adicionar novo usuário"}
                </button>

                {showAddUser && (
                  <form onSubmit={handleAddUser} className="mt-3 space-y-2.5 px-3 py-2 rounded-xl border" style={{ borderColor: "rgba(243,112,34,0.25)", background: "rgba(243,112,34,0.03)" }}>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Nome *</label>
                      <Input value={newUserForm.name} onChange={(e) => setNewUserForm(f => ({ ...f, name: e.target.value }))} required placeholder="Nome completo" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">E-mail *</label>
                      <Input type="email" value={newUserForm.email} onChange={(e) => setNewUserForm(f => ({ ...f, email: e.target.value }))} required placeholder="email@..." className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Telefone</label>
                      <Input value={newUserForm.phone} onChange={(e) => setNewUserForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" className="h-8 text-sm" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Se não existir cadastro com este e-mail, será criada uma conta de Apoiador.</p>
                    <Button type="submit" size="sm" disabled={addingUser} className="w-full" style={{ background: "#f37022" }}>
                      {addingUser ? "Adicionando..." : "Adicionar e vincular"}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Form Dialog */}
      <Dialog open={showTxForm} onOpenChange={(open) => { setShowTxForm(open); if (!open) setEditingTx(null); }}>
        <DialogContent style={{ maxWidth: "680px", width: "calc(100vw - 2rem)" }}>
          <DialogHeader>
            <DialogTitle>{editingTx ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            eventId={event.id}
            transaction={editingTx ?? undefined}
            categories={categories}
            suppliers={suppliers}
            onSaved={handleTxSaved}
            onCancel={() => { setShowTxForm(false); setEditingTx(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete TX Confirm */}
      <Dialog open={!!deletingTxId} onOpenChange={(open) => !open && setDeletingTxId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir Lançamento</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este lançamento?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTxId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteTx} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
