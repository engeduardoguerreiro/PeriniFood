/* eslint-disable @next/next/no-img-element */
import { saveDeliveryFeeRules, updatePassword, updateRestaurant } from "@/app/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { DeliveryFeeRulesEditor } from "@/components/delivery-fee-rules-editor";
import { OpeningHoursEditor } from "@/components/opening-hours-editor";
import { PrinterDiscovery } from "@/components/printer-discovery";
import { SettingsCepLookup } from "@/components/settings-cep-lookup";
import { requireRestaurant } from "@/lib/auth";
import { deliveryRulesFromRestaurant } from "@/lib/delivery-fee-rules";
import { isRestaurantOpen } from "@/lib/opening-hours";
import type { DeliveryFeeRule } from "@/lib/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="font-secondary text-[11px] font-bold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-slate-200 bg-[#e9e9e9] p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-bold text-slate-600">{title}</h2>
      {children}
    </section>
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
    <div className="space-y-6">
      <ActionFeedback status={sp.status} error={sp.error} />
      <form action={updateRestaurant} className="space-y-6">
        <ConfigSection title="Dados gerais da empresa">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Nome fantasia">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="name" defaultValue={restaurant.name} />
            </Field>
            <Field label="Razão social">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="legal_name" defaultValue={restaurant.legal_name ?? ""} placeholder="Razão social" />
            </Field>
            <Field label="Slug do cardápio">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="slug" defaultValue={restaurant.slug} />
            </Field>
            <Field label="E-mail principal">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="email" defaultValue={restaurant.email ?? ""} />
            </Field>
            <Field label="Telefone">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="phone" defaultValue={restaurant.phone ?? ""} />
            </Field>
            <Field label="WhatsApp">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="whatsapp" defaultValue={restaurant.whatsapp ?? ""} />
            </Field>
            <Field label="CNPJ">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="cnpj" defaultValue={restaurant.cnpj ?? ""} placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="Inscrição estadual">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="state_registration" defaultValue={restaurant.state_registration ?? ""} />
            </Field>
            <Field label="Endereço">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="address" defaultValue={restaurant.address ?? ""} />
            </Field>
            <Field label="Número">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="address_number" defaultValue={restaurant.address_number ?? ""} placeholder="N" />
            </Field>
            <Field label="Bairro">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="neighborhood" defaultValue={restaurant.neighborhood ?? ""} />
            </Field>
            <Field label="Cidade">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="city" defaultValue={restaurant.city ?? ""} />
            </Field>
            <Field label="UF">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="state" defaultValue={restaurant.state ?? ""} />
            </Field>
            <Field label="CEP">
              <SettingsCepLookup defaultValue={restaurant.zip_code} />
            </Field>
          </div>
          <button className="mt-4 w-full rounded bg-[#12c987] px-4 py-2 text-sm font-bold text-white">Salvar</button>
        </ConfigSection>

        <ConfigSection title="Dados para impressão e cardápio online">
          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <div className="space-y-3">
              <Field label="Logotipo 300 x 300">
                <input className="field-light h-11 rounded-none py-2 text-sm" name="logo_file" type="file" accept="image/png,image/jpeg,image/webp" />
              </Field>
              <input type="hidden" name="logo_url" value={restaurant.logo_url ?? ""} />
              <div className="grid h-[150px] w-[150px] place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-center text-xs font-bold text-slate-400">
                {restaurant.logo_url ? <img src={restaurant.logo_url} alt="Logotipo atual" className="h-full w-full object-cover" /> : "300 x 300"}
              </div>
              <p className="text-xs text-slate-500">Use PNG, JPG ou WEBP quadrado. O sistema salva e usa no cardápio online.</p>
            </div>

            <div className="space-y-3">
              <Field label="Banner do cardápio online 1600 x 500">
                <input className="field-light h-11 rounded-none py-2 text-sm" name="banner_file" type="file" accept="image/png,image/jpeg,image/webp" />
              </Field>
              <input type="hidden" name="cover_url" value={restaurant.cover_url ?? ""} />
              <input type="hidden" name="banner_url" value={restaurant.banner_url ?? restaurant.cover_url ?? ""} />
              <div className="grid aspect-[16/5] w-full place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-center text-sm font-bold text-slate-400">
                {restaurant.banner_url || restaurant.cover_url ? <img src={restaurant.banner_url ?? restaurant.cover_url ?? ""} alt="Banner atual" className="h-full w-full object-cover" /> : "1600 x 500"}
              </div>
              <p className="text-xs text-slate-500">Formato recomendado: 1600 x 500. Ele aparece no topo do cardápio público.</p>
            </div>

            <div className="space-y-3 lg:col-span-2">
              <Field label="Capa do site 1920 x 620">
                <input className="field-light h-11 rounded-none py-2 text-sm" name="site_cover_file" type="file" accept="image/png,image/jpeg,image/webp" />
              </Field>
              <input type="hidden" name="site_cover_url" value={restaurant.site_cover_url ?? ""} />
              <div className="grid aspect-[31/10] w-full place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-center text-sm font-bold text-slate-400">
                {restaurant.site_cover_url ? <img src={restaurant.site_cover_url} alt="Capa atual do site" className="h-full w-full object-cover" /> : "1920 x 620"}
              </div>
              <p className="text-xs text-slate-500">Essa imagem aparece como capa principal do cardápio online. Use uma arte larga, com boa leitura no centro.</p>
            </div>

            <Field label="Descrição">
              <textarea className="field-light min-h-24 rounded-none py-2 text-sm lg:col-span-2" name="description" defaultValue={restaurant.description ?? ""} />
            </Field>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <label className="font-secondary text-sm"><input name="delivery_enabled" type="checkbox" defaultChecked={restaurant.delivery_enabled} /> Delivery</label>
            <label className="font-secondary text-sm"><input name="pickup_enabled" type="checkbox" defaultChecked={restaurant.pickup_enabled} /> Retirada</label>
            <label className="font-secondary text-sm"><input name="table_service_enabled" type="checkbox" defaultChecked={restaurant.table_service_enabled} /> Atendimento em mesa</label>
          </div>
          <button className="mt-4 w-full rounded bg-[#12c987] px-4 py-2 text-sm font-bold text-white">Salvar</button>
        </ConfigSection>

        <ConfigSection title="Horário de funcionamento">
          <p className="mb-4 text-sm font-semibold text-slate-600">
            Configure os horários de segunda a domingo. O cardápio online bloqueia novos pedidos quando a loja estiver fechada.
          </p>
          <input type="hidden" name="is_open" value={restaurant.is_open ? "on" : ""} />
          <input type="hidden" name="manual_open_status" value={restaurant.manual_open_status ?? "auto"} />
          <p className="mb-4 rounded bg-slate-50 p-3 text-xs font-semibold text-slate-600">
            Status atual: {storeOpen ? "loja aberta" : "loja fechada"}. Altere abertura automática, manual ou desligamento direto no seletor da loja no topo.
          </p>
          <OpeningHoursEditor openingHours={restaurant.opening_hours} />
          <button className="mt-4 w-full rounded bg-[#12c987] px-4 py-2 text-sm font-bold text-white">Salvar horários</button>
        </ConfigSection>

        <ConfigSection title="Regras do cardápio">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Pedido mínimo">
              <input className="field-light h-11 rounded-xl py-2 text-sm" name="minimum_order" type="number" step="0.01" defaultValue={restaurant.minimum_order ?? 0} />
            </Field>
            <Field label="Taxa de entrega padrão">
              <input className="field-light h-11 rounded-xl py-2 text-sm" name="delivery_fee" type="number" step="0.01" defaultValue={restaurant.delivery_fee ?? 0} />
            </Field>
            <Field label="Tempo estimado">
              <input className="field-light h-11 rounded-xl py-2 text-sm" name="estimated_delivery_time" defaultValue={restaurant.estimated_delivery_time ?? ""} placeholder="50 min" />
            </Field>
            <Field label="Mensagem de rodapé">
              <textarea className="field-light min-h-20 rounded-xl py-2 text-sm" name="menu_footer_message" defaultValue={restaurant.menu_footer_message ?? ""} placeholder="Mensagem exibida no final do cardápio online." />
            </Field>
            <Field label="Sabores por pizza">
              <select className="field-light h-11 rounded-xl py-2 text-sm" name="max_pizza_flavors" defaultValue={restaurant.max_pizza_flavors ?? 1}>
                <option value={1}>Somente 1 sabor</option>
                <option value={2}>Até 2 sabores</option>
                <option value={3}>Até 3 sabores</option>
                <option value={4}>Até 4 sabores</option>
              </select>
            </Field>
          </div>
          <p className="mt-3 rounded bg-slate-50 p-3 text-xs font-semibold text-slate-600">
            Para pizzas com mais de um sabor, o sistema sempre cobra o maior valor entre os sabores escolhidos.
          </p>
          <div className="mt-4 rounded bg-white p-4">
            <h3 className="text-sm font-bold text-slate-700">Formas de pagamento aceitas no site</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              {[
                ["pix", "Pix"],
                ["cash", "Dinheiro"],
                ["credit_card", "Cartão de crédito"],
                ["debit_card", "Cartão de débito"],
              ].map(([value, label]) => (
                <label key={value} className="font-secondary text-sm">
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
          <button className="mt-4 w-full rounded bg-[#12c987] px-4 py-2 text-sm font-bold text-white">Salvar regras</button>
        </ConfigSection>

        <section id="impressao">
        <ConfigSection title="Impressão de pedidos">
          <p className="mb-4 text-sm font-semibold text-slate-600">
            Configure o agente local de impressão. O sistema verifica automaticamente se o serviço está ativo ao abrir o painel e antes de enviar qualquer pedido para a impressora.
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Status da impressão">
              <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                <input name="printer_enabled" type="checkbox" defaultChecked={printerSettings.enabled ?? true} />
                Impressão ativa
              </label>
            </Field>
            <Field label="Método de impressão">
              <select className="field-light h-11 rounded-xl py-2 text-sm" name="printer_method" defaultValue={printerSettings.method ?? "browser"}>
                <option value="browser">Navegador / window.print</option>
                <option value="thermal">Impressora térmica local</option>
                <option value="network">Impressora de rede / IP</option>
                <option value="fiscal">Impressora fiscal (preparado)</option>
              </select>
            </Field>
            <Field label="Nome da impressora">
              <PrinterDiscovery initialName={printerSettings.printer_name} />
            </Field>
            <Field label="Largura do papel">
              <select className="field-light h-11 rounded-xl py-2 text-sm" name="printer_paper_width" defaultValue={String(printerSettings.paper_width ?? 80)}>
                <option value="80">80 mm</option>
                <option value="58">58 mm</option>
              </select>
            </Field>
            <Field label="Cópias por pedido">
              <input className="field-light h-11 rounded-xl py-2 text-sm" name="printer_copies" type="number" min="1" max="5" defaultValue={printerSettings.copies ?? 1} />
            </Field>
            <Field label="Endereço da impressora">
              <input className="field-light h-11 rounded-xl py-2 text-sm" name="printer_network_address" defaultValue={printerSettings.network_address ?? ""} placeholder="IP, porta ou caminho local" />
            </Field>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
              <input name="printer_auto_print" type="checkbox" defaultChecked={printerSettings.auto_print ?? false} />{" "}
              Imprimir automaticamente ao finalizar pedido
            </label>
            <label className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
              <input name="printer_cut_paper" type="checkbox" defaultChecked={printerSettings.cut_paper ?? true} />{" "}
              Cortar papel ao final
            </label>
            <label className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
              <input name="printer_open_cash_drawer" type="checkbox" defaultChecked={printerSettings.open_cash_drawer ?? false} />{" "}
              Abrir gaveta de dinheiro
            </label>
          </div>
          <div className="mt-4">
            <Field label="Observações da impressora">
              <textarea className="field-light min-h-20 rounded-xl py-2 text-sm" name="printer_notes" defaultValue={printerSettings.notes ?? ""} placeholder="Ex.: balcão, cozinha, usar papel 80 mm, imprimir 2 vias em horários de pico." />
            </Field>
          </div>
          <p className="mt-3 rounded bg-slate-50 p-3 text-xs font-semibold text-slate-600">
            Para produção, instale o agente local com inicialização automática no Windows. Assim o cliente não precisa abrir terminal para imprimir.
          </p>
          <button className="mt-4 w-full rounded bg-[#12c987] px-4 py-2 text-sm font-bold text-white">Salvar impressão</button>
        </ConfigSection>
        </section>

        <ConfigSection title="Taxas de entrega por raio">
          <input type="hidden" name="return_to" value="/configuracoes" />
          <DeliveryFeeRulesEditor rules={rules} />
          <button formAction={saveDeliveryFeeRules} className="mt-4 w-full rounded bg-[#12c987] px-4 py-2 text-sm font-bold text-white">Salvar taxas de entrega</button>
        </ConfigSection>
      </form>

      <form action={updatePassword}>
        <ConfigSection title="Segurança da conta">
          {sp.password_success && <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">Senha alterada com sucesso.</div>}
          {sp.password_error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">Não foi possível alterar a senha. Verifique os campos e tente novamente.</div>}
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Nova senha">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="password" type="password" minLength={6} required />
            </Field>
            <Field label="Confirmar nova senha">
              <input className="field-light h-9 rounded-none py-1 text-sm" name="confirm_password" type="password" minLength={6} required />
            </Field>
          </div>
          <button className="mt-4 w-full rounded bg-[#12c987] px-4 py-2 text-sm font-bold text-white">Alterar senha</button>
        </ConfigSection>
      </form>
    </div>
  );
}
