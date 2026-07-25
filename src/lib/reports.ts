import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Customer, Order, OrderItem, Product, Restaurant } from "@/lib/types";

export type ReportKind = "overview" | "vendas" | "produtos" | "pedidos" | "clientes" | "pagamentos" | "delivery";
export type ReportSearchParams = Record<string, string | string[] | undefined>;
export type ChartPoint = { label: string; value: number; helper?: string };
export type TableRow = Record<string, string | number>;

type Row = Record<string, unknown>;

const PERIOD_LABELS: Record<string, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  "7dias": "Últimos 7 dias",
  "30dias": "Últimos 30 dias",
  mes: "Este mês",
  "mes-anterior": "Mês anterior",
  personalizado: "Personalizado",
};

export const reportLinks = [
  { href: "/relatorios/vendas", label: "Vendas" },
  { href: "/relatorios/produtos", label: "Produtos" },
  { href: "/relatorios/pedidos", label: "Pedidos" },
  { href: "/relatorios/clientes", label: "Clientes" },
  { href: "/relatorios/pagamentos", label: "Pagamentos" },
  { href: "/relatorios/delivery", label: "Delivery" },
  { href: "/relatorios/exportacoes", label: "Exportações" },
] as const;

export const reportTitles: Record<ReportKind, string> = {
  overview: "Visão geral",
  vendas: "Relatório de vendas",
  produtos: "Produtos vendidos",
  pedidos: "Relatório de pedidos",
  clientes: "Relatório de clientes",
  pagamentos: "Pagamentos",
  delivery: "Delivery",
};

function first(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function resolveReportRange(searchParams: ReportSearchParams) {
  const period = first(searchParams.periodo, "30dias");
  const today = startOfDay(new Date());
  let start = addDays(today, -29);
  let end = addDays(today, 1);

  if (period === "hoje") {
    start = today;
    end = addDays(today, 1);
  } else if (period === "ontem") {
    start = addDays(today, -1);
    end = today;
  } else if (period === "7dias") {
    start = addDays(today, -6);
    end = addDays(today, 1);
  } else if (period === "mes") {
    start = startOfMonth(today);
    end = addDays(today, 1);
  } else if (period === "mes-anterior") {
    const thisMonth = startOfMonth(today);
    start = startOfMonth(addDays(thisMonth, -1));
    end = thisMonth;
  } else if (period === "personalizado") {
    const inicio = first(searchParams.inicio);
    const fim = first(searchParams.fim);
    if (inicio) start = startOfDay(new Date(`${inicio}T00:00:00`));
    if (fim) end = addDays(startOfDay(new Date(`${fim}T00:00:00`)), 1);
  }

  return {
    period,
    label: PERIOD_LABELS[period] ?? PERIOD_LABELS["30dias"],
    start,
    end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    startInput: start.toISOString().slice(0, 10),
    endInput: addDays(end, -1).toISOString().slice(0, 10),
  };
}

export function sourceLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    pdv: "PDV",
    mesa: "Mesa",
    delivery: "Delivery",
    site: "Cardápio próprio",
    ifood: "iFood",
    "99food": "99Food",
    keeta: "Keeta",
    rappi: "Rappi",
    manual: "Manual",
    CUSTOM_WEBHOOK: "API",
    OWN_MENU: "Cardápio próprio",
    WHATSAPP: "WhatsApp",
    IFOOD: "iFood",
    NINETY_NINE_FOOD: "99Food",
  };
  return labels[String(value ?? "").trim()] ?? String(value ?? "Não informado");
}

export function paymentLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    cash: "Dinheiro",
    pix: "Pix",
    credit_card: "Cartão de crédito",
    debit_card: "Cartão de débito",
    online: "Pago online",
    other: "Outro",
  };
  return labels[String(value ?? "").trim()] ?? String(value ?? "Não informado");
}

export function orderTypeLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    delivery: "Delivery",
    pickup: "Retirada",
    dine_in: "Consumo no local",
  };
  return labels[String(value ?? "").trim()] ?? String(value ?? "Não informado");
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateKey(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function isCanceled(order: Order) {
  return order.status === "canceled";
}

function isCompleted(order: Order) {
  return order.status === "completed";
}

function validOrders(orders: Order[]) {
  return orders.filter((order) => !isCanceled(order));
}

function groupSum<T>(items: T[], key: (item: T) => string, value: (item: T) => number) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const label = key(item);
    acc[label] = (acc[label] ?? 0) + value(item);
    return acc;
  }, {});
}

function entriesToChart(record: Record<string, number>, limit = 8) {
  return Object.entries(record)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function filterOrders(orders: Order[], searchParams: ReportSearchParams) {
  const status = first(searchParams.status, "todos");
  const canal = first(searchParams.canal, "todos");
  const pagamento = first(searchParams.pagamento, "todos");
  const tipo = first(searchParams.tipo_pedido, "todos");

  return orders.filter((order) => {
    if (status !== "todos" && order.status !== status) return false;
    if (canal !== "todos" && (order.external_platform ?? order.source) !== canal && order.source !== canal) return false;
    if (pagamento !== "todos" && order.payment_method !== pagamento) return false;
    if (tipo !== "todos" && order.type !== tipo) return false;
    return true;
  });
}

function filterItems(items: OrderItem[], orders: Order[], searchParams: ReportSearchParams) {
  const q = normalizeText(first(searchParams.q));
  const orderIds = new Set(orders.map((order) => order.id));
  return items.filter((item) => orderIds.has(item.order_id) && (!q || normalizeText(item.product_name).includes(q)));
}

export async function loadReportDataset(
  supabase: SupabaseClient,
  restaurant: Restaurant,
  searchParams: ReportSearchParams,
) {
  const range = resolveReportRange(searchParams);

  const { data: orderRows, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .gte("created_at", range.startISO)
    .lt("created_at", range.endISO)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (orderError) throw new Error(orderError.message);

  const orders = filterOrders((orderRows ?? []) as Order[], searchParams);
  const orderIds = orders.map((order) => order.id);

  const [{ data: itemRows }, { data: productRows }, { data: customerRows }] = await Promise.all([
    orderIds.length
      ? supabase.from("order_items").select("*").eq("restaurant_id", restaurant.id).in("order_id", orderIds)
      : Promise.resolve({ data: [] as Row[] }),
    supabase.from("products").select("*, categories(name)").eq("restaurant_id", restaurant.id),
    supabase.from("customers").select("*").eq("restaurant_id", restaurant.id),
  ]);

  const items = filterItems((itemRows ?? []) as OrderItem[], orders, searchParams);
  const products = (productRows ?? []) as Product[];
  const customers = (customerRows ?? []) as Customer[];
  const usefulOrders = validOrders(orders);
  const usefulOrderIds = new Set(usefulOrders.map((order) => order.id));
  const usefulItems = items.filter((item) => usefulOrderIds.has(item.order_id));

  return { range, orders, usefulOrders, items, usefulItems, products, customers };
}

export function buildOverviewReport(dataset: Awaited<ReturnType<typeof loadReportDataset>>) {
  const { orders, usefulOrders, usefulItems, customers } = dataset;
  const revenue = usefulOrders.reduce((sum, order) => sum + numberValue(order.total), 0);
  const productQuantity = usefulItems.reduce((sum, item) => sum + numberValue(item.quantity), 0);
  const cancelRate = orders.length ? (orders.filter(isCanceled).length / orders.length) * 100 : 0;
  const customerKeys = new Set(usefulOrders.map((order) => order.customer_id ?? order.customer_phone ?? order.customer_name).filter(Boolean));
  const bySource = entriesToChart(groupSum(usefulOrders, (order) => sourceLabel(order.external_platform ?? order.source), () => 1));
  const byPayment = entriesToChart(groupSum(usefulOrders, (order) => paymentLabel(order.payment_method), () => 1));

  return {
    cards: {
      revenue,
      orders: orders.length,
      averageTicket: usefulOrders.length ? revenue / usefulOrders.length : 0,
      productQuantity,
      customers: customerKeys.size || customers.length,
      cancelRate,
      topSource: bySource[0]?.label ?? "Sem vendas",
      topPayment: byPayment[0]?.label ?? "Sem pagamentos",
    },
    dailySales: Object.entries(groupSum(usefulOrders, (order) => dateKey(order.created_at), (order) => numberValue(order.total))).map(([label, value]) => ({ label, value })),
    bySource,
    byPayment,
  };
}

export function buildSalesReport(dataset: Awaited<ReturnType<typeof loadReportDataset>>) {
  const { usefulOrders } = dataset;
  const gross = usefulOrders.reduce((sum, order) => sum + numberValue(order.subtotal), 0);
  const discount = usefulOrders.reduce((sum, order) => sum + numberValue(order.discount), 0);
  const delivery = usefulOrders.reduce((sum, order) => sum + numberValue(order.delivery_fee), 0);
  const net = usefulOrders.reduce((sum, order) => sum + numberValue(order.total), 0);
  const rows = usefulOrders.map((order) => ({
    Pedido: `#${order.code ?? String(order.order_number ?? "").padStart(4, "0")}`,
    Data: new Date(order.created_at).toLocaleString("pt-BR"),
    Cliente: order.customer_name ?? "Cliente balcão",
    Canal: sourceLabel(order.external_platform ?? order.source),
    Pagamento: paymentLabel(order.payment_method),
    Total: netCurrency(order.total),
  }));

  return {
    cards: { gross, discount, delivery, net, average: usefulOrders.length ? net / usefulOrders.length : 0 },
    chart: Object.entries(groupSum(usefulOrders, (order) => dateKey(order.created_at), (order) => numberValue(order.total))).map(([label, value]) => ({ label, value })),
    rows,
  };
}

export function buildProductsReport(dataset: Awaited<ReturnType<typeof loadReportDataset>>) {
  const { usefulItems, products } = dataset;
  const productMap = new Map(products.map((product) => [product.id, product]));
  const grouped = usefulItems.reduce<Record<string, { name: string; category: string; quantity: number; revenue: number; ticket: number }>>((acc, item) => {
    const product = item.product_id ? productMap.get(item.product_id) : undefined;
    const name = item.product_name || product?.name || "Produto sem nome";
    const current = acc[name] ?? { name, category: product?.categories?.name ?? "Sem categoria", quantity: 0, revenue: 0, ticket: 0 };
    current.quantity += numberValue(item.quantity);
    current.revenue += numberValue(item.total_price);
    current.ticket = current.quantity ? current.revenue / current.quantity : 0;
    acc[name] = current;
    return acc;
  }, {});
  const productsRank = Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
  return {
    cards: {
      sold: productsRank.reduce((sum, item) => sum + item.quantity, 0),
      revenue: productsRank.reduce((sum, item) => sum + item.revenue, 0),
      top: productsRank[0]?.name ?? "Sem vendas",
      activeProducts: products.filter((product) => product.active).length,
    },
    chart: productsRank.slice(0, 10).map((item) => ({ label: item.name, value: item.revenue, helper: `${item.quantity} un.` })),
    rows: productsRank.map((item) => ({
      Produto: item.name,
      Categoria: item.category,
      Quantidade: item.quantity,
      Faturamento: netCurrency(item.revenue),
      "Preço médio": netCurrency(item.ticket),
    })),
  };
}

export function buildOrdersReport(dataset: Awaited<ReturnType<typeof loadReportDataset>>) {
  const { orders, usefulOrders } = dataset;
  return {
    cards: {
      total: orders.length,
      pending: orders.filter((order) => order.status === "pending").length,
      completed: orders.filter(isCompleted).length,
      canceled: orders.filter(isCanceled).length,
    },
    statusChart: entriesToChart(groupSum(orders, (order) => order.status, () => 1)),
    sourceChart: entriesToChart(groupSum(usefulOrders, (order) => sourceLabel(order.external_platform ?? order.source), () => 1)),
    rows: orders.map((order) => ({
      Pedido: `#${order.code ?? String(order.order_number ?? "").padStart(4, "0")}`,
      Cliente: order.customer_name ?? "Cliente balcão",
      Status: order.status,
      Tipo: orderTypeLabel(order.type),
      Origem: sourceLabel(order.external_platform ?? order.source),
      Total: netCurrency(order.total),
      Data: new Date(order.created_at).toLocaleString("pt-BR"),
    })),
  };
}

export function buildCustomersReport(dataset: Awaited<ReturnType<typeof loadReportDataset>>) {
  const { usefulOrders, customers } = dataset;
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const grouped = usefulOrders.reduce<Record<string, { name: string; phone: string; orders: number; revenue: number; last: string }>>((acc, order) => {
    const key = order.customer_id ?? order.customer_phone ?? order.customer_name ?? "balcao";
    const customer = order.customer_id ? customerMap.get(order.customer_id) : undefined;
    const current = acc[key] ?? {
      name: customer?.name ?? order.customer_name ?? "Cliente balcão",
      phone: customer?.whatsapp ?? customer?.phone ?? order.customer_phone ?? "-",
      orders: 0,
      revenue: 0,
      last: order.created_at,
    };
    current.orders += 1;
    current.revenue += numberValue(order.total);
    if (new Date(order.created_at) > new Date(current.last)) current.last = order.created_at;
    acc[key] = current;
    return acc;
  }, {});
  const rows = Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
  return {
    cards: {
      active: rows.length,
      newCustomers: customers.filter((customer) => customer.created_at >= dataset.range.startISO && customer.created_at < dataset.range.endISO).length,
      top: rows[0]?.name ?? "Sem clientes",
      average: rows.length ? rows.reduce((sum, row) => sum + row.revenue, 0) / rows.length : 0,
    },
    chart: rows.slice(0, 10).map((row) => ({ label: row.name, value: row.revenue, helper: `${row.orders} pedido(s)` })),
    rows: rows.map((row) => ({
      Cliente: row.name,
      Telefone: row.phone,
      Pedidos: row.orders,
      Faturamento: netCurrency(row.revenue),
      "Último pedido": new Date(row.last).toLocaleString("pt-BR"),
    })),
  };
}

export function buildPaymentsReport(dataset: Awaited<ReturnType<typeof loadReportDataset>>) {
  const { usefulOrders } = dataset;
  const grouped = usefulOrders.reduce<Record<string, { method: string; orders: number; revenue: number }>>((acc, order) => {
    const method = paymentLabel(order.payment_method);
    const current = acc[method] ?? { method, orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += numberValue(order.total);
    acc[method] = current;
    return acc;
  }, {});
  const rows = Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
  return {
    cards: {
      total: rows.reduce((sum, row) => sum + row.revenue, 0),
      methods: rows.length,
      top: rows[0]?.method ?? "Sem pagamentos",
      paidOrders: usefulOrders.filter((order) => order.payment_status === "paid").length,
    },
    chart: rows.map((row) => ({ label: row.method, value: row.revenue, helper: `${row.orders} pedido(s)` })),
    rows: rows.map((row) => ({
      Forma: row.method,
      Pedidos: row.orders,
      Faturamento: netCurrency(row.revenue),
      Participação: `${usefulOrders.length ? ((row.orders / usefulOrders.length) * 100).toFixed(1) : "0"}%`,
    })),
  };
}

export function buildDeliveryReport(dataset: Awaited<ReturnType<typeof loadReportDataset>>) {
  const deliveryOrders = dataset.usefulOrders.filter((order) => order.type === "delivery");
  const fees = deliveryOrders.reduce((sum, order) => sum + numberValue(order.delivery_fee), 0);
  const revenue = deliveryOrders.reduce((sum, order) => sum + numberValue(order.total), 0);
  const rows = deliveryOrders.map((order) => ({
    Pedido: `#${order.code ?? String(order.order_number ?? "").padStart(4, "0")}`,
    Cliente: order.customer_name ?? "Cliente",
    Endereço: order.delivery_address ?? "-",
    Entrega: netCurrency(order.delivery_fee),
    Total: netCurrency(order.total),
    Data: new Date(order.created_at).toLocaleString("pt-BR"),
  }));

  return {
    cards: {
      orders: deliveryOrders.length,
      fees,
      averageFee: deliveryOrders.length ? fees / deliveryOrders.length : 0,
      revenue,
    },
    chart: Object.entries(groupSum(deliveryOrders, (order) => dateKey(order.created_at), () => 1)).map(([label, value]) => ({ label, value })),
    rows,
  };
}

function netCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

export function toCsv(rows: TableRow[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(";"), ...rows.map((row) => headers.map((header) => escape(row[header])).join(";"))].join("\n");
}

export function buildRowsByReportKind(kind: ReportKind, dataset: Awaited<ReturnType<typeof loadReportDataset>>) {
  if (kind === "vendas") return buildSalesReport(dataset).rows;
  if (kind === "produtos") return buildProductsReport(dataset).rows;
  if (kind === "pedidos") return buildOrdersReport(dataset).rows;
  if (kind === "clientes") return buildCustomersReport(dataset).rows;
  if (kind === "pagamentos") return buildPaymentsReport(dataset).rows;
  if (kind === "delivery") return buildDeliveryReport(dataset).rows;

  const overview = buildOverviewReport(dataset);
  return [
    { Indicador: "Faturamento total", Valor: netCurrency(overview.cards.revenue) },
    { Indicador: "Pedidos", Valor: overview.cards.orders },
    { Indicador: "Ticket médio", Valor: netCurrency(overview.cards.averageTicket) },
    { Indicador: "Produtos vendidos", Valor: overview.cards.productQuantity },
    { Indicador: "Clientes atendidos", Valor: overview.cards.customers },
    { Indicador: "Taxa de cancelamento", Valor: `${overview.cards.cancelRate.toFixed(1)}%` },
    { Indicador: "Canal com mais vendas", Valor: overview.cards.topSource },
    { Indicador: "Pagamento mais usado", Valor: overview.cards.topPayment },
  ];
}
