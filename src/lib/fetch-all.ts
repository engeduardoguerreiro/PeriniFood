// O PostgREST do Supabase devolve no máximo "max_rows" linhas por chamada (padrão
// 1000), mesmo com .limit() maior: relatórios e dashboard de loja grande ficavam
// com números menores sem aviso. Busca página a página até acabar (ou até `max`).
// `page` monta a consulta com .range(from, to) e uma ordenação estável.
// pageSize deve ser <= max_rows do projeto (Settings > API; padrão 1000).
type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function fetchAllRows<T>(page: (from: number, to: number) => Page<T>, { pageSize = 1000, max = 50_000 } = {}): Promise<T[]> {
  const rows: T[] = [];
  while (rows.length < max) {
    const want = Math.min(pageSize, max - rows.length);
    const { data, error } = await page(rows.length, rows.length + want - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < want) break;
  }
  return rows;
}
