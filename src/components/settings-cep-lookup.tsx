"use client";

import { Search } from "lucide-react";
import { useState } from "react";

type ViaCepResponse = {
  erro: boolean;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
};

function setFormValue(form: HTMLFormElement | null, name: string, value: string) {
  const field = form?.elements.namedItem(name);
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

export function SettingsCepLookup({
  defaultValue,
  inputClassName = "h-9 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/12",
  buttonClassName = "inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-medium text-[#403d38] transition hover:border-brand hover:text-brand",
  buttonLabel = "Buscar",
}: {
  defaultValue: string | null;
  inputClassName?: string;
  buttonClassName?: string;
  buttonLabel?: string;
}) {
  const [cep, setCep] = useState(defaultValue ?? "");
  const [status, setStatus] = useState("");

  async function lookupCep(event: React.MouseEvent<HTMLButtonElement>) {
    const cleanCep = cep.replace(/\D/g, "");
    const form = event.currentTarget.closest("form");

    if (cleanCep.length !== 8) {
      setStatus("Informe um CEP com 8 dígitos.");
      return;
    }

    setStatus("Buscando CEP...");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json() as ViaCepResponse;

      if (data.erro) {
        setStatus("CEP não encontrado.");
        return;
      }

      setFormValue(form, "address", data.logradouro ?? "");
      setFormValue(form, "neighborhood", data.bairro ?? "");
      setFormValue(form, "city", data.localidade ?? "");
      setFormValue(form, "state", data.uf ?? "");
      setStatus("Endereço preenchido pelo CEP. Informe o número.");
    } catch {
      setStatus("Não foi possível consultar o CEP agora.");
    }
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[minmax(130px,1fr)_auto] gap-2">
        <input
          className={`${inputClassName} min-w-0`}
          name="zip_code"
          value={cep}
          onChange={(event) => setCep(event.target.value)}
          placeholder="00000000"
        />
        <button
          type="button"
          onClick={lookupCep}
          className={`${buttonClassName} shrink-0 whitespace-nowrap`}
        >
          <Search className="h-4 w-4" />
          {buttonLabel}
        </button>
      </div>
      {status && <p className="text-xs font-medium text-ink-soft">{status}</p>}
    </div>
  );
}
