"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import Image from "next/image";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Informe seu nome completo.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);

    // Verifica server-side (service role) se é o primeiro usuário
    const res = await fetch("/api/auth/is-first-user");
    const { isFirstUser } = await res.json();
    const role = isFirstUser ? "admin" : "manager";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Upsert profile manualmente (garante que o trigger criou corretamente)
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
      });
    }

    if (isFirstUser) {
      toast.success("Conta de administrador criada! Bem-vindo ao Grão Eventos.");
    } else {
      toast.success("Conta criada! Aguarde um administrador vincular eventos ao seu perfil.");
    }

    router.push("/dashboard");
    router.refresh();
    setLoading(false);
  }

  function switchMode(m: Mode) {
    setMode(m);
    setEmail("");
    setPassword("");
    setFullName("");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          backgroundImage: "url('/foto-landing.png')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      >
        {/* Dark overlay — fades out before the orange strip at the bottom */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(26,26,46,0.55) 0%, rgba(15,52,96,0.45) 60%, rgba(15,52,96,0.10) 78%, transparent 85%)" }} />

        <div className="relative z-10 flex flex-col justify-between pt-2 pb-12 pl-32 pr-6 w-full">
          <div>
            <h2 className="text-white font-black text-4xl leading-tight">
              Eventos <span style={{ color: "#f37022" }}>únicos</span><br />
              em um único lugar.
            </h2>
          </div>

          <div className="mb-36">
            <div style={{
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderTop: "1px solid rgba(255,255,255,0.4)",
              borderLeft: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "16px",
              padding: "16px 20px",
              display: "inline-block",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)",
              transform: "perspective(600px) rotateX(2deg)",
            }}>
              <p className="font-bold text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.90)" }}>
                Gestão financeira<br />Gestão de equipes e fornecedores<br />Todos os eventos da Grão
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md page-enter">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Image src="/logo-grao-saber.png" alt="Grão Saber" width={72} height={72} className="rounded-xl" />
            <div>
              <p className="font-black text-xl tracking-tight">Grão Eventos</p>
              <p className="text-muted-foreground text-xs">Escola Grão Saber</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl p-1 mb-8 bg-secondary/60">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                style={
                  mode === m
                    ? { background: "#f37022", color: "white" }
                    : { color: "var(--muted-foreground)" }
                }
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-black text-foreground">
              {mode === "login" ? "Bem-vindo de volta" : "Criar sua conta"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {mode === "login"
                ? "Acesse o painel de gestão de eventos"
                : "Preencha os dados abaixo para se cadastrar"}
            </p>
          </div>

          {/* Login form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-secondary/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
              <Button type="submit" disabled={loading} className="w-full h-11 font-bold text-base" style={{ background: "#f37022" }}>
                {loading
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Entrando...</span>
                  : <span className="flex items-center gap-2"><LogIn size={16} />Entrar</span>
                }
              </Button>
              <p className="text-center text-xs text-muted-foreground pt-2">
                Não tem conta?{" "}
                <button type="button" onClick={() => switchMode("register")} className="font-bold hover:underline" style={{ color: "#f37022" }}>
                  Cadastre-se
                </button>
              </p>
            </form>
          )}

          {/* Register form */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-semibold">Nome completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-11 bg-secondary/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email" className="text-sm font-semibold">E-mail</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-secondary/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-sm font-semibold">Senha</Label>
                <div className="relative">
                  <Input
                    id="reg-password"
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

              {/* Info box */}
              <div className="rounded-xl p-3 text-xs border" style={{ background: "rgba(243,112,34,0.07)", borderColor: "rgba(243,112,34,0.2)", color: "var(--foreground)" }}>
                <p className="font-bold mb-1" style={{ color: "#f37022" }}>Como funciona o acesso:</p>
                <p className="text-muted-foreground leading-relaxed">
                  Novos cadastros criam uma conta de <strong>Apoiador</strong> sem acesso a eventos.
                  Um <strong>administrador</strong> precisará vincular eventos ao seu perfil
                  ou promovê-lo a administrador.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 font-bold text-base" style={{ background: "#f37022" }}>
                {loading
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Criando conta...</span>
                  : <span className="flex items-center gap-2"><UserPlus size={16} />Criar conta</span>
                }
              </Button>
              <p className="text-center text-xs text-muted-foreground pt-2">
                Já tem conta?{" "}
                <button type="button" onClick={() => switchMode("login")} className="font-bold hover:underline" style={{ color: "#f37022" }}>
                  Entrar
                </button>
              </p>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
