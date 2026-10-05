// Modelos das mensagens automáticas de status (editáveis pela loja em
// Integrações → WhatsApp). Variáveis: {nome} {pedido} {loja} {link} {codigo} {total}.

export type TemplateKey = "confirmed" | "preparing" | "ready" | "dispatched" | "completed";

export const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  confirmed: "Olá, {nome}! 👋 Recebemos seu pedido #{pedido} na {loja}.\nAcompanhe aqui: {link}",
  preparing: "{nome}, seu pedido #{pedido} já está sendo preparado! 👨‍🍳",
  ready: "Seu pedido #{pedido} está pronto para retirada na {loja}! ✅",
  dispatched: "Seu pedido #{pedido} saiu para entrega! 🛵\nAcompanhe o motoboy no mapa: {link}\n\nCódigo de entrega: *{codigo}* — informe ao entregador ao receber.",
  completed: "Pedido #{pedido} entregue. Obrigado pela preferência, {nome}! ❤️",
};

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  confirmed: "Pedido recebido",
  preparing: "Em preparo",
  ready: "Pronto para retirada",
  dispatched: "Saiu para entrega",
  completed: "Entregue / finalizado",
};

export function renderTemplate(template: string, vars: Record<string, string>) {
  return template
    .replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
