/* eslint-disable @next/next/no-img-element */
import { saveDeliveryFeeRules, updatePassword, updateRestaurant } from "@/app/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { DeliveryFeeRulesEditor } from "@/components/delivery-fee-rules-editor";
import { FileInput } from "@/components/file-input";
import { MoneyInput } from "@/components/money-input";
import { OpeningHoursEditor } from "@/components/opening-hours-editor";
import { PrinterDiscovery } from "@/components/printer-discovery";
import { SettingsCepLookup } from "@/components/settings-cep-lookup";
import { SettingsTabs, TabPanel, TabReturnTo } from "@/components/settings-tabs";
import { requireRestaurant } from "@/lib/auth";
import { deliveryRulesFromRestaurant } from "@/lib/delivery-fee-rules";
import { isRestaurantOpen } from "@/lib/opening-hours";
import type { DeliveryFeeRule } from "@/lib/types";

// Campos auto-contidos (altura fixa + padding só horizontal) evitam o corte
// de letra que acontecia com o .field-light + h-10.
const fieldBase = "w-full rounded-lg border border-line bg-white text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/12";
const inputClass = `${fieldBase} h-9 px-3`;
const textareaClass = `${fieldBase} px-3 py-2 leading-snug`;
const saveBtnClass = "inline-flex h-9 items-center justify-center rounded-lg bg-btn px-5 text-sm font-medium text-white transition hover:bg-btn-hover";
const noteClass = "rounded-lg bg-[#faf9f6] p-2.5 text-xs text-ink-soft";
const checkboxRowClass = "flex items-center gap-2 rounded-lg border border-line-soft bg-[#faf9f6] px-3 py-2 text-sm text-[#403d38]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="block text-[0.7rem] font-medium uppercase tracking-[0.08em] text-ink-faint">{label}</span>
      {children}
    </label>
  );
}

function ConfigSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
      <div className="border-b border-line-soft px-4 py-2.5">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-ink-faint">{description}</p>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SaveBar({ label, formAction }: { label: string; formAction?: typeof saveDeliveryFeeRules }) {
  return (
    <div className="mt-4 flex justify-end">
      <button formAction={formAction} className={saveBtnClass}>{label}</button>
    </div>
  );
}

type PrinterSettings = {
  enabled: boolean;
  method: string;
  printer_name: string | null;
  paper_width: number;
  copies: number;
  auto_print: boolean;
  cut_paper: boolean;
  open_cash_drawer: boolean;
  network_address: string | null;
  notes: string | null;
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ status: string; error: string; password_success: string; password_error: string }> }) {
  const { supabase, restaurant } = await requireRestaurant();
  const sp = await searchParams;
  const { data: deliveryRules } = await supabase
    .from("delivery_fee_rules")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("min_km");
  const rules = ((deliveryRules ?? []).length ? deliveryRules : deliveryRulesFromRestaurant(restaurant)) as DeliveryFeeRule[];
  const storeOpen = isRestaurantOpen(restaurant);
  const printerSettings = (((restaurant.opening_hours as Record<string, unknown> | null) ?? {})._printer_settings ?? {}) as PrinterSettings;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Configurações</h1>
        <p className="text-sm text-ink-faint">Dados da empresa, cardápio online, impressão e entrega.</p>
      </div>

      <ActionFeedback status={sp.status} error={sp.error} />

      <SettingsTabs
        tabs={[
          { id: "dados", label: "Dados" },
          { id: "imagens", label: "Imagens" },
          { id: "horario", label: "Horário" },
          { id: "regras", label: "Regras" },
          { id: "impressao", label: "Impressão" },
          { id: "entrega", label: "Entrega" },
          { id: "seguranca", label: "Segurança" },
        ]}
      >
        <form action={updateRestaurant}>
          <TabPanel id="dados">
            <ConfigSection title="Dados gerais da empresa">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Nome fantasia">
              <input className={inputClass} name="name" defaultValue={restaurant.name} />
            </Field>
            <Field label="Razão social">
              <input className={inputClass} name="legal_name" defaultValue={restaurant.legal_name ?? ""} placeholder="Razão social" />
            </Field>
            <Field label="Slug do cardápio">
              <input className={inputClass} name="slug" defaultValue={restaurant.slug} />
            </Field>
            <Field label="E-mail principal">
              <input className={inputClass} name="email" defaultValue={restaurant.email ?? ""} />
            </Field>
            <Field label="Telefone">
              <input className={inputClass} name="phone" defaultValue={restaurant.phone ?? ""} />
            </Field>
            <Field label="WhatsApp">
              <input className={inputClass} name="whatsapp" defaultValue={restaurant.whatsapp ?? ""} />
            </Field>
            <Field label="CNPJ">
              <input className={inputClass} name="cnpj" defaultValue={restaurant.cnpj ?? ""} placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="Inscrição estadual">
              <input className={inputClass} name="state_registration" defaultValue={restaurant.state_registration ?? ""} />
            </Field>
            <Field label="Endereço">
              <input className={inputClass} name="address" defaultValue={restaurant.address ?? ""} />
            </Field>
            <Field label="Número">
              <input className={inputClass} name="address_number" defaultValue={restaurant.address_number ?? ""} placeholder="N" />
            </Field>
            <Field label="Bairro">
              <input className={inputClass} name="neighborhood" defaultValue={restaurant.neighborhood ?? ""} />
            </Field>
            <Field label="Cidade">
              <input className={inputClass} name="city" defaultValue={restaurant.city ?? ""} />
            </Field>
            <Field label="UF">
              <input className={inputClass} name="state" defaultValue={restaurant.state ?? ""} />
            </Field>
            <Field label="CEP">
              <SettingsCepLookup defaultValue={restaurant.zip_code} />
            </Field>
          </div>
          <SaveBar label="Salvar" />
            </ConfigSection>
          </TabPanel>

          <TabPanel id="imagens">
            <ConfigSection title="Imagens e cardápio online">
          <input type="hidden" name="logo_url" value={restaurant.logo_url ?? ""} />
          <input type="hidden" name="cover_url" value={restaurant.cover_url ?? ""} />
          <input type="hidden" name="banner_url" value={restaurant.banner_url ?? restaurant.cover_url ?? ""} />
          <input type="hidden" name="site_cover_url" value={restaurant.site_cover_url ?? ""} />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line-soft bg-[#faf9f6] p-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white text-[10px] font-medium text-ink-faint">
                {restaurant.logo_url ? <img src={restaurant.logo_url} alt="Logotipo atual" className="h-full w-full object-cover" /> : "300×300"}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-sm font-medium text-ink">Logotipo</p>
                  <p className="text-xs text-ink-faint">Quadrado 300 × 300 px · PNG, JPG ou WEBP. Aparece no cardápio online e na comanda.</p>
                </div>
                <FileInput name="logo_file" accept="image/png,image/jpeg,image/webp" label="Escolher imagem" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line-soft bg-[#faf9f6] p-3">
              <div className="grid aspect-[16/5] w-32 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white text-[10px] font-medium text-ink-faint">
                {restaurant.banner_url || restaurant.cover_url ? <img src={restaurant.banner_url ?? restaurant.cover_url ?? ""} alt="Banner atual" className="h-full w-full object-cover" /> : "1600×500"}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-sm font-medium text-ink">Banner do cardápio</p>
                  <p className="text-xs text-ink-faint">1600 × 500 px. Aparece no topo do cardápio público.</p>
                </div>
                <FileInput name="banner_file" accept="image/png,image/jpeg,image/webp" label="Escolher imagem" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line-soft bg-[#faf9f6] p-3">
              <div className="grid aspect-[31/10] w-32 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white text-[10px] font-medium text-ink-faint">
                {restaurant.site_cover_url ? <img src={restaurant.site_cover_url} alt="Capa atual do site" className="h-full w-full object-cover" /> : "1920×620"}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-sm font-medium text-ink">Capa do site</p>
                  <p className="text-xs text-ink-faint">1920 × 620 px, arte larga com boa leitura no centro.</p>
                </div>
                <FileInput name="site_cover_file" accept="image/png,image/jpeg,image/webp" label="Escolher imagem" />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Field label="Descrição">
              <textarea className={`${textareaClass} min-h-20`} name="description" defaultValue={restaurant.description ?? ""} />
            </Field>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className={checkboxRowClass}><input name="delivery_enabled" type="checkbox" defaultChecked={restaurant.delivery_enabled} /> Delivery</label>
            <label className={checkboxRowClass}><input name="pickup_enabled" type="checkbox" defaultChecked={restaurant.pickup_enabled} /> Retirada</label>
            <label className={checkboxRowClass}><input name="table_service_enabled" type="checkbox" defaultChecked={restaurant.table_service_enabled} /> Atendimento em mesa</label>
          </div>
          <SaveBar label="Salvar" />
            </ConfigSection>
          </TabPanel>

          <TabPanel id="horario">
            <ConfigSection title="Horário de funcionamento" description="O cardápio online bloqueia novos pedidos quando a loja estiver fechada.">
          <input type="hidden" name="is_open" value={restaurant.is_open ? "on" : ""} />
          <input type="hidden" name="manual_open_status" value={restaurant.manual_open_status ?? "auto"} />
          <p className={`mb-4 ${noteClass}`}>
            Status atual: <strong className="font-semibold text-[#403d38]">{storeOpen ? "loja aberta" : "loja fechada"}</strong>. Altere abertura automática, manual ou desligamento direto no seletor da loja no topo.
          </p>
          <OpeningHoursEditor openingHours={restaurant.opening_hours} />
          <SaveBar label="Salvar horários" />
            </ConfigSection>
          </TabPanel>

          <TabPanel id="regras">
            <ConfigSection title="Regras do cardápio">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Pedido mínimo">
              <MoneyInput className={inputClass} name="minimum_order" defaultValue={restaurant.minimum_order ?? 0} />
            </Field>
            <Field label="Taxa de entrega padrão">
              <MoneyInput className={inputClass} name="delivery_fee" defaultValue={restaurant.delivery_fee ?? 0} />
            </Field>
            <Field label="Tempo estimado">
              <input className={inputClass} name="estimated_delivery_time" defaultValue={restaurant.estimated_delivery_time ?? ""} placeholder="50 min" />
            </Field>
            <Field label="Mensagem de agradecimento (cardápio e comanda)">
              <textarea className={`${textareaClass} min-h-16`} name="menu_footer_message" defaultValue={restaurant.menu_footer_message ?? ""} placeholder="Ex.: Agradecemos a sua preferência!" />
            </Field>
            <Field label="Sabores por pizza">
              <select className={inputClass} name="max_pizza_flavors" defaultValue={restaurant.max_pizza_flavors ?? 1}>
                <option value={1}>Somente 1 sabor</option>
                <option value={2}>Até 2 sabores</option>
                <option value={3}>Até 3 sabores</option>
                <option value={4}>Até 4 sabores</option>
              </select>
            </Field>
          </div>
          <p className={`mt-3 ${noteClass}`}>
            Para pizzas com mais de um sabor, o sistema sempre cobra o maior valor entre os sabores escolhidos.
          </p>
          <div className="mt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-ink-faint">Formas de pagamento aceitas no site</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["pix", "Pix"],
                ["cash", "Dinheiro"],
                ["credit_card", "Cartão de crédito"],
                ["debit_card", "Cartão de débito"],
              ].map(([value, label]) => (
                <label key={value} className={checkboxRowClass}>
                  <input
                    name="payment_methods"
                    type="checkbox"
                    value={value}
                    defaultChecked={(restaurant.payment_methods ?? ["pix", "cash", "credit_card", "debit_card"]).includes(value)}
                  />{" "}
                  {label}
                </label>
              ))}
            </div>
          </div>
          <SaveBar label="Salvar regras" />
            </ConfigSection>
          </TabPanel>

          <TabPanel id="impressao">
            <section id="impressao">
          <ConfigSection title="Impressão de pedidos" description="Clique em Imprimir teste: abre a janela de impressão do computador, já com as impressoras instaladas na lista. Escolha a sua e confirme — o navegador lembra a escolha.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Status da impressão">
                <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-[#403d38]">
                  <input name="printer_enabled" type="checkbox" defaultChecked={printerSettings.enabled ?? true} />
                  Impressão ativa
                </label>
              </Field>
              <Field label="Como imprimir">
                <select className={inputClass} name="printer_method" defaultValue={printerSettings.method === "thermal" ? "thermal" : "browser"}>
                  <option value="browser">Pelo navegador — funciona em qualquer computador (recomendado)</option>
                  <option value="thermal">Pelo agente local — impressão silenciosa (precisa instalar)</option>
                </select>
              </Field>
              <Field label="Testar e instalar">
                <a
                  href="/impressao"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-btn px-4 text-sm font-medium text-white transition hover:bg-btn-hover"
                >
                  Configurar impressora
                </a>
              </Field>
              <Field label="Impressora do agente local (opcional)">
                <PrinterDiscovery initialName={printerSettings.printer_name} />
              </Field>
              <Field label="Largura do papel">
                <select className={inputClass} name="printer_paper_width" defaultValue={String(printerSettings.paper_width ?? 80)}>
                  <option value="80">80 mm</option>
                  <option value="58">58 mm</option>
                </select>
              </Field>
              <Field label="Cópias por pedido">
                <input className={inputClass} name="printer_copies" type="number" min="1" max="5" defaultValue={printerSettings.copies ?? 1} />
              </Field>
              <Field label="Endereço da impressora">
                <input className={inputClass} name="printer_network_address" defaultValue={printerSettings.network_address ?? ""} placeholder="IP, porta ou caminho local" />
              </Field>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className={checkboxRowClass}>
                <input name="printer_auto_print" type="checkbox" defaultChecked={printerSettings.auto_print ?? false} />{" "}
                Imprimir automaticamente ao finalizar
              </label>
              <label className={checkboxRowClass}>
                <input name="printer_cut_paper" type="checkbox" defaultChecked={printerSettings.cut_paper ?? true} />{" "}
                Cortar papel ao final
              </label>
              <label className={checkboxRowClass}>
                <input name="printer_open_cash_drawer" type="checkbox" defaultChecked={printerSettings.open_cash_drawer ?? false} />{" "}
                Abrir gaveta de dinheiro
              </label>
            </div>
            <div className="mt-4">
              <Field label="Observações da impressora">
                <textarea className={`${textareaClass} min-h-16`} name="printer_notes" defaultValue={printerSettings.notes ?? ""} placeholder="Ex.: balcão, cozinha, usar papel 80 mm, imprimir 2 vias em horários de pico." />
              </Field>
            </div>
            <p className={`mt-3 ${noteClass}`}>
              <strong className="font-semibold text-[#403d38]">Não precisa instalar nada.</strong> A impressão pelo navegador funciona em qualquer
              computador e em qualquer navegador — quem lista as impressoras é a própria janela de impressão do Windows.{" "}
              <strong className="font-semibold text-[#403d38]">Quer que imprima sozinho, sem aparecer a janela?</strong>{" "}
              <a href="/downloads/PeriniFood-Balcao-Impressao.cmd" className="font-semibold text-brand underline">Baixe este atalho</a> e use o
              sistema por ele (Chrome em modo impressão direta).{" "}
              <a href="/docs/IMPRESSAO_NAVEGADOR.md" target="_blank" className="font-semibold text-brand underline">Ver guia</a>
            </p>
            <SaveBar label="Salvar impressão" />
          </ConfigSection>
            </section>
          </TabPanel>

          <TabPanel id="entrega">
            <ConfigSection title="Taxas de entrega por raio">
          <TabReturnTo />
          <DeliveryFeeRulesEditor rules={rules} />
          <SaveBar label="Salvar taxas de entrega" formAction={saveDeliveryFeeRules} />
            </ConfigSection>
          </TabPanel>
        </form>

        <form action={updatePassword}>
          <TabPanel id="seguranca">
            <ConfigSection title="Segurança da conta">
          {sp.password_success && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">Senha alterada com sucesso.</div>}
          {sp.password_error && <div className="mb-4 rounded-lg border border-brand-line bg-brand-soft p-3 text-sm font-medium text-brand">Não foi possível alterar a senha. Verifique os campos e tente novamente.</div>}
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Nova senha">
              <input className={inputClass} name="password" type="password" minLength={6} required />
            </Field>
            <Field label="Confirmar nova senha">
              <input className={inputClass} name="confirm_password" type="password" minLength={6} required />
            </Field>
          </div>
          <SaveBar label="Alterar senha" />
            </ConfigSection>
          </TabPanel>
        </form>
      </SettingsTabs>
    </div>
  );
}
