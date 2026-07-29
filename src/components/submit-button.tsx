"use client";

import { useFormStatus } from "react-dom";

// Botão de formulário com estado de envio — sem ele o admin clica em "salvar",
// a página re-renderiza igual e parece que nada aconteceu.
export function SubmitButton({
  children,
  pendingLabel = "Salvando…",
  className = "rounded-xl bg-[#211d19] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#37312a] disabled:cursor-not-allowed disabled:opacity-60",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
