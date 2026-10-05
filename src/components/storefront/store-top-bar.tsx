/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// Barra superior das páginas internas do cardápio (conta, checkout): mantém a
// identidade da loja e um "voltar" sempre à mão, como num app.
export function StoreTopBar({ slug, name, logo, title }: { slug: string; name: string; logo: string | null; title: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-[0_6px_20px_-16px_rgba(0,0,0,0.4)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <Link href={`/cardapio/${slug}`} aria-label={`Voltar para o cardápio de ${name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-ink transition hover:bg-slate-200">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-white">
          {logo ? <img src={logo} alt="" className="h-full w-full object-contain" /> : <span className="text-sm font-black">{name.slice(0, 2)}</span>}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">{name}</p>
          <p className="truncate text-base font-black leading-tight text-ink">{title}</p>
        </div>
      </div>
    </header>
  );
}
