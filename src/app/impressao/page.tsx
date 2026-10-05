import Link from "next/link";
import { Download, Printer, Terminal, Zap } from "lucide-react";
import { requireRestaurant } from "@/lib/auth";
import { Icon3D } from "@/components/ui/icon-3d";

export const metadata = { title: "Configurar impressão · PeriniFood" };

// Guia de impressão para o lojista. Passo 1 resolve sozinho em qualquer
// computador; os passos 2 e 3 são opcionais, para quem quer imprimir sem
// aparecer a janela de impressão.
export default async function PrintSetupPage() {
  await requireRestaurant();

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://perinifood.com.br").replace(/\/+$/, "");
  const linuxInstall = `curl -fsSL ${appUrl}/downloads/install-print-agent-linux.sh | bash`;
  const step = "rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(27,26,23,0.04)]";
  const badge = "grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-brand-bright to-brand text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_14px_-5px_rgba(207,74,10,0.7)]";

  return (
    // Fora do layout do painel: precisa do próprio fundo claro (senão herda o
    // fundo escuro global do site).
    <div className="panel-3d min-h-screen text-ink">
    <main className="mx-auto max-w-2xl space-y-5 p-5">
      <div>
        <Link href="/configuracoes#impressao" className="text-xs font-medium text-ink-faint transition hover:text-brand">
          ← Voltar às configurações
        </Link>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink flex items-center gap-3"><Icon3D icon={Printer} tone="slate" size="sm" /><span className="min-w-0">Configurar a impressora</span></h1>
        <p className="text-sm text-ink-faint">Siga o passo 1. Os outros são opcionais.</p>
      </div>

      <section className={step}>
        <div className="flex items-start gap-3">
          <span className={badge}>1</span>
          <div className="min-w-0">
            <h2 className="font-semibold text-ink">Imprimir um teste</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Vai abrir a janela de impressão do computador, já com a lista das impressoras instaladas. Escolha a sua impressora de comanda e
              confirme. Pronto — o navegador lembra a escolha nas próximas vezes.
            </p>
            <a
              href="/impressao/teste?auto=1"
              target="_blank"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-btn px-4 py-2.5 text-sm font-medium text-white transition hover:bg-btn-hover"
            >
              <Printer size={15} /> Imprimir teste
            </a>
            <p className="mt-2 text-xs text-ink-faint">Funciona em qualquer navegador e qualquer computador, sem instalar nada.</p>
          </div>
        </div>
      </section>

      <section className={step}>
        <div className="flex items-start gap-3">
          <span className={badge}>2</span>
          <div className="min-w-0">
            <h2 className="font-semibold text-ink">Imprimir direto, sem a janela <span className="text-xs font-normal text-ink-faint">(opcional)</span></h2>
            <p className="mt-1 text-sm text-ink-soft">
              Baixe o atalho abaixo e dê dois cliques. Ele cria um ícone do PeriniFood na área de trabalho. Use o sistema por esse ícone e a comanda
              sai sozinha no papel, sem aparecer a janela de impressão.
            </p>
            <a
              href="/downloads/PeriniFood-Balcao-Impressao.cmd"
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink-body transition hover:border-brand hover:text-brand"
            >
              <Zap size={15} /> Baixar atalho de impressão direta
            </a>
            <p className="mt-2 text-xs text-ink-faint">Precisa do Google Chrome instalado. Só funciona no Windows.</p>
          </div>
        </div>
      </section>

      <section className={step}>
        <div className="flex items-start gap-3">
          <span className={badge}>3</span>
          <div className="min-w-0">
            <h2 className="font-semibold text-ink">Agente local <span className="text-xs font-normal text-ink-faint">(opcional, avançado)</span></h2>
            <p className="mt-1 text-sm text-ink-soft">
              Programa que fica ligado junto com o Windows e envia a comanda direto para a impressora térmica. Só vale a pena se você quiser que o
              sistema escolha a impressora sozinho, sem depender do navegador.
            </p>
            <a
              href="/downloads/PeriniFood-PrintAgent-Setup.exe"
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink-body transition hover:border-brand hover:text-brand"
            >
              <Download size={15} /> Baixar instalador (Windows)
            </a>
            <p className="mt-2 text-xs text-ink-faint">
              Arquivo grande (~92 MB). O Windows pode avisar que o programa é de origem desconhecida — clique em &quot;Mais informações&quot; e
              &quot;Executar assim mesmo&quot;.
            </p>
            <div className="mt-4 rounded-xl border border-line bg-[#f6f5f2] p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink"><Terminal size={15} /> No Linux (Ubuntu, Mint, Debian)</p>
              <p className="mt-1 text-xs text-ink-soft">Abra o Terminal, cole o comando abaixo e tecle Enter. O agente usa as impressoras já instaladas no sistema e liga sozinho junto com o computador.</p>
              <code className="mt-2 block select-all overflow-x-auto whitespace-nowrap rounded-lg bg-ink px-3 py-2 font-mono text-xs text-white">{linuxInstall}</code>
              <p className="mt-2 text-xs text-ink-faint">
                Precisa do Node.js (<code>sudo apt install -y nodejs</code>). Para remover:{" "}
                <code className="select-all">curl -fsSL {appUrl}/downloads/uninstall-print-agent-linux.sh | bash</code>
              </p>
            </div>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-ink-faint">
        A comanda não saiu? Confira se a impressora está ligada, com papel e aparecendo na lista de impressoras do computador.
      </p>
    </main>
    </div>
  );
}
