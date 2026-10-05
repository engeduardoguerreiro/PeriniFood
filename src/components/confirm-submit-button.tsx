"use client";

import { useFormStatus } from "react-dom";

// Botão de envio que pede confirmação antes de uma ação irreversível
// (cancelar pedido, inclusive do iFood, com um clique só era fácil errar).
export function ConfirmSubmitButton({
  children,
  message,
  className,
  label,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  label: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      disabled={pending}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
