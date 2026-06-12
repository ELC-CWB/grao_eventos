"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Event, Profile, Transaction, Category, ResponsiblePerson, Supplier, EventUser } from "@/types";
import { formatCurrency, formatDate, formatDateRange, getEventStatus, exportToXML, downloadXML } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { EventChart } from "@/components/charts/event-chart";
import { CategoryManager } from "@/components/events/category-manager";
import { ResponsiblePersonManager } from "@/components/events/responsible-person-manager";
import { EventUsersManager } from "@/components/events/event-users-manager";
import {
  ArrowLeft, Plus, TrendingUp, TrendingDown, DollarSign, Download,
  Edit, Trash2, Calendar, MapPin, FileSpreadsheet,
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

const STATUS_CONFIG = {
  upcoming: { label: "Próximo", className: "status-upcoming" },
  ongoing: { label: "Em andamento", className: "status-ongoing" },
  completed: { label: "Concluído", className: "status-completed" },
};

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
  const [typeFilter, setTypeFilter] = useState<"all" | "revenue" | "expense">("all");

  const isAdmin = profile.role === "admin";
  const status = getEventStatus(event.start_date, event.end_date);
  const statusConfig = STATUS_CONFIG[status];

  const summary = useMemo(() => {
    const revenue = transactions.filter((t) => t.type === "revenue").reduce((s, t) => s + Number(t.amount), 0);
    const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { revenue, expense, profit: revenue - expense };
  }, [transactions]);

  const filteredTransactions = transactions.filter((t) =>
    typeFilter === "all" ? true : t.type === typeFilter
  );

  // Revenue/expense by category for chart
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

  function handleExportXML() {
    const data = transactions.map((t) => ({
      id: t.id,
      tipo: t.type === "revenue" ? "Receita" : "Despesa",
      descricao: t.description,
      valor: Number(t.amount).toFixed(2),
      data: t.date,
      categoria: (t.category as Category)?.name ?? "",
      responsavel: (t.responsible_person as ResponsiblePerson)?.name ?? "",
      notas: t.notes ?? "",
    }));
    const xml = exportToXML(data as Record<string, unknown>[], "lancamentos", "lancamento");
    downloadXML(xml, `${event.name.replace(/\s+/g, "_")}_lancamentos.xml`);
    toast.success("Exportação concluída");
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
            <div className="w-1 h-16 rounded-full flex-shrink-0" style={{ background: event.color || "#f37022" }} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full", statusConfig.className)}>
                  {statusConfig.label}
                </span>
              </div>
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
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportXML}
            className="flex-shrink-0 gap-2"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportar XML</span>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
                <TrendingUp size={14} className="text-emerald-500" />
              </div>
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Receitas</span>
            </div>
            <p className="text-xl font-black text-emerald-600">{formatCurrency(summary.revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
                <TrendingDown size={14} className="text-red-500" />
              </div>
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Despesas</span>
            </div>
            <p className="text-xl font-black text-red-500">{formatCurrency(summary.expense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: summary.profit >= 0 ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)" }}>
                <DollarSign size={14} className={summary.profit >= 0 ? "text-emerald-500" : "text-red-500"} />
              </div>
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Resultado</span>
            </div>
            <p className={cn("text-xl font-black", summary.profit >= 0 ? "text-emerald-600" : "text-red-500")}>
              {formatCurrency(summary.profit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && <EventChart data={chartData} />}

      {/* Tabs */}
      <Tabs defaultValue="transactions">
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">
            Lançamentos ({transactions.length})
          </TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="responsible">Responsáveis</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Usuários</TabsTrigger>}
        </TabsList>

        {/* Transactions */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {(["all", "revenue", "expense"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={cn(
                    "text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
                    typeFilter === f
                      ? "text-white border-transparent"
                      : "text-muted-foreground border-border hover:border-primary/40"
                  )}
                  style={typeFilter === f ? { background: "#f37022" } : undefined}
                >
                  {f === "all" ? "Todos" : f === "revenue" ? "Receitas" : "Despesas"}
                </button>
              ))}
            </div>
            <Button
              onClick={() => { setEditingTx(null); setShowTxForm(true); }}
              size="sm"
              style={{ background: "#f37022" }}
            >
              <Plus size={14} className="mr-1.5" />
              Lançamento
            </Button>
          </div>

          {filteredTransactions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <FileSpreadsheet size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold text-muted-foreground">Nenhum lançamento</p>
                <Button onClick={() => setShowTxForm(true)} className="mt-3" size="sm" style={{ background: "#f37022" }}>
                  <Plus size={14} className="mr-1.5" /> Adicionar
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="group flex items-center gap-3 p-3.5 rounded-xl border bg-card"
                >
                  <div
                    className="w-1.5 h-10 rounded-full flex-shrink-0"
                    style={{ background: tx.type === "revenue" ? "#10b981" : "#ef4444" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {(tx.category as Category)?.name && (
                        <span className="font-medium" style={{ color: "#f37022" }}>
                          {(tx.category as Category).name}
                        </span>
                      )}
                      {(tx.category as Category)?.name && " · "}
                      {formatDate(tx.date)}
                      {(tx.responsible_person as ResponsiblePerson)?.name && (
                        <> · {(tx.responsible_person as ResponsiblePerson).name}</>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      "font-black text-sm",
                      tx.type === "revenue" ? "text-emerald-600" : "text-red-500"
                    )}>
                      {tx.type === "expense" ? "−" : "+"}{formatCurrency(Number(tx.amount))}
                    </p>
                  </div>
                  {canEditTx(tx) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost" size="icon" className="w-7 h-7"
                        onClick={() => { setEditingTx(tx); setShowTxForm(true); }}
                      >
                        <Edit size={12} />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="w-7 h-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingTxId(tx.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManager
            eventId={event.id}
            categories={categories}
            onCategoriesChange={setCategories}
          />
        </TabsContent>

        <TabsContent value="responsible">
          <ResponsiblePersonManager
            eventId={event.id}
            persons={responsiblePersons}
            onPersonsChange={setResponsiblePersons}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <EventUsersManager
              eventId={event.id}
              eventUsers={eventUsers}
              allProfiles={allProfiles}
              onUsersChange={setEventUsers}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Transaction Form Dialog */}
      <Dialog open={showTxForm} onOpenChange={(open) => { setShowTxForm(open); if (!open) setEditingTx(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTx ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            eventId={event.id}
            transaction={editingTx ?? undefined}
            categories={categories}
            responsiblePersons={responsiblePersons}
            onSaved={handleTxSaved}
            onCancel={() => { setShowTxForm(false); setEditingTx(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete TX Confirm */}
      <Dialog open={!!deletingTxId} onOpenChange={(open) => !open && setDeletingTxId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Lançamento</DialogTitle>
          </DialogHeader>
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
