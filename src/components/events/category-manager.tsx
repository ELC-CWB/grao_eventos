"use client";

import { useState } from "react";
import type { Category } from "@/types";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Tag } from "lucide-react";

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

  const revenueCategories = categories.filter((c) => c.type === "revenue");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div className="space-y-5">
      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Select value={type} onValueChange={(v) => setType(v as "revenue" | "expense")}>
          <SelectTrigger className="w-32 flex-shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Receita</SelectItem>
            <SelectItem value="expense">Despesa</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Nome da categoria..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
          required
        />
        <Button type="submit" disabled={loading} style={{ background: "#f37022" }}>
          <Plus size={14} className="mr-1.5" />
          Adicionar
        </Button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue categories */}
        <div>
          <p className="text-sm font-bold text-emerald-600 mb-3 flex items-center gap-1.5">
            <Tag size={13} /> Categorias de Receita ({revenueCategories.length})
          </p>
          {revenueCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma categoria de receita</p>
          ) : (
            <div className="space-y-1.5">
              {revenueCategories.map((c) => (
                <div key={c.id} className="group flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary">
                  <span className="text-sm font-semibold">{c.name}</span>
                  <Button
                    variant="ghost" size="icon"
                    className="w-6 h-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 size={11} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expense categories */}
        <div>
          <p className="text-sm font-bold text-red-500 mb-3 flex items-center gap-1.5">
            <Tag size={13} /> Categorias de Despesa ({expenseCategories.length})
          </p>
          {expenseCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma categoria de despesa</p>
          ) : (
            <div className="space-y-1.5">
              {expenseCategories.map((c) => (
                <div key={c.id} className="group flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary">
                  <span className="text-sm font-semibold">{c.name}</span>
                  <Button
                    variant="ghost" size="icon"
                    className="w-6 h-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 size={11} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
