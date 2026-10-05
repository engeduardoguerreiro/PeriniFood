import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireRestaurant } from "@/lib/auth";
import { BrowserAutoPrint } from "@/components/browser-auto-print";

// Página de teste de impressão: abre a janela de impressão do computador com
// uma comanda de exemplo. Serve para o lojista conferir papel, tamanho e
// impressora sem precisar criar um pedido de verdade.
export default async function TestPrintPage({ searchParams }: { searchParams: Promise<{ auto?: string }> }) {
  const { restaurant } = await requireRestaurant();
  const auto = (await searchParams)?.auto === "1";
  const now = new Date();

  const printStyles = `
    @page { size: 80mm auto; margin: 2mm; }
    @media print {
      html, body { width: 80mm; background: #fff !important; }
      .print-hide { display: none !important; }
      .thermal-receipt { width: 76mm !important; box-shadow: none !important; }
      .thermal-receipt * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  return (
    <main className="min-h-screen bg-[#f1efea] py-6 print:bg-white print:py-0">
      <style>{printStyles}</style>
      {auto && <BrowserAutoPrint />}

      <div className="print-hide mx-auto mb-4 w-[80mm] max-w-full space-y-2">
        <Link href="/configuracoes#impressao" className="inline-block rounded-lg border border-line bg-white px-3 py-2 text-xs font-black text-ink-body">
          Voltar às configurações
        </Link>
        <p className="rounded-xl border border-line bg-white p-3 text-xs text-ink-soft">
          Clique em <strong className="text-[#403d38]">Imprimir teste</strong>: vai abrir a janela de impressão do computador, com a lista das
          impressoras instaladas. Escolha a sua impressora de comanda e confirme. O navegador lembra a escolha nas próximas vezes.
        </p>
      </div>

      <div className="mx-auto w-[80mm] max-w-full overflow-hidden rounded-xl bg-white shadow-2xl print:rounded-none print:shadow-none">
        <section id="pf-comanda" className="thermal-receipt mx-auto w-[80mm] max-w-full bg-white p-3 text-[13px] font-medium leading-snug text-black">
          <div className="text-center">
            <p className="text-base font-black uppercase leading-tight">{restaurant.name}</p>
            <p className="text-[12px]">Teste de impressão</p>
          </div>

          <div className="my-2 border-t border-dashed border-black" />

          <div className="flex items-center justify-between border-y-2 border-black py-1.5">
            <span className="flex items-center gap-1.5 text-[14px] font-black uppercase"><ClipboardList className="h-4 w-4" /> Comanda</span>
            <span className="text-[15px] font-black">#TESTE</span>
          </div>

          <div className="py-1.5 text-center text-[12px] font-semibold">
            {now.toLocaleDateString("pt-BR")} · {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>

          <div className="border-t border-black" />

          <div className="space-y-0.5 py-2 text-[13px]">
            <p><strong>Cliente:</strong> Cliente de teste</p>
            <p><strong>Telefone:</strong> (00) 00000-0000</p>
            <p><strong>Tipo:</strong> Balcão</p>
          </div>

          <div className="border-t border-black" />

          <p className="py-1.5 text-[14px] font-black uppercase">Itens</p>
          <div className="space-y-1">
            <div className="border-b border-dashed border-black/40 pb-1.5">
              <div className="flex justify-between gap-2 font-bold"><span className="uppercase">1x Pizza de teste</span><span>R$ 00,00</span></div>
              <p className="pl-3 text-[12px]">- Massa: Tradicional</p>
              <p className="pl-3 text-[12px]">- Borda: Sem borda</p>
            </div>
            <div className="pb-1.5">
              <div className="flex justify-between gap-2 font-bold"><span className="uppercase">1x Refrigerante 2L</span><span>R$ 00,00</span></div>
            </div>
          </div>

          <div className="flex items-center justify-between border-2 border-black px-2 py-1.5">
            <span className="text-[15px] font-black uppercase">Total</span>
            <strong className="text-[17px]">R$ 00,00</strong>
          </div>

          <div className="border-t border-dashed border-black" />

          <div className="pt-2 text-center">
            <p className="text-[13px] font-black uppercase">Se você está lendo isto no papel,</p>
            <p className="text-[13px] font-black uppercase">a impressão está funcionando!</p>
          </div>
        </section>
      </div>
    </main>
  );
}
