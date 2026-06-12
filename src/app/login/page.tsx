"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Credenciais inválidas. Verifique seu e-mail e senha.");
    } else {
      toast.success("Bem-vindo de volta!");
      router.push("/dashboard");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #f37022, transparent)" }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #f37022, transparent)" }} />
        <div className="absolute top-1/3 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #ffffff, transparent)" }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            {/* Logo area */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#f37022" }}>
                <span className="text-white font-black text-lg">G</span>
              </div>
              <div>
                <p className="text-white font-black text-xl tracking-tight">Grão</p>
                <p className="text-white/60 text-xs font-medium -mt-1 tracking-wider uppercase">Eventos</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-white font-black text-4xl leading-tight">
                Gestão financeira<br />
                <span style={{ color: "#f37022" }}>inteligente</span><br />
                para seus eventos.
              </h2>
              <p className="text-white/50 mt-4 text-sm leading-relaxed max-w-xs">
                Controle receitas, despesas, fornecedores e muito mais em um único lugar.
                Tudo para a Escola Grão Saber.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Eventos", value: "Múltiplos" },
                { label: "Controle", value: "Total" },
                { label: "Acesso", value: "Seguro" },
              ].map((stat) => (
                <div key={stat.label}
                  className="rounded-xl p-3 border border-white/10"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <p className="text-white font-bold text-lg">{stat.value}</p>
                  <p className="text-white/40 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/20 text-xs">© 2024 Escola Grão Saber. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 page-enter">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#f37022" }}>
              <span className="text-white font-black text-lg">G</span>
            </div>
            <div>
              <p className="font-black text-xl tracking-tight">Grão Eventos</p>
              <p className="text-muted-foreground text-xs">Escola Grão Saber</p>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-black text-foreground">
              Entrar na conta
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Acesse o painel de gestão de eventos
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-secondary/50 border-border/50 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-secondary/50 border-border/50 focus:border-primary pr-10"
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-bold text-base"
              style={{ background: "#f37022" }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={16} />
                  Entrar
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Problemas de acesso? Entre em contato com um administrador.
          </p>
        </div>
      </div>
    </div>
  );
}
