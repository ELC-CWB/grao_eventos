"use client";

import { useState } from "react";
import type { Category } from "@/types";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Tag, Check, X, Pencil } from "lucide-react";

interface CategoryManagerProps {
  eventId: string;
  categories: Category[];
  onCategoriesChange: (cats: Category[]) => void;
}

export function CategoryManager({ eventId, categories, onCategoriesChange }: CategoryManagerProps) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<"revenue" | "expense">("expense");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .insert({ event_id: eventId, name: name.trim(), type })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao adicionar categoria");
    } else {
      onCategoriesChange([...categories, data as Category]);
      setName("");
      toast.success("Categoria adicionada");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir categoria");
    } else {
      onCategoriesChange(categories.filter((c) => c.id !== id));
      toast.success("Categoria removida");
    }
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditingName(c.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function confirmEdit(id: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    const { error } = await supabase.from("categories").update({ name: trimmed }).eq("id", id);
    if (error) {
      toast.error("Erro ao renomear categoria");
    } else {
      onCategoriesChange(categories.map((c) => c.id === id ? { ...c, name: trimmed } : c));
      toast.success("Categoria atualizada");
      cancelEdit();
    }
  }

  const revenueCategories = categories.filter((c) => c.type === "revenue");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  function renderCategory(c: Category) {
    const isEditing = editingId === c.id;
    return (
      <div key={c.id} className="group flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary">
        {isEditing ? (
          <>
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="h-7 text-sm flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); confirmEdit(c.id); }
                if (e.key === "Escape") cancelEdit();
              }}
            />
            <Button variant="ghost" size="icon" className="w-6 h-6 text-emerald-600 hover:text-emerald-700 flex-shrink-0" onClick={() => confirmEdit(c.id)}>
              <Check size={12} />
            </Button>
            <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground flex-shrink-0" onClick={cancelEdit}>
              <X size={12} />
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold flex-1">{c.name}</span>
            <Button
              variant="ghost" size="icon"
              className="w-6 h-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground flex-shrink-0"
              onClick={() => startEdit(c)}
            >
              <Pencil size={11} />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="w-6 h-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive flex-shrink-0"
              onClick={() => handleDelete(c.id)}
            >
              <Trash2 size={11} />
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Add form */}
      <form onSubmit={handleAdd} className="space-y-2">
        <div className="flex gap-2">
          <Select value={type} onValueChange={(v) => setType(v as "revenue" | "expense")}>
            <SelectTrigger className="w-36 flex-shrink-0">
              <SelectValue>{type === "revenue" ? "Receita" : "Despesa"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={loading} style={{ background: "#f37022" }}>
            <Plus size={14} className="mr-1.5" />
            Adicionar
          </Button>
        </div>
        <Input
          placeholder="Nome da categoria..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full"
          required
        />
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-bold text-emerald-600 mb-3 flex items-center gap-1.5">
            <Tag size={13} /> Categorias de Receita ({revenueCategories.length})
          </p>
          {revenueCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma categoria de receita</p>
          ) : (
            <div className="space-y-1.5">
              {revenueCategories.map(renderCategory)}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-bold text-red-500 mb-3 flex items-center gap-1.5">
            <Tag size={13} /> Categorias de Despesa ({expenseCategories.length})
          </p>
          {expenseCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma categoria de despesa</p>
          ) : (
            <div className="space-y-1.5">
              {expenseCategories.map(renderCategory)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
