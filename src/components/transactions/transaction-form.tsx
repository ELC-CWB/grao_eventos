"use client";

import { useState } from "react";
import type { Transaction, Category, ResponsiblePerson } from "@/types";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface TransactionFormProps {
  eventId: string;
  transaction?: Transaction;
  categories: Category[];
  responsiblePersons: ResponsiblePerson[];
  onSaved: (tx: Transaction) => void;
  onCancel: () => void;
}

export function TransactionForm({
  eventId,
  transaction,
  categories,
  responsiblePersons,
  onSaved,
  onCancel,
}: TransactionFormProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: transaction?.type ?? "expense",
    description: transaction?.description ?? "",
    amount: transaction ? String(transaction.amount) : "",
    date: transaction?.date ?? new Date().toISOString().split("T")[0],
    category_id: transaction?.category_id ?? "",
    responsible_person_id: transaction?.responsible_person_id ?? "",
    notes: transaction?.notes ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const amount = parseFloat(form.amount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valor inválido");
      setLoading(false);
      return;
    }

    const payload: Record<string, unknown> = {
      event_id: eventId,
      type: form.type,
      description: form.description,
      amount,
      date: form.date,
      category_id: form.category_id || null,
      responsible_person_id: form.responsible_person_id || null,
      notes: form.notes || null,
    };

    let result;
    if (transaction) {
      result = await supabase
        .from("transactions")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", transaction.id)
        .select("*, category:categories(*), responsible_person:responsible_persons(*)")
        .single();
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      result = await supabase
        .from("transactions")
        .insert({ ...payload, created_by: user!.id })
        .select("*, category:categories(*), responsible_person:responsible_persons(*)")
        .single();
    }

    if (result.error) {
      toast.error("Erro ao salvar lançamento");
    } else {
      toast.success(transaction ? "Lançamento atualizado" : "Lançamento criado");
      onSaved(result.data as Transaction);
    }
    setLoading(false);
  }

  const revenueCategories = categories.filter((c) => c.type === "revenue");
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const relevantCategories = form.type === "revenue" ? revenueCategories : expenseCategories;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <div className="space-y-1.5">
        <Label>Tipo *</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["revenue", "expense"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, type: t, category_id: "" }))}
              className="py-2.5 rounded-xl font-semibold text-sm border-2 transition-all"
              style={
                form.type === t
                  ? {
                      background: t === "revenue" ? "#10b981" : "#ef4444",
                      borderColor: t === "revenue" ? "#10b981" : "#ef4444",
                      color: "white",
                    }
                  : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
              }
            >
              {t === "revenue" ? "Receita" : "Despesa"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição *</Label>
        <Input
          id="description"
          name="description"
          placeholder="Ex: Venda de ingressos"
          value={form.description}
          onChange={handleChange}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Valor (R$) *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            value={form.amount}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Data *</Label>
          <Input
            id="date"
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <Select
          value={form.category_id}
          onValueChange={(v) => setForm((prev) => ({ ...prev, category_id: !v || v === "none" ? "" : v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar categoria..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem categoria</SelectItem>
            {relevantCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Responsável</Label>
        <Select
          value={form.responsible_person_id}
          onValueChange={(v) => setForm((prev) => ({ ...prev, responsible_person_id: !v || v === "none" ? "" : v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar responsável..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem responsável</SelectItem>
            {responsiblePersons.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Input
          id="notes"
          name="notes"
          placeholder="Observações opcionais..."
          value={form.notes}
          onChange={handleChange}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button type="submit" disabled={loading} className="flex-1" style={{ background: "#f37022" }}>
          {loading ? "Salvando..." : transaction ? "Salvar" : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}
