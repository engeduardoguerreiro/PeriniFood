import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  priority,
  showTagline,
}: {
  className: string;
  priority: boolean;
  showTagline: boolean;
}) {
  return <BrandNavLogo className={className} priority={priority} showTagline={showTagline} />;
}

export function BrandNavLogo({
  className,
  priority,
  showTagline = true,
}: {
  className: string;
  priority: boolean;
  showTagline: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
        <Image
          src="/brand/perinifood-logo.png"
          alt=""
          width={1254}
          height={1254}
          priority={priority}
          className="h-full w-full object-contain"
        />
      </span>
      <span className="leading-none">
        <span className="block text-[1.35rem] font-black tracking-tight text-[#F8FBFF]">
          Perini<span className="text-[#E50914]">Food</span>
        </span>
        {showTagline && (
          <span className="font-secondary mt-1 hidden text-[0.58rem] font-bold uppercase tracking-[0.22em] text-white/62 sm:block">
            Gestão para restaurantes
          </span>
        )}
      </span>
    </span>
  );
}

export function GastroMark({ className }: { className: string }) {
  return (
    <span className={cn("relative grid place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200", className)}>
      <Image src="/brand/perinifood-logo.png" alt="" width={1254} height={1254} className="h-full w-full object-contain" />
    </span>
  );
}
