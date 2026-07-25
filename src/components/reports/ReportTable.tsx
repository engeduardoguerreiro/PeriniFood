import type { TableRow } from "@/lib/reports";

export function ReportTable({ title, rows }: { title: string; rows: TableRow[] }) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>{headers.map((header) => <th key={header} className="px-5 py-3">{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50/70">
                  {headers.map((header) => <td key={header} className="px-5 py-3 font-semibold text-slate-700">{row[header]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="p-8 text-center text-sm font-semibold text-slate-500">Nenhum registro encontrado.</p>}
    </section>
  );
}
