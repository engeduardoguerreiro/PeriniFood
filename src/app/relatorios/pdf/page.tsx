import { requireRestaurant } from "@/lib/auth";
import {
  buildRowsByReportKind,
  loadReportDataset,
  reportTitles,
  type ReportKind,
  type ReportSearchParams,
  type TableRow,
} from "@/lib/reports";
import { formatStoreDateTime } from "@/lib/timezone";

const allowedTypes: ReportKind[] = ["overview", "vendas", "produtos", "pedidos", "clientes", "pagamentos", "delivery"];

function pick(searchParams: ReportSearchParams, key: string, fallback = "") {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

export default async function ReportPdfPage({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  const sp = await searchParams;
  const requestedType = pick(sp, "tipo", "overview") as ReportKind;
  const type = allowedTypes.includes(requestedType) ? requestedType : "overview";
  const { supabase, restaurant } = await requireRestaurant();
  const dataset = await loadReportDataset(supabase, restaurant, sp);
  const rows = buildRowsByReportKind(type, dataset) as TableRow[];
  const headers = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <main className="min-h-screen bg-[#eae7df] p-6 text-slate-950 print:bg-white print:p-0">
      <section className="mx-auto max-w-5xl bg-white p-10 shadow-2xl print:max-w-none print:p-0 print:shadow-none">
        <div className="border-b-2 border-slate-950 pb-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ink-faint">PeriniFood</p>
          <h1 className="mt-2 text-3xl font-black">{reportTitles[type]}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {restaurant.name} • {dataset.range.startInput} até {dataset.range.endInput}
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          {rows.length ? (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  {headers.map((header) => (
                    <th key={header} className="border-b border-[#dcd8cf] bg-[#f1efea] px-3 py-2 text-xs font-black uppercase text-ink-soft">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="break-inside-avoid">
                    {headers.map((header) => (
                      <td key={header} className="border-b border-line px-3 py-2 font-medium">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="rounded-xl border border-dashed border-[#dcd8cf] p-8 text-center text-sm font-semibold text-ink-faint">
              Nenhum dado encontrado para o período selecionado.
            </p>
          )}
        </div>

        <footer className="mt-8 border-t border-line pt-4 text-xs text-ink-faint">
          Relatório gerado em {formatStoreDateTime(new Date())}. Use a opção “Salvar como PDF” na janela de impressão.
        </footer>
      </section>
      <script dangerouslySetInnerHTML={{ __html: "window.addEventListener('load',()=>setTimeout(()=>window.print(),300));" }} />
    </main>
  );
}
