import type { TableRow } from "@/lib/reports";

export function ReportTable({ title, rows }: { title: string; rows: TableRow[] }) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
      <div className="border-b border-line-soft px-5 py-3.5">
        <h2 className="text-[0.95rem] font-semibold text-ink">{title}</h2>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line-soft bg-[#faf9f6] text-[0.7rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
              <tr>{headers.map((header) => <th key={header} className="px-5 py-2.5">{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {rows.map((row, index) => (
                <tr key={index} className="transition hover:bg-[#faf9f6]">
                  {headers.map((header) => <td key={header} className="px-5 py-2.5 text-ink-body">{row[header]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="p-8 text-center text-sm text-ink-faint">Nenhum registro encontrado.</p>}
    </section>
  );
}
