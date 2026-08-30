import { AppShell } from "@/components/app-shell";

// AppShell no layout (e nao dentro de cada page): a barra lateral e o cabeçalho
// ficam montados entre as navegações — só o conteúdo troca.
export default function AreaLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
