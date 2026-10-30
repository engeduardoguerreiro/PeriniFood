"use client";

import { useState, type InputHTMLAttributes } from "react";
import { formatPhone, maskPhoneInput, PHONE_PATTERN } from "@/lib/utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange"> & {
  defaultValue?: string | null;
};

// Campo de telefone para formulários de servidor: aplica a máscara (11) 97191-5600
// enquanto digita e só aceita DDD + 8 ou 9 dígitos. O servidor grava só os dígitos.
export function PhoneInput({ defaultValue, ...props }: Props) {
  const [value, setValue] = useState(formatPhone(defaultValue));
  return (
    <input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete={props.autoComplete ?? "tel"}
      placeholder={props.placeholder ?? "(11) 99999-9999"}
      pattern={PHONE_PATTERN}
      title="Informe DDD + número, ex.: (11) 99999-9999"
      value={value}
      onChange={(event) => setValue((current) => maskPhoneInput(current, event.target.value))}
    />
  );
}
