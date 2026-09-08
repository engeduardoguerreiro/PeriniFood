"use client";

import { useState } from "react";
import { decimalInputValue } from "@/lib/utils";

// Campo de valor em reais. Não usa type="number" de propósito: nele o navegador
// descarta a vírgula sem avisar (12,50 vira 1250) e um valor numérico controlado
// deixa um "0" grudado que o usuário não consegue apagar. Aqui o estado é o texto
// digitado; quem lê o valor converte com parseDecimal.
export function MoneyInput({
  name,
  defaultValue,
  value,
  onValueChange,
  className = "field-light",
  placeholder = "0,00",
  required,
  disabled,
}: {
  name?: string;
  defaultValue?: number | string | null;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [internal, setInternal] = useState(() => decimalInputValue(defaultValue));
  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  return (
    <input
      className={className}
      name={name}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      value={current}
      onChange={(event) => {
        // Aceita o que o usuário escreve de verdade: dígitos, vírgula e ponto.
        const next = event.target.value.replace(/[^\d.,]/g, "");
        if (!controlled) setInternal(next);
        onValueChange?.(next);
      }}
      onFocus={(event) => event.currentTarget.select()}
    />
  );
}
