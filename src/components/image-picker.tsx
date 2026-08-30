"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Upload, X } from "lucide-react";

// Campo de imagem com prévia: mostra a foto atual do produto e troca na hora
// para a imagem escolhida, antes mesmo de salvar. O input nativo fica escondido
// porque o Windows o exibe em inglês ("Choose File / No file chosen").
export function ImagePicker({
  name,
  currentUrl,
  urlFieldName,
  label = "Carregar imagem",
  hint = "Use PNG, JPG ou WEBP.",
}: {
  name: string;
  currentUrl?: string | null;
  urlFieldName?: string;
  label?: string;
  hint?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [brokenCurrent, setBrokenCurrent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Libera o object URL anterior para não vazar memória ao trocar de foto.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const currentIsUsable = Boolean(currentUrl) && !brokenCurrent;
  const shown = preview ?? (currentIsUsable ? currentUrl : null);

  function pick(file: File | undefined) {
    if (preview) URL.revokeObjectURL(preview);
    if (!file) {
      setPreview(null);
      setFileName("");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    pick(undefined);
  }

  return (
    <div className="space-y-3">
      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-lg border border-[#e7e4dd] bg-[#faf9f6]">
        {shown ? (
          <img
            src={shown}
            alt="Prévia da imagem do produto"
            className="h-full w-full object-cover"
            onError={() => {
              if (!preview) setBrokenCurrent(true);
            }}
          />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-xs font-medium text-[#b0aaa0]">
            <ImagePlus size={20} />
            {brokenCurrent ? "Imagem indisponível" : "Nenhuma imagem"}
          </span>
        )}

        {preview && (
          <button
            type="button"
            onClick={clear}
            aria-label="Remover imagem escolhida"
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-[#e7e4dd] bg-white pl-1.5 pr-3 text-sm transition hover:border-[#c5362e]">
        <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-[#211d19] px-3 text-xs font-medium text-white">
          <Upload size={13} />
          {label}
        </span>
        <span className={`truncate ${fileName ? "text-[#2b2925]" : "text-[#b0aaa0]"}`}>
          {fileName || "Nenhum arquivo escolhido"}
        </span>
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => pick(event.target.files?.[0])}
        />
      </label>

      {urlFieldName && (
        <input
          className="field-light"
          name={urlFieldName}
          placeholder="Ou cole o endereço de uma imagem"
          defaultValue={currentUrl ?? ""}
        />
      )}

      <p className="text-xs text-[#9c988f]">{hint}</p>
    </div>
  );
}
