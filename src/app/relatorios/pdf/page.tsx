import { requireRestaurant } from "@/lib/auth";
import {
  buildRowsByReportKind,
  loadReportDataset,
  reportTitles,
  type ReportKind,
  type ReportSearchParams,
  type TableRow,
} from "@/lib/reports";

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
    <main className="min-h-screen bg-slate-200 p-6 text-slate-950 print:bg-white print:p-0">
      <section className="mx-auto max-w-5xl bg-white p-10 shadow-2xl print:max-w-none print:p-0 print:shadow-none">
        <div className="border-b-2 border-slate-950 pb-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">PeriniFood</p>
          <h1 className="mt-2 text-3xl font-black">{reportTitles[type]}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {restaurant.name} • {dataset.range.startInput} até {dataset.range.endInput}
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          {rows.length ? (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  {headers.map((header) => (
                    <th key={header} className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-xs font-black uppercase text-slate-600">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="break-inside-avoid">
                    {headers.map((header) => (
                      <td key={header} className="border-b border-slate-200 px-3 py-2 font-medium">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
              Nenhum dado encontrado para o período selecionado.
            </p>
          )}
        </div>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          Relatório gerado em {new Date().toLocaleString("pt-BR")}. Use a opção “Salvar como PDF” na janela de impressão.
        </footer>
      </section>
      <script dangerouslySetInnerHTML={{ __html: "window.addEventListener('load',()=>setTimeout(()=>window.print(),300));" }} />
    </main>
  );
}
