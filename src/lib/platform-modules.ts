// Catálogo de módulos que a PeriniFood habilita por cliente. Inclui os que
// ainda estão em construção — o admin já pode liberar para clientes piloto.
export type ModuleStage = "live" | "beta" | "soon";

export type PlatformModule = {
  key: string;
  name: string;
  description: string;
  stage: ModuleStage;
  group: "Operação" | "Canais de venda" | "Gestão" | "Fiscal";
};

export const PLATFORM_MODULES: PlatformModule[] = [
  { key: "pedidos", name: "Pedidos e cozinha", description: "Painel de pedidos por etapa, PDV e comandas.", stage: "live", group: "Operação" },
  { key: "impressao", name: "Impressão de comanda", description: "Impressão automática em impressora térmica.", stage: "live", group: "Operação" },
  { key: "delivery", name: "Delivery e taxas", description: "Taxas por bairro/raio e controle de entrega.", stage: "live", group: "Operação" },
  { key: "mesas", name: "Mesas e balcão", description: "Atendimento no salão com controle de mesa.", stage: "live", group: "Operação" },
  { key: "motoboy", name: "Gestão de entregadores", description: "Rotas, fila de entregadores e acompanhamento.", stage: "soon", group: "Operação" },

  { key: "cardapio_digital", name: "Cardápio digital", description: "Link e QR Code do cardápio próprio.", stage: "live", group: "Canais de venda" },
  { key: "ifood", name: "Integração iFood", description: "Pedidos e cardápio sincronizados com o iFood.", stage: "live", group: "Canais de venda" },
  { key: "99food", name: "Integração 99Food", description: "Recebimento de pedidos do 99Food.", stage: "beta", group: "Canais de venda" },
  { key: "keeta", name: "Integração Keeta", description: "Recebimento de pedidos da Keeta.", stage: "soon", group: "Canais de venda" },
  { key: "whatsapp", name: "WhatsApp", description: "Atendimento e envio de pedidos por WhatsApp.", stage: "beta", group: "Canais de venda" },

  { key: "clientes", name: "Clientes e fidelidade", description: "Base de clientes, cupons e programa de pontos.", stage: "live", group: "Gestão" },
  { key: "relatorios", name: "Relatórios", description: "Relatórios de vendas e desempenho da loja.", stage: "live", group: "Gestão" },
  { key: "estoque", name: "Controle de estoque", description: "Baixa automática e alerta de reposição.", stage: "beta", group: "Gestão" },
  { key: "multi_loja", name: "Multi-loja", description: "Várias unidades sob o mesmo login.", stage: "soon", group: "Gestão" },

  { key: "fiscal", name: "Módulo Fiscal (NFC-e)", description: "Emissão de nota fiscal do consumidor.", stage: "soon", group: "Fiscal" },
  { key: "fiscal_sat", name: "SAT / Cupom fiscal", description: "Integração com equipamento SAT.", stage: "soon", group: "Fiscal" },
];

export const MODULE_GROUPS = ["Operação", "Canais de venda", "Gestão", "Fiscal"] as const;

export const stageLabel: Record<ModuleStage, string> = {
  live: "Disponível",
  beta: "Beta",
  soon: "Em construção",
};

export const stageTone: Record<ModuleStage, string> = {
  live: "bg-emerald-50 text-emerald-700",
  beta: "bg-amber-50 text-amber-700",
  soon: "bg-[#f1efea] text-ink-soft",
};

export function moduleName(key: string) {
  return PLATFORM_MODULES.find((m) => m.key === key)?.name ?? key;
}
