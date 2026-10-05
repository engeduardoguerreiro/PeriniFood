"use client";

import Link from "next/link";
import { useEffect } from "react";

// Falha inesperada em qualquer tela: em vez da página de erro em inglês do Next,
// mensagem em português com "Tentar novamente" (refaz a busca de dados da tela).
export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-12 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="brand-kicker">Algo deu errado</p>
        <h1 className="mt-2 text-2xl font-semibold">Não foi possível carregar esta tela</h1>
        <p className="mt-3 text-sm text-ink-soft">
          Pode ter sido uma falha momentânea de conexão. Tente de novo; se continuar, fale com o suporte.
        </p>
        {error.digest && <p className="mt-3 text-xs text-ink-faint">Código do erro: {error.digest}</p>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => unstable_retry()} className="btn-primary">Tentar novamente</button>
          <Link href="/" className="btn-muted">Ir para o início</Link>
        </div>
      </div>
    </main>
  );
}
