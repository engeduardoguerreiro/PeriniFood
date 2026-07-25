import { Cable, MessageCircle, Store, UtensilsCrossed } from "lucide-react";

export type IntegrationProviderSlug = "99food" | "ifood" | "keeta" | "whatsapp" | "webhook" | "own_menu";

export type IntegrationStatus = "disconnected" | "pending" | "active" | "connected" | "error" | "disabled";

export const integrationProviders = [
  {
    provider: "99food",
    name: "99Food",
    description: "Prepare recebimento de pedidos e status para marketplace 99Food.",
    badge: "Marketplace",
    icon: Store,
  },
  {
    provider: "ifood",
    name: "iFood",
    description: "Centralize pedidos, logs e mapeamentos para integração futura com iFood.",
    badge: "Marketplace",
    icon: UtensilsCrossed,
  },
  {
    provider: "keeta",
    name: "Keeta",
    description: "Configure credenciais e webhooks para operar com Keeta quando a API oficial for plugada.",
    badge: "Marketplace",
    icon: Store,
  },
  {
    provider: "whatsapp",
    name: "WhatsApp",
    description: "Use mensagens manuais com links wa.me nos pedidos e no atendimento.",
    badge: "Atendimento",
    icon: MessageCircle,
  },
  {
    provider: "webhook",
    name: "Webhooks / API",
    description: "Receba pedidos de sistemas externos via webhook genérico do PeriniFood.",
    badge: "Avançado",
    icon: Cable,
  },
] as const;

export const marketplaceProviders = integrationProviders.filter((item) => ["99food", "ifood", "keeta"].includes(item.provider));

export function providerInfo(provider: string | null) {
  return integrationProviders.find((item) => item.provider === provider) ?? integrationProviders[0];
}

export function providerPath(provider: string) {
  if (provider === "webhook") return "/integracoes/webhooks";
  return `/integracoes/${provider}`;
}

export function statusLabel(status: string | null, enabled: boolean | null) {
  if (!status && !enabled) return "Não configurado";
  if (status === "active" || status === "connected") return "Ativo";
  if (status === "pending") return "Pendente";
  if (status === "error") return "Erro";
  if (status === "disabled" || enabled === false) return "Desativado";
  return "Não configurado";
}

export function statusClass(status: string | null, enabled: boolean | null) {
  const label = statusLabel(status, enabled);
  if (label === "Ativo") return "bg-emerald-50 text-emerald-700";
  if (label === "Pendente") return "bg-amber-50 text-amber-700";
  if (label === "Erro") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-600";
}
