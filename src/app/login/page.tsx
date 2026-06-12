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

    // Verifica se já existe algum usuário — primeiro usuário vira admin
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const isFirstUser = count === 0;
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
      toast.success("Conta criada! Aguarde um administrador liberar seu acesso aos eventos.");
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
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
      >
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #f37022, transparent)" }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #f37022, transparent)" }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#f37022" }}>
              <span className="text-white font-black text-lg">G</span>
            </div>
            <div>
              <p className="text-white font-black text-xl tracking-tight">Grão</p>
              <p className="text-white/60 text-xs font-medium -mt-1 tracking-wider uppercase">Eventos</p>
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
                <div key={stat.label} className="rounded-xl p-3 border border-white/10"
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

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md page-enter">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#f37022" }}>
              <span className="text-white font-black text-lg">G</span>
            </div>
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
                  O <strong>primeiro cadastro</strong> cria automaticamente uma conta de <strong>Administrador</strong>.
                  Os próximos cadastros criam contas de <strong>Gestor</strong>, que precisam ser habilitadas
                  por um administrador para acessar os eventos.
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
