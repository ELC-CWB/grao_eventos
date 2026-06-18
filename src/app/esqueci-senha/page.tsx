"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, ArrowLeft } from "lucide-react";
import Image from "next/image";

export default function EsqueciSenhaPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-senha`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        setErrorMsg(error.message);
        toast.error(error.message);
      } else {
        setSent(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ocorreu um erro. Tente novamente.";
      setErrorMsg(msg);
      toast.error(msg);
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

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold mb-8 hover:underline"
          style={{ color: "#f37022" }}
        >
          <ArrowLeft size={15} /> Voltar para login
        </Link>

        {sent ? (
          <div className="rounded-2xl p-6 text-center border" style={{ background: "rgba(243,112,34,0.06)", borderColor: "rgba(243,112,34,0.2)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(243,112,34,0.12)" }}>
              <Mail size={22} style={{ color: "#f37022" }} />
            </div>
            <p className="font-black text-lg mb-1">E-mail enviado!</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Verifique a caixa de entrada de <strong>{email}</strong> e clique no link para redefinir sua senha.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block text-sm font-bold hover:underline"
              style={{ color: "#f37022" }}
            >
              Voltar para login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-black">Esqueci minha senha</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">E-mail cadastrado</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-secondary/50 border-border/50"
                  autoFocus
                />
              </div>

              {errorMsg && (
                <div className="rounded-xl p-3 text-sm border border-red-300 bg-red-50 text-red-700">
                  {errorMsg}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 font-bold text-base"
                style={{ background: "#f37022" }}
              >
                {loading
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enviando...</span>
                  : <span className="flex items-center gap-2"><Mail size={16} />Enviar link de redefinição</span>
                }
              </Button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
