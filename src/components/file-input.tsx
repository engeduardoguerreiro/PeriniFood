"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

// Campo de upload customizado: esconde o input nativo (que mostra
// "Choose File / No file chosen" em inglês) e exibe um botão em
// português + o nome do arquivo escolhido. O input continua no form,
// então a server action recebe o arquivo normalmente.
export function FileInput({
  name,
  accept,
  label = "Escolher arquivo",
}: {
  name: string;
  accept?: string;
  label?: string;
}) {
  const [fileName, setFileName] = useState("");

  return (
    <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-white pl-1.5 pr-3 text-sm transition hover:border-brand">
      <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-btn px-3 text-xs font-medium text-white">
        <Upload size={13} />
        {label}
      </span>
      <span className={`truncate ${fileName ? "text-ink-body" : "text-ink-faint"}`}>
        {fileName || "Nenhum arquivo"}
      </span>
      <input
        type="file"
        name={name}
        accept={accept}
        className="hidden"
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
      />
    </label>
  );
}
