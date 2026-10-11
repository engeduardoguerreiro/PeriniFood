// Pedidos do site lembrados no próprio aparelho do cliente, por loja. Sem conta,
// era o único jeito de voltar ao acompanhamento depois de fechar a página.
// O código (48 hex) é o segredo que já dá acesso ao /pedido/[codigo].

export type RecentOrder = { code: string; number: string; at: number };

const MAX_AGE = 2 * 24 * 60 * 60 * 1000;
const key = (slug: string) => `perinifood_pedidos_${slug}`;

export function recentOrders(slug: string): RecentOrder[] {
  try {
    const list = JSON.parse(window.localStorage.getItem(key(slug)) ?? "[]") as RecentOrder[];
    return Array.isArray(list) ? list.filter((order) => /^[a-f0-9]{48}$/.test(order.code) && Date.now() - order.at < MAX_AGE) : [];
  } catch {
    return [];
  }
}

export function rememberOrder(slug: string, order: Omit<RecentOrder, "at">) {
  try {
    const others = recentOrders(slug).filter((item) => item.code !== order.code);
    window.localStorage.setItem(key(slug), JSON.stringify([{ ...order, at: Date.now() }, ...others].slice(0, 5)));
  } catch {}
}

export function forgetOrder(slug: string, code: string) {
  try {
    window.localStorage.setItem(key(slug), JSON.stringify(recentOrders(slug).filter((item) => item.code !== code)));
  } catch {}
}

// E-mail digitado no checkout, para já vir preenchido no "crie uma senha" do acompanhamento.
const emailKey = (slug: string) => `perinifood_email_${slug}`;
export function rememberCheckoutEmail(slug: string, email: string) {
  try { window.sessionStorage.setItem(emailKey(slug), email); } catch {}
}
export function checkoutEmail(slug: string) {
  try { return window.sessionStorage.getItem(emailKey(slug)) ?? ""; } catch { return ""; }
}
