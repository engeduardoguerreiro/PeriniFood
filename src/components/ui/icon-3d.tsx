import type { LucideIcon } from "lucide-react";

// Ícone em pastilha 3D (gradiente + brilho no topo + sombra), padrão visual do
// painel. A cor identifica a área do sistema — a mesma usada no menu lateral.
export const toneGradient = {
  orange: "from-[#ff8a3d] to-[#d9480f]",
  blue: "from-[#4aa8ff] to-[#1d64d8]",
  green: "from-[#40d878] to-[#14964a]",
  red: "from-[#ff6b5a] to-[#d42a1f]",
  amber: "from-[#ffc24a] to-[#d98a00]",
  pink: "from-[#ff7ab6] to-[#d63384]",
  violet: "from-[#a38bff] to-[#6741e0]",
  teal: "from-[#3fd6c6] to-[#0e9488]",
  indigo: "from-[#7c8cff] to-[#4338ca]",
  cyan: "from-[#4fd1ff] to-[#0891b2]",
  slate: "from-[#a3acb9] to-[#4b5563]",
} as const;

export type Tone = keyof typeof toneGradient;

const sizes = {
  xs: { box: "h-7 w-7 rounded-lg", icon: "h-4 w-4" },
  sm: { box: "h-9 w-9 rounded-xl", icon: "h-[18px] w-[18px]" },
  md: { box: "h-11 w-11 rounded-xl", icon: "h-5 w-5" },
  lg: { box: "h-14 w-14 rounded-2xl", icon: "h-7 w-7" },
} as const;

export function Icon3D({ icon: Icon, tone = "orange", size = "md", className = "" }: { icon: LucideIcon; tone?: Tone; size?: keyof typeof sizes; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center bg-gradient-to-b text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_-5px_rgba(0,0,0,0.45)] ${sizes[size].box} ${toneGradient[tone]} ${className}`}>
      <Icon className={sizes[size].icon} />
    </span>
  );
}
