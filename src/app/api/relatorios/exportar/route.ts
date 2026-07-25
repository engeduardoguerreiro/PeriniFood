import { NextRequest } from "next/server";
import { requireRestaurant } from "@/lib/auth";
import {
  buildCustomersReport,
  buildDeliveryReport,
  buildOrdersReport,
  buildPaymentsReport,
  buildProductsReport,
  buildSalesReport,
  loadReportDataset,
  toCsv,
  type ReportKind,
  type ReportSearchParams,
  type TableRow,
} from "@/lib/reports";

const allowedTypes: ReportKind[] = ["vendas", "produtos", "pedidos", "clientes", "pagamentos", "delivery"];

function searchParamsToObject(searchParams: URLSearchParams): ReportSearchParams {
  const output: ReportSearchParams = {};
  searchParams.forEach((value, key) => {
    if (output[key]) {
      const current = output[key];
      output[key] = Array.isArray(current) ? [...current, value] : [current, value];
    } else {
      output[key] = value;
    }
  });
  return output;
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("tipo") as ReportKind | null;
  if (!type || !allowedTypes.includes(type)) {
    return Response.json({ error: "Tipo de relatório inválido." }, { status: 400 });
  }

  const { supabase, restaurant } = await requireRestaurant();
  const dataset = await loadReportDataset(supabase, restaurant, searchParamsToObject(request.nextUrl.searchParams));
  let rows: TableRow[] = [];

  if (type === "vendas") rows = buildSalesReport(dataset).rows;
  if (type === "produtos") rows = buildProductsReport(dataset).rows;
  if (type === "pedidos") rows = buildOrdersReport(dataset).rows;
  if (type === "clientes") rows = buildCustomersReport(dataset).rows;
  if (type === "pagamentos") rows = buildPaymentsReport(dataset).rows;
  if (type === "delivery") rows = buildDeliveryReport(dataset).rows;

  const csv = `\uFEFF${toCsv(rows)}`;
  const filename = `perinifood-${type}-${dataset.range.startInput}-${dataset.range.endInput}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
