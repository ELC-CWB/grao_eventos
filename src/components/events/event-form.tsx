"use client";

import { useState, useRef } from "react";
import type { Event } from "@/types";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ImageIcon, X } from "lucide-react";

const EVENT_COLORS = [
  "#f37022", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16", "#ec4899", "#6366f1",
];

interface EventFormProps {
  event?: Event;
  onSaved: (event: Event) => void;
  onCancel: () => void;
}

export function EventForm({ event, onSaved, onCancel }: EventFormProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(event?.image_url ?? null);
  const [form, setForm] = useState({
    name: event?.name ?? "",
    description: event?.description ?? "",
    start_date: event?.start_date ?? "",
    end_date: event?.end_date ?? "",
    location: event?.location ?? "",
    color: event?.color ?? EVENT_COLORS[0],
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadImage(eventId: string): Promise<string | null> {
    if (!imageFile) return null;
    const ext = imageFile.name.split(".").pop();
    const path = `${eventId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("event-images").upload(path, imageFile, { upsert: true });
    if (error) { toast.error("Erro ao enviar imagem"); return null; }
    const { data } = supabase.storage.from("event-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!form.end_date) form.end_date = form.start_date;

    const payload = {
      name: form.name,
      description: form.description || null,
      start_date: form.start_date,
      end_date: form.end_date,
      location: form.location || null,
      color: form.color,
    };

    let savedEvent: Event | null = null;

    if (event) {
      const { data, error } = await supabase
        .from("events")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", event.id)
        .select()
        .single();
      if (error) { toast.error("Erro ao salvar evento"); setLoading(false); return; }
      savedEvent = data as Event;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("events")
        .insert({ ...payload, created_by: user!.id })
        .select()
        .single();
      if (error) { toast.error("Erro ao criar evento"); setLoading(false); return; }
      savedEvent = data as Event;
    }

    // Upload image if selected
    if (imageFile && savedEvent) {
      const imageUrl = await uploadImage(savedEvent.id);
      if (imageUrl) {
        await supabase.from("events").update({ image_url: imageUrl }).eq("id", savedEvent.id);
        savedEvent = { ...savedEvent, image_url: imageUrl };
      }
    } else if (!imagePreview && event?.image_url) {
      // Image was cleared
      await supabase.from("events").update({ image_url: null }).eq("id", savedEvent!.id);
      savedEvent = { ...savedEvent!, image_url: undefined };
    }

    toast.success(event ? "Evento atualizado" : "Evento criado");
    onSaved(savedEvent!);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome do Evento *</Label>
        <Input
          id="name"
          name="name"
          placeholder="Ex: Festa Junina 2024"
          value={form.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Data Início *</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date">Data Fim</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            value={form.end_date}
            onChange={handleChange}
            min={form.start_date}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Local</Label>
        <Input
          id="location"
          name="location"
          placeholder="Ex: Pátio da escola"
          value={form.location}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          placeholder="Descrição do evento..."
          value={form.description}
          onChange={handleChange}
        />
      </div>

      {/* Image upload */}
      <div className="space-y-1.5">
        <Label>Imagem do Evento</Label>
        {imagePreview ? (
          <div className="relative w-full h-36 rounded-xl overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <ImageIcon size={20} />
            <span className="text-xs font-medium">Clique para adicionar imagem</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      {/* Color picker */}
      <div className="space-y-1.5">
        <Label>Cor do Evento</Label>
        <div className="flex gap-2 flex-wrap">
          {EVENT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, color }))}
              className="w-8 h-8 rounded-lg transition-all"
              style={{
                background: color,
                outline: form.color === color ? `3px solid ${color}` : "none",
                outlineOffset: "2px",
                transform: form.color === color ? "scale(1.15)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="flex-1" style={{ background: "#f37022" }}>
          {loading ? "Salvando..." : event ? "Salvar" : "Criar Evento"}
        </Button>
      </div>
    </form>
  );
}
