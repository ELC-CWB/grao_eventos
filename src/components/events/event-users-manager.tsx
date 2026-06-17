"use client";

import { useState } from "react";
import type { Profile, EventUser } from "@/types";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";

interface EventUsersManagerProps {
  eventId: string;
  eventUsers: (EventUser & { profile?: Profile })[];
  allProfiles: Profile[];
  onUsersChange: (users: (EventUser & { profile?: Profile })[]) => void;
}

export function EventUsersManager({ eventId, eventUsers, allProfiles, onUsersChange }: EventUsersManagerProps) {
  const supabase = createClient();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(false);

  const assignedIds = new Set(eventUsers.map((eu) => eu.user_id));
  const availableProfiles = allProfiles.filter((p) => !assignedIds.has(p.id) && p.role === "manager");
  const selectedProfile = availableProfiles.find((p) => p.id === selectedUserId);

  async function handleAdd() {
    if (!selectedUserId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("event_users")
      .insert({ event_id: eventId, user_id: selectedUserId })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao adicionar usuário");
    } else {
      const userProfile = allProfiles.find((p) => p.id === selectedUserId);
      onUsersChange([...eventUsers, { ...data, profile: userProfile } as EventUser & { profile?: Profile }]);
      setSelectedUserId("");
      toast.success("Usuário adicionado ao evento");
    }
    setLoading(false);
  }

  async function handleRemove(id: string) {
    const { error } = await supabase.from("event_users").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover usuário");
    } else {
      onUsersChange(eventUsers.filter((eu) => eu.id !== id));
      toast.success("Usuário removido do evento");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v ?? "")}>
          <SelectTrigger className="flex-1">
            {/* Exibe o nome do usuário selecionado manualmente — evita o UUID do base-ui */}
            <span className={cn(
              "flex-1 text-left text-sm truncate",
              !selectedProfile && "text-muted-foreground"
            )}>
              {selectedProfile
                ? `${selectedProfile.full_name} — ${selectedProfile.email}`
                : "Selecionar gestor..."}
            </span>
          </SelectTrigger>
          <SelectContent>
            {availableProfiles.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground px-3">
                Todos os gestores já foram adicionados
              </div>
            ) : (
              availableProfiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name} — {p.email}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          onClick={handleAdd}
          disabled={!selectedUserId || loading}
          style={{ background: "#f37022" }}
        >
          <Plus size={14} className="mr-1.5" />
          Adicionar
        </Button>
      </div>

      {eventUsers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users size={32} className="mx-auto mb-2 opacity-30" />
          <p className="font-semibold">Nenhum gestor neste evento</p>
          <p className="text-xs mt-1">Adicione gestores para permitir o acesso</p>
        </div>
      ) : (
        <div className="space-y-2">
          {eventUsers.map((eu) => {
            const p = eu.profile;
            if (!p) return null;
            const initials = p.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
            return (
              <div key={eu.id} className="group flex items-center gap-3 p-3 rounded-xl border bg-card">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs font-bold text-white" style={{ background: "#f37022" }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {p.role === "admin" ? "Admin" : "Apoiador"}
                </span>
                <Button
                  variant="ghost" size="icon"
                  className="w-7 h-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(eu.id)}
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
