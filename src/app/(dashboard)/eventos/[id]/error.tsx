"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function EventDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(239,68,68,0.1)" }}>
        <AlertCircle size={28} className="text-red-500" />
      </div>
      <h2 className="text-xl font-black mb-2">Não foi possível carregar o evento</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">
        Ocorreu um erro ao buscar os dados. Verifique sua conexão e tente novamente.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>Tentar novamente</Button>
        <Link href="/eventos">
          <Button style={{ background: "#f37022" }}>Voltar para Eventos</Button>
        </Link>
      </div>
    </div>
  );
}
