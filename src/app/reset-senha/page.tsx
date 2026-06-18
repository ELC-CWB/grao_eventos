"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Lock } from "lucide-react";
import Image from "next/image";

export default function ResetSenhaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.SyntheticEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Senha redefinida com sucesso!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <Image src="/logo-grao-saber.png" alt="Grão Saber" width={64} height={64} className="rounded-xl" />
          <div>
            <p className="font-black text-xl tracking-tight">Grão Eventos</p>
            <p className="text-muted-foreground text-xs">Escola Grão Saber</p>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-black">Nova senha</h1>
          <p className="text-muted-foreground mt-1 text-sm">Digite e confirme sua nova senha</p>
        </div>

        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold">Nova senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 bg-secondary/50 border-border/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-sm font-semibold">Confirmar senha</Label>
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              placeholder="Repita a nova senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="h-11 bg-secondary/50 border-border/50"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 font-bold text-base"
            style={{ background: "#f37022" }}
          >
            {loading
              ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</span>
              : <span className="flex items-center gap-2"><Lock size={16} />Redefinir senha</span>
            }
          </Button>
        </form>

      </div>
    </div>
  );
}
