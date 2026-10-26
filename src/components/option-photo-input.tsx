"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";

// Foto compacta de borda/adicional numa linha de Opções de pizza: miniatura clicável
// que já mostra a imagem escolhida antes de salvar. Envia "image_file" e, se a
// opção já tem foto, oferece "remove_image".
export function OptionPhotoInput({ currentUrl, label }: { currentUrl?: string | null; label: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const shown = preview ?? (currentUrl && !broken && !remove ? currentUrl : null);
  return (
    <span className="flex items-center gap-1.5">
      <label title={`Foto de ${label}`} className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border border-line bg-[#faf9f6] text-ink-faint transition hover:border-brand hover:text-brand">
        {shown ? <img src={shown} alt="" className="h-full w-full object-cover" onError={() => { if (!preview) setBroken(true); }} /> : <ImagePlus size={15} />}
        <span className="sr-only">{shown ? `Trocar foto de ${label}` : `Adicionar foto de ${label}`}</span>
        <input
          type="file"
          name="image_file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (preview) URL.revokeObjectURL(preview);
            setPreview(file ? URL.createObjectURL(file) : null);
            if (file) setRemove(false);
          }}
        />
      </label>
      {currentUrl && !preview && (
        <label className="flex items-center gap-1 text-[11px] font-medium text-ink-faint">
          <input type="checkbox" name="remove_image" checked={remove} onChange={(event) => setRemove(event.target.checked)} className="accent-brand" /> Sem foto
        </label>
      )}
    </span>
  );
}
