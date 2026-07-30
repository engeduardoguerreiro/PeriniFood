import Link from "next/link";
import { Download, Printer, Zap } from "lucide-react";
import { requireRestaurant } from "@/lib/auth";

export const metadata = { title: "Configurar impressão · PeriniFood" };

// Guia de impressão para o lojista. Passo 1 resolve sozinho em qualquer
// computador; os passos 2 e 3 são opcionais, para quem quer imprimir sem
// aparecer a janela de impressão.
export default async function PrintSetupPage() {
  await requireRestaurant();

  const step = "rounded-2xl border border-[#e7e4dd] bg-white p-5 shadow-[0_1px_2px_rgba(27,26,23,0.04)]";
  const badge = "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#c5362e] text-sm font-bold text-white";

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-5">
      <div>
        <Link href="/configuracoes#impressao" className="text-xs font-medium text-[#9c988f] transition hover:text-[#c5362e]">
          ← Voltar às configurações
        </Link>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-[#1b1a17]">Configurar a impressora</h1>
        <p className="text-sm text-[#9c988f]">Siga o passo 1. Os outros são opcionais.</p>
      </div>

      <section className={step}>
        <div className="flex items-start gap-3">
          <span className={badge}>1</span>
          <div className="min-w-0">
            <h2 className="font-semibold text-[#1b1a17]">Imprimir um teste</h2>
            <p className="mt-1 text-sm text-[#6d6a63]">
              Vai abrir a janela de impressão do computador, já com a lista das impressoras instaladas. Escolha a sua impressora de comanda e
              confirme. Pronto — o navegador lembra a escolha nas próximas vezes.
            </p>
            <a
              href="/impressao/teste?auto=1"
              target="_blank"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#211d19] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#37312a]"
            >
              <Printer size={15} /> Imprimir teste
            </a>
            <p className="mt-2 text-xs text-[#9c988f]">Funciona em qualquer navegador e qualquer computador, sem instalar nada.</p>
          </div>
        </div>
      </section>

      <section className={step}>
        <div className="flex items-start gap-3">
          <span className={badge}>2</span>
          <div className="min-w-0">
            <h2 className="font-semibold text-[#1b1a17]">Imprimir direto, sem a janela <span className="text-xs font-normal text-[#9c988f]">(opcional)</span></h2>
            <p className="mt-1 text-sm text-[#6d6a63]">
              Baixe o atalho abaixo e dê dois cliques. Ele cria um ícone do PeriniFood na área de trabalho. Use o sistema por esse ícone e a comanda
              sai sozinha no papel, sem aparecer a janela de impressão.
            </p>
            <a
              href="/downloads/PeriniFood-Balcao-Impressao.cmd"
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#e7e4dd] bg-white px-4 py-2.5 text-sm font-medium text-[#2b2925] transition hover:border-[#c5362e] hover:text-[#c5362e]"
            >
              <Zap size={15} /> Baixar atalho de impressão direta
            </a>
            <p className="mt-2 text-xs text-[#9c988f]">Precisa do Google Chrome instalado. Só funciona no Windows.</p>
          </div>
        </div>
      </section>

      <section className={step}>
        <div className="flex items-start gap-3">
          <span className={badge}>3</span>
          <div className="min-w-0">
            <h2 className="font-semibold text-[#1b1a17]">Agente local <span className="text-xs font-normal text-[#9c988f]">(opcional, avançado)</span></h2>
            <p className="mt-1 text-sm text-[#6d6a63]">
              Programa que fica ligado junto com o Windows e envia a comanda direto para a impressora térmica. Só vale a pena se você quiser que o
              sistema escolha a impressora sozinho, sem depender do navegador.
            </p>
            <a
              href="/downloads/PeriniFood-PrintAgent-Setup.exe"
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#e7e4dd] bg-white px-4 py-2.5 text-sm font-medium text-[#2b2925] transition hover:border-[#c5362e] hover:text-[#c5362e]"
            >
              <Download size={15} /> Baixar instalador (Windows)
            </a>
            <p className="mt-2 text-xs text-[#9c988f]">
              Arquivo grande (~92 MB). O Windows pode avisar que o programa é de origem desconhecida — clique em &quot;Mais informações&quot; e
              &quot;Executar assim mesmo&quot;.
            </p>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-[#b0aaa0]">
        A comanda não saiu? Confira se a impressora está ligada, com papel e aparecendo na lista de impressoras do Windows.
      </p>
    </main>
  );
}
