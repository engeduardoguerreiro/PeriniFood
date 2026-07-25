"use client";

import { MapPin, Minus, Pencil, Plus, Printer, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPdvOrder } from "@/app/actions";
import { money } from "@/lib/utils";
import type { Category, Customer, DeliveryFeeRule, PizzaOption, Product, ProductOption, ProductOptionItem, ProductType, ProductVariant, Restaurant } from "@/lib/types";

type SelectedOption = { name: string; price: number };
type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variantId: string | null;
  variantName: string | null;
  flavorCount: number;
  flavors: string[];
  dough: SelectedOption | null;
  crust: SelectedOption | null;
  additions: SelectedOption[];
  notes: string;
  confirmed: boolean;
};
type Address = { cep: string; street: string; neighborhood: string; city: string; state: string; number: string; complement: string; reference: string };
type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  footway?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  postcode?: string;
};
type CustomerMatch = Pick<Customer, "id" | "name" | "phone" | "whatsapp" | "address" | "address_number" | "neighborhood" | "complement" | "reference" | "city" | "state" | "zip_code">;
type ManualOrderInitialData = {
  orderId?: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  type?: string | null;
  paymentMethod?: string | null;
  changeFor?: number | null;
  discount?: number | null;
  deliveryFee?: number | null;
  address?: Partial<Address> | null;
  notes?: string | null;
  cart?: CartItem[];
};

const emptyAddress: Address = { cep: "", street: "", neighborhood: "", city: "", state: "", number: "", complement: "", reference: "" };

function fullAddress(address: Address) {
  return [
    address.street,
    address.number && `n ${address.number}`,
    address.neighborhood,
    address.city && `${address.city}/${address.state}`,
    address.complement && `Compl.: ${address.complement}`,
    address.reference && `Ref.: ${address.reference}`,
    address.cep && `CEP ${address.cep}`,
  ].filter(Boolean).join(" - ");
}

function optionKind(groupName: string) {
  if (groupName === "Tipos de Massas") return "massa";
  if (groupName === "Bordas") return "borda";
  return "adicional";
}

function groupOptions(options: ProductOption[], productId: string, groupName: string, pizzaOptions: PizzaOption[]) {
  if (groupName === "Bordas") {
    return pizzaOptions
      .filter((option) => option.active && option.kind === "borda")
      .map((option) => ({
        id: option.id,
        restaurant_id: option.restaurant_id,
        option_id: option.id,
        name: option.name,
        additional_price: option.price,
        active: option.active,
        created_at: option.created_at,
      })) as ProductOptionItem[];
  }

  const group = options.find((option) => option.product_id === productId && option.name === groupName);
  const activeOptions = new Map(pizzaOptions.filter((option) => option.active && option.kind === optionKind(groupName)).map((option) => [option.name, option]));
  return (group?.product_option_items ?? [])
    .filter((item) => item.active && activeOptions.has(item.name))
    .map((item) => ({
      ...item,
      additional_price: activeOptions.get(item.name)?.price ?? item.additional_price,
    })) as ProductOptionItem[];
}

function flavorChoices(product: Product | undefined, products: Product[]) {
  if (!product?.category_id) return product ? [product] : [];
  return products
    .filter((item) => item.category_id === product.category_id && item.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function itemTotal(item: CartItem) {
  const extras = Number(item.dough?.price ?? 0) + Number(item.crust?.price ?? 0) + item.additions.reduce((sum, addition) => sum + Number(addition.price ?? 0), 0);
  return (Number(item.price) + extras) * item.quantity;
}

function deliveryRuleLabel(rule: DeliveryFeeRule) {
  const range = rule.max_km === null ? `a partir de ${rule.min_km} km` : `${rule.min_km} a ${rule.max_km} km`;
  return `${rule.name || range} - ${range} - ${rule.free_delivery ? "grátis" : money(rule.fee)}`;
}

function chooseRuleByDistance(rules: DeliveryFeeRule[], distanceKm: number) {
  return [...rules]
    .sort((a, b) => Number(a.max_km ?? 9999) - Number(b.max_km ?? 9999))
    .find((rule) => distanceKm >= Number(rule.min_km ?? 0) && (rule.max_km === null || distanceKm <= Number(rule.max_km)));
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRad(b.lat - a.lat);
  const deltaLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

async function geocodeAddress(query: string) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
  const data = await response.json() as Array<{ lat: string; lon: string }>;
  const first = data[0];
  if (!first.lat || !first.lon) return null;
  return { lat: Number(first.lat), lon: Number(first.lon) };
}

async function findAddressByText(query: string) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(query)}`);
  const data = await response.json() as Array<{ address?: NominatimAddress }>;
  return data[0]?.address ?? null;
}

function productBasePrice(product: Product, variants: ProductVariant[]) {
  const productVariants = variants.filter((variant) => variant.product_id === product.id && variant.active);
  if (productVariants.length) return Math.min(...productVariants.map((variant) => Number(variant.price)));
  return Number(product.price);
}

function flavorPrice(flavorName: string, variantName: string | null | undefined, products: Product[], variants: ProductVariant[], fallback: number) {
  const flavorProduct = products.find((product) => product.name === flavorName);
  if (!flavorProduct) return fallback;
  const flavorVariants = variants.filter((variant) => variant.product_id === flavorProduct.id && variant.active);
  const sameSize = flavorVariants.find((variant) => variant.name === variantName);
  if (sameSize) return Number(sameSize.price);
  if (flavorVariants.length) return Math.min(...flavorVariants.map((variant) => Number(variant.price)));
  return Number(flavorProduct.price ?? fallback);
}

function highestFlavorPrice(flavors: string[] | undefined, variantName: string | null | undefined, products: Product[], variants: ProductVariant[], fallback: number) {
  const selected = flavors?.length ? flavors : [];
  if (!selected.length) return fallback;
  return Math.max(...selected.map((flavor) => flavorPrice(flavor, variantName, products, variants, fallback)));
}

function normalizeLabel(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function onlyDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function stateCode(value: string | null | undefined) {
  const normalized = normalizeLabel(value).trim();
  const states: Record<string, string> = {
    ac: "AC", acre: "AC",
    al: "AL", alagoas: "AL",
    ap: "AP", amapa: "AP",
    am: "AM", amazonas: "AM",
    ba: "BA", bahia: "BA",
    ce: "CE", ceara: "CE",
    df: "DF", "distrito federal": "DF",
    es: "ES", "espirito santo": "ES",
    go: "GO", goias: "GO",
    ma: "MA", maranhao: "MA",
    mt: "MT", "mato grosso": "MT",
    ms: "MS", "mato grosso do sul": "MS",
    mg: "MG", "minas gerais": "MG",
    pa: "PA", para: "PA",
    pb: "PB", paraiba: "PB",
    pr: "PR", parana: "PR",
    pe: "PE", pernambuco: "PE",
    pi: "PI", piaui: "PI",
    rj: "RJ", "rio de janeiro": "RJ",
    rn: "RN", "rio grande do norte": "RN",
    rs: "RS", "rio grande do sul": "RS",
    ro: "RO", rondonia: "RO",
    rr: "RR", roraima: "RR",
    sc: "SC", "santa catarina": "SC",
    sp: "SP", "sao paulo": "SP",
    se: "SE", sergipe: "SE",
    to: "TO", tocantins: "TO",
  };
  return states[normalized] ?? (value ?? "").toUpperCase();
}

export function ManualOrderBuilder({
  action = createPdvOrder,
  mode = "create",
  initialData = {},
  restaurant,
  products,
  types,
  categories,
  variants,
  options,
  defaultDeliveryFee,
  deliveryRules,
  maxPizzaFlavors,
  pizzaOptions,
}: {
  action?: (formData: FormData) => void | Promise<void>;
  mode?: "create" | "edit";
  initialData?: ManualOrderInitialData;
  restaurant: Pick<Restaurant, "address" | "address_number" | "neighborhood" | "city" | "state" | "zip_code">;
  products: Product[];
  types: ProductType[];
  categories: Category[];
  variants: ProductVariant[];
  options: ProductOption[];
  defaultDeliveryFee: number;
  deliveryRules: DeliveryFeeRule[];
  maxPizzaFlavors: number;
  pizzaOptions: PizzaOption[];
}) {
  const [cart, setCart] = useState<CartItem[]>(initialData.cart ?? []);
  const [draft, setDraft] = useState<CartItem | null>(null);
  const [selectedType, setSelectedType] = useState("all");
  const [search, setSearch] = useState("");
  const [orderType, setOrderType] = useState(initialData.type === "dine_in" ? "pickup" : initialData.type ?? "pickup");
  const [deliveryRuleId, setDeliveryRuleId] = useState(deliveryRules[0].id ?? "");
  const [deliveryCalculating, setDeliveryCalculating] = useState(false);
  const [discount, setDiscount] = useState(Number(initialData.discount ?? 0));
  const [address, setAddress] = useState<Address>({ ...emptyAddress, ...(initialData.address ?? {}) });
  const [addressStatus, setAddressStatus] = useState("");
  const [customerId, setCustomerId] = useState(initialData.customerId ?? "");
  const [customerName, setCustomerName] = useState(initialData.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialData.customerPhone ?? "");
  const [customerMatches, setCustomerMatches] = useState<CustomerMatch[]>([]);
  const [customerLookupStatus, setCustomerLookupStatus] = useState("");
  const [showCustomerMatches, setShowCustomerMatches] = useState(false);
  const hasOpenItems = false;
  const activeCategoryIds = useMemo(() => new Set(categories.map((category) => category.id)), [categories]);
  const visibleProducts = useMemo(() => products.filter((product) => product.category_id && activeCategoryIds.has(product.category_id)), [products, activeCategoryIds]);
  const visibleCategoryIds = useMemo(() => new Set(visibleProducts.map((product) => product.category_id).filter(Boolean)), [visibleProducts]);
  const visibleCategories = useMemo(() => categories.filter((category) => visibleCategoryIds.has(category.id)), [categories, visibleCategoryIds]);
  const draftProduct = draft ? visibleProducts.find((product) => product.id === draft.id) : null;
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const typeById = useMemo(() => new Map(types.map((type) => [type.id, type])), [types]);

  function isPizzaProduct(product: Product | undefined | null) {
    if (!product) return false;
    const categoryName = product.category_id ? categoryById.get(product.category_id)?.name ?? "" : "";
    const typeName = product.product_type_id ? typeById.get(product.product_type_id)?.name ?? "" : "";
    return normalizeLabel(categoryName).includes("pizza") || normalizeLabel(typeName).includes("pizza");
  }

  const filteredProducts = useMemo(() => visibleProducts.filter((product) => {
    const matchesType = selectedType === "all" || product.category_id === selectedType;
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  }), [visibleProducts, search, selectedType]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + itemTotal(item), 0), [cart]);
  const selectedDeliveryRule = deliveryRules.find((rule) => rule.id === deliveryRuleId);
  const selectedRuleFee = selectedDeliveryRule ? (selectedDeliveryRule.free_delivery ? 0 : Number(selectedDeliveryRule.fee ?? 0)) : Number(defaultDeliveryFee ?? 0);
  const addressIsComplete = Boolean(address.street && address.number && address.neighborhood && address.city && address.state);
  const deliveryFee = orderType === "delivery" ? (addressIsComplete ? selectedRuleFee : Number(initialData.deliveryFee ?? 0)) : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  async function calculateDeliveryRule(nextAddress: Address, messagePrefix = "Endereço encontrado.") {
    if (orderType !== "delivery") return;
    if (!deliveryRules.length) {
      setAddressStatus(`${messagePrefix} Taxa padrão aplicada.`);
      return;
    }
    if (!nextAddress.street || !nextAddress.number || !nextAddress.neighborhood || !nextAddress.city || !nextAddress.state) {
      setAddressStatus(`${messagePrefix} Informe o número para calcular o raio automaticamente.`);
      return;
    }

    if (onlyDigits(restaurant.zip_code) && onlyDigits(restaurant.zip_code) === onlyDigits(nextAddress.cep)) {
      const rule = chooseRuleByDistance(deliveryRules, 0);
      if (rule) setDeliveryRuleId(rule.id);
      setAddressStatus(`${messagePrefix} Distncia estimada: 0 km. Frete aplicado automaticamente.`);
      return;
    }

    setDeliveryCalculating(true);
    try {
      const customerQuery = `${nextAddress.street}, ${nextAddress.number}, ${nextAddress.neighborhood}, ${nextAddress.city}, ${nextAddress.state}, Brasil`;
      const restaurantQuery = `${restaurant.address ?? ""}, ${restaurant.address_number ?? ""}, ${restaurant.neighborhood ?? ""}, ${restaurant.city ?? ""}, ${restaurant.state ?? ""}, ${restaurant.zip_code ?? ""}, Brasil`;
      const [customerCoords, restaurantCoords] = await Promise.all([geocodeAddress(customerQuery), geocodeAddress(restaurantQuery)]);
      if (customerCoords && restaurantCoords) {
        const distanceKm = haversineKm(restaurantCoords, customerCoords);
        const rule = chooseRuleByDistance(deliveryRules, distanceKm);
        if (rule) {
          setDeliveryRuleId(rule.id);
          setAddressStatus(`${messagePrefix} Distncia estimada: ${distanceKm.toFixed(1)} km. Frete aplicado automaticamente.`);
          return;
        }
        setAddressStatus(`${messagePrefix} Distncia estimada: ${distanceKm.toFixed(1)} km, fora das faixas cadastradas.`);
        return;
      }
      setAddressStatus(`${messagePrefix} Não foi possível estimar a distância. Taxa padrão aplicada.`);
    } catch {
      setAddressStatus(`${messagePrefix} Não foi possível estimar a distância. Taxa padrão aplicada.`);
    } finally {
      setDeliveryCalculating(false);
    }
  }

  function applyCustomer(customer: CustomerMatch, status = "Cliente encontrado e preenchido automaticamente.") {
    setCustomerId(customer.id);
    setCustomerName(customer.name ?? "");
    setCustomerPhone(customer.whatsapp || customer.phone || "");
    setCustomerMatches([]);
    setShowCustomerMatches(false);
    setCustomerLookupStatus(status);
    setAddress((current) => ({
      cep: customer.zip_code || current.cep,
      street: customer.address || current.street,
      neighborhood: customer.neighborhood || current.neighborhood,
      city: customer.city || current.city,
      state: customer.state || current.state,
      number: customer.address_number || current.number,
      complement: customer.complement || current.complement,
      reference: customer.reference || current.reference,
    }));
  }

  useEffect(() => {
    const nameTerm = customerName.trim();
    const phoneTerm = onlyDigits(customerPhone);
    const queryTerm = phoneTerm.length >= 3 ? phoneTerm : nameTerm;
    if (queryTerm.length < 2) {
      setCustomerMatches([]);
      setShowCustomerMatches(false);
      setCustomerLookupStatus("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCustomerLookupStatus("Buscando cliente...");
      try {
        const response = await fetch(`/api/customers?q=${encodeURIComponent(queryTerm)}`, { signal: controller.signal });
        const payload = await response.json() as { ok: boolean; data: CustomerMatch[] };
        const matches = payload.ok ? payload.data ?? [] : [];
        const normalizedName = normalizeLabel(nameTerm);
        const exact = matches.find((customer) => {
          const samePhone = phoneTerm.length >= 7 && [customer.phone, customer.whatsapp].some((value) => onlyDigits(value) === phoneTerm);
          const sameName = normalizedName.length >= 3 && normalizeLabel(customer.name) === normalizedName;
          return samePhone || sameName;
        });
        if (exact || matches.length === 1 || (phoneTerm.length >= 7 && matches[0])) {
          applyCustomer(exact ?? matches[0]);
          return;
        }
        setCustomerMatches(matches.slice(0, 5));
        setShowCustomerMatches(matches.length > 0);
        setCustomerLookupStatus(matches.length ? "Selecione o cliente encontrado." : "Nenhum cliente encontrado. O cadastro será criado ao finalizar.");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setCustomerLookupStatus("Não foi possível buscar o cliente agora.");
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [customerName, customerPhone]);

  useEffect(() => {
    if (!customerLookupStatus) return;
    if (customerLookupStatus === "Buscando cliente...") return;
    if (showCustomerMatches && customerMatches.length > 0) return;

    const timer = window.setTimeout(() => {
      setCustomerLookupStatus("");
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [customerLookupStatus, showCustomerMatches, customerMatches.length]);

  useEffect(() => {
    if (orderType !== "delivery" || !addressIsComplete) return;
    const timer = window.setTimeout(() => {
      void calculateDeliveryRule(address, "Endereço completo.");
    }, 650);
    return () => window.clearTimeout(timer);
  }, [address.street, address.number, address.neighborhood, address.city, address.state, address.cep, orderType, addressIsComplete]);

  function openProduct(product: Product) {
    const isPizza = isPizzaProduct(product);
    const productVariants = variants.filter((variant) => variant.product_id === product.id && variant.active);
    const defaultVariant = productVariants[0];
    const dough = isPizza ? groupOptions(options, product.id, "Tipos de Massas", pizzaOptions) : [];
    setDraft({
      id: product.id,
      name: product.name,
      price: Number(defaultVariant?.price ?? product.price),
      quantity: 1,
      variantId: defaultVariant?.id ?? null,
      variantName: defaultVariant?.name ?? null,
      flavorCount: isPizza ? 1 : 0,
      flavors: isPizza ? [product.name] : [],
      dough: dough.length === 1 ? { name: dough[0].name, price: Number(dough[0].additional_price) } : null,
      crust: null,
      additions: [],
      notes: "",
      confirmed: true,
    });
  }

  function confirmDraft() {
    if (!draft) return;
    setCart((current) => [...current, { ...draft, confirmed: true }]);
    setDraft(null);
  }

  function update(index: number, patch: Partial<CartItem>) {
    setCart((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item).filter((item) => item.quantity > 0));
  }

  async function lookupCep() {
    const cep = address.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      setAddressStatus("Informe um CEP com 8 dígitos.");
      return;
    }
    setAddressStatus("Buscando endereço...");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json() as { erro: boolean; logradouro: string; bairro: string; localidade: string; uf: string };
      if (data.erro) {
        setAddressStatus("CEP não encontrado.");
        return;
      }
      const nextAddress = {
        ...address,
        street: data.logradouro ?? address.street,
        neighborhood: data.bairro ?? address.neighborhood,
        city: data.localidade ?? address.city,
        state: data.uf ?? address.state,
      };
      setAddress((current) => ({
        ...current,
        ...nextAddress,
      }));
      await calculateDeliveryRule(nextAddress);
    } catch {
      setAddressStatus("Não foi possível consultar o CEP agora.");
    }
  }

  async function lookupTypedAddress() {
    const street = address.street.trim();
    if (street.length < 3) {
      setAddressStatus("Digite o endereço antes de buscar.");
      return;
    }

    const query = [
      street,
      address.number,
      address.neighborhood,
      address.city || restaurant.city,
      address.state || restaurant.state,
      "Brasil",
    ].filter(Boolean).join(", ");

    setAddressStatus("Buscando endereço...");
    try {
      const found = await findAddressByText(query);
      if (!found) {
        setAddressStatus("Endereço não encontrado. Informe CEP, bairro ou número para melhorar a busca.");
        return;
      }

      const nextAddress = {
        ...address,
        cep: found.postcode ?? address.cep,
        street: found.road ?? found.pedestrian ?? found.footway ?? address.street,
        number: address.number || found.house_number || "",
        neighborhood: found.suburb ?? found.neighbourhood ?? found.city_district ?? address.neighborhood,
        city: found.city ?? found.town ?? found.village ?? found.municipality ?? address.city ?? restaurant.city ?? "",
        state: stateCode(found.state ?? address.state ?? restaurant.state),
      };

      setAddress(nextAddress);
      await calculateDeliveryRule(nextAddress, "Endereço localizado.");
    } catch {
      setAddressStatus("Não foi possível buscar o endereço agora.");
    }
  }

  function handleAddressEnter(event: KeyboardEvent<HTMLInputElement>, lookup: () => Promise<void>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void lookup();
  }

  return (
    <form action={action} className="space-y-5">
      {initialData.orderId && <input type="hidden" name="order_id" value={initialData.orderId} />}
      <input type="hidden" name="cart" value={JSON.stringify(cart)} />
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="delivery_fee" value={deliveryFee} />
      <input type="hidden" name="delivery_rule_id" value={deliveryRuleId} />
      <input type="hidden" name="delivery_address" value={fullAddress(address)} />
      <input type="hidden" name="discount" value={discount} />

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{mode === "edit" ? "Editar pedido" : "Novo pedido manual"}</h2>
            <p className="text-sm text-slate-500">{mode === "edit" ? "Ajuste cliente, entrega, pagamento e itens do pedido." : "Use para balcão, retirada e delivery manual."}</p>
          </div>
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">Taxa atual: {money(defaultDeliveryFee)}</span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="relative grid gap-3 md:col-span-2 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-500">Cliente</span>
              <input
                className="field-light"
                name="customer_name"
                placeholder="Nome do cliente"
                value={customerName}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  setCustomerId("");
                  setCustomerLookupStatus("");
                  setShowCustomerMatches(true);
                }}
                autoComplete="off"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-500">Telefone/WhatsApp</span>
              <input
                className="field-light"
                name="customer_phone"
                placeholder="11999999999"
                value={customerPhone}
                onChange={(event) => {
                  setCustomerPhone(event.target.value);
                  setCustomerId("");
                  setCustomerLookupStatus("");
                  setShowCustomerMatches(true);
                }}
                autoComplete="off"
              />
            </label>
            {(customerLookupStatus || (showCustomerMatches && customerMatches.length > 0)) && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {customerMatches.length > 0 && showCustomerMatches ? (
                  <div className="space-y-1">
                    {customerMatches.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => applyCustomer(customer, "Cliente selecionado.")}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-red-50"
                      >
                        <span>
                          <strong className="block text-slate-900">{customer.name}</strong>
                          <span className="text-xs text-slate-500">{customer.whatsapp || customer.phone || "Sem telefone"}</span>
                        </span>
                        <span className="text-xs font-black text-[#E50914]">Usar</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {customerLookupStatus && <p className="px-3 py-2 text-xs font-bold text-slate-500">{customerLookupStatus}</p>}
              </div>
            )}
          </div>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase text-slate-500">Tipo do pedido</span>
            <select className="field-light" name="type" value={orderType} onChange={(event) => setOrderType(event.target.value)}>
              <option value="pickup">Retirada</option>
              <option value="delivery">Delivery</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase text-slate-500">Pagamento</span>
            <select className="field-light" name="payment_method" defaultValue={initialData.paymentMethod ?? "pix"}>
              <option value="cash">Dinheiro</option>
              <option value="credit_card">Crédito</option>
              <option value="debit_card">Débito</option>
              <option value="pix">Pix</option>
              <option value="other">Outro</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase text-slate-500">Desconto</span>
            <input className="field-light" type="number" step="0.01" min="0" value={discount || ""} onChange={(event) => setDiscount(Number(event.target.value || 0))} placeholder="0,00" />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-bold uppercase text-slate-500">Frete automático</span>
            <div className="field-light flex min-h-14 items-center text-sm font-bold text-slate-700">
              {orderType !== "delivery"
                ? "Sem entrega para retirada ou balcão"
                : deliveryCalculating
                  ? "Calculando distância entre a loja e o cliente..."
                  : addressIsComplete
                    ? selectedDeliveryRule
                      ? deliveryRuleLabel(selectedDeliveryRule)
                      : `Taxa padrão - ${money(defaultDeliveryFee)}`
                    : "Preencha CEP, endereço, bairro, cidade, UF e número"}
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase text-slate-500">Troco para</span>
            <input className="field-light" name="change_for" type="number" step="0.01" defaultValue={initialData.changeFor ?? ""} placeholder="Opcional" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase text-slate-500">Observação do cliente</span>
            <input className="field-light" name="customer_notes" placeholder="Ex.: sem cebola" />
          </label>
        </div>

        {orderType === "delivery" && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 font-black"><MapPin className="h-5 w-5 text-red-600" /> Endereço de entrega</div>
            <div className="grid gap-3 md:grid-cols-6">
              <input className="field-light md:col-span-2" value={address.cep} onChange={(event) => setAddress({ ...address, cep: event.target.value })} onKeyDown={(event) => handleAddressEnter(event, lookupCep)} placeholder="CEP" />
              <input className="field-light md:col-span-4" value={address.street} onChange={(event) => setAddress({ ...address, street: event.target.value })} onKeyDown={(event) => handleAddressEnter(event, lookupTypedAddress)} placeholder="Endereço" />
              <input className="field-light" value={address.number} onChange={(event) => setAddress({ ...address, number: event.target.value })} placeholder="Número" />
              <input className="field-light md:col-span-2" value={address.neighborhood} onChange={(event) => setAddress({ ...address, neighborhood: event.target.value })} placeholder="Bairro" />
              <input className="field-light md:col-span-2" value={address.complement} onChange={(event) => setAddress({ ...address, complement: event.target.value })} placeholder="Complemento" />
              <input className="field-light md:col-span-2" value={address.reference} onChange={(event) => setAddress({ ...address, reference: event.target.value })} placeholder="Ponto de referencia" />
            </div>
            {addressStatus && <p className="mt-2 text-sm font-semibold text-slate-600">{addressStatus}</p>}
            {fullAddress(address) && <p className="mt-3 rounded bg-white p-3 text-sm text-slate-600">Endereço: {fullAddress(address)}. Frete calculado: {money(deliveryFee)}</p>}
          </div>
        )}

        <textarea className="field-light mt-4" name="notes" defaultValue={initialData.notes ?? ""} placeholder="Observações do pedido" />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex max-h-[calc(100vh-140px)] min-h-[620px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid items-center gap-4 border-b border-slate-100 bg-white px-5 py-4 md:grid-cols-[1fr_minmax(280px,460px)]">
            <div>
              <h3 className="text-lg font-black">Itens do pedido</h3>
              <p className="text-sm text-slate-500">Busque, filtre e clique no item para personalizar ou adicionar.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none focus:border-red-300"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Busque por um item"
              />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <button type="button" onClick={() => setSelectedType("all")} className={selectedType === "all" ? "shrink-0 rounded-full bg-[#E50914] px-4 py-2 text-sm font-black text-white shadow-sm" : "shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-[#E50914]"}>Todos</button>
            {visibleCategories.map((category) => (
              <button key={category.id} type="button" onClick={() => setSelectedType(category.id)} className={selectedType === category.id ? "shrink-0 rounded-full bg-[#E50914] px-4 py-2 text-sm font-black text-white shadow-sm" : "shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-[#E50914]"}>{category.name}</button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_120px_120px_112px] border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase text-slate-500 max-lg:hidden">
            <span>Produto</span>
            <span>Categoria</span>
            <span className="text-right">Preço</span>
            <span className="text-right">Ação</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredProducts.map((product) => {
              const activeVariants = variants.filter((variant) => variant.product_id === product.id && variant.active);
              const isPizza = isPizzaProduct(product);
              const hasOptions = Boolean((isPizza && groupOptions(options, product.id, "Bordas", pizzaOptions).length) || (isPizza && groupOptions(options, product.id, "Tipos de Massas", pizzaOptions).length) || groupOptions(options, product.id, "Adicionais", pizzaOptions).length || activeVariants.length);
              const productCategory = visibleCategories.find((category) => category.id === product.category_id)?.name ?? types.find((type) => type.id === product.product_type_id)?.name ?? "Produto";
              return (
              <button
                key={product.id}
                type="button"
                onClick={() => openProduct(product)}
                className="group grid w-full grid-cols-[64px_minmax(0,1fr)] gap-4 border-b border-slate-100 px-5 py-3 text-left transition duration-150 hover:bg-red-50/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-300 lg:grid-cols-[64px_minmax(0,1fr)_120px_120px_112px] lg:items-center"
              >
                <div className="h-14 w-14 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-100">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-110" />
                  ) : (
                    <div className="grid h-full place-items-center text-[10px] font-bold text-slate-400 transition group-hover:text-[#E50914]">Sem foto</div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[15px] font-black text-slate-950 group-hover:text-[#E50914]">{product.name}</p>
                    {hasOptions && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-[#E50914]">Personalizar</span>}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm leading-5 text-slate-500">{product.description || "Produto pronto para venda."}</p>
                  <p className="mt-2 text-sm text-slate-700 lg:hidden">
                    {activeVariants.length ? "A partir de " : ""}<strong>{money(productBasePrice(product, variants))}</strong>
                  </p>
                </div>
                <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-center text-xs font-bold text-slate-600 lg:block">{productCategory}</span>
                <span className="hidden text-right text-sm text-slate-700 lg:block">
                  {activeVariants.length ? <span className="mr-1 text-xs text-slate-400">A partir de</span> : null}
                  <strong>{money(productBasePrice(product, variants))}</strong>
                </span>
                <span className="hidden items-center justify-end gap-2 text-right lg:flex">
                  <span className="inline-flex h-9 items-center justify-center rounded-lg bg-[#E50914] px-3 text-xs font-black text-white shadow-sm transition group-hover:bg-red-700">
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Adicionar
                  </span>
                </span>
              </button>
              );
            })}
            {!filteredProducts.length && <p className="m-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nenhum produto encontrado nesse filtro.</p>}
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-[#0F1720]/10 bg-white p-4 text-[#0F1720] shadow-sm lg:sticky lg:top-24">
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-lg font-black"><ShoppingCart className="h-5 w-5 text-[#E50914]" /> Carrinho</span>
            <span className="rounded-lg bg-red-50 px-3 py-1 text-xs font-black text-[#E50914]">{cart.length} item{cart.length === 1 ? "" : "s"}</span>
          </div>
          <div className="space-y-3">
            {cart.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Adicione produtos para finalizar.</p>}
            {cart.map((item, index) => {
              const product = products.find((row) => row.id === item.id);
              const productVariants = variants.filter((variant) => variant.product_id === item.id && variant.active);
              const isPizza = isPizzaProduct(product);
              const dough = isPizza ? groupOptions(options, item.id, "Tipos de Massas", pizzaOptions) : [];
              const crusts = isPizza ? groupOptions(options, item.id, "Bordas", pizzaOptions) : [];
              const additions = groupOptions(options, item.id, "Adicionais", pizzaOptions);
              const maxFlavors = isPizza ? Math.min(4, Math.max(1, Number(maxPizzaFlavors ?? 1))) : 1;
              const flavorOptions = isPizza ? flavorChoices(product, products) : [];
              const flavorSelectionInvalid = isPizza && Number(item.flavorCount ?? 1) > 1 && (item.flavors.length ?? 0) !== Number(item.flavorCount ?? 1);
              return (
              <div key={`${item.id}-${index}`} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{item.name}{item.variantName ? ` - ${item.variantName}` : ""}</p>
                    <p className="text-sm text-slate-500">{money(itemTotal(item))}</p>
                  </div>
                  <button type="button" onClick={() => update(index, { quantity: 0 })} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => update(index, { quantity: item.quantity - 1 })} className="rounded-lg border p-2"><Minus className="h-3 w-3" /></button>
                  <span className="w-8 text-center font-bold">{item.quantity}</span>
                  <button type="button" onClick={() => update(index, { quantity: item.quantity + 1 })} className="rounded-lg border p-2"><Plus className="h-3 w-3" /></button>
                </div>

                {item.confirmed ? (
                  <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                    {item.flavors && item.flavors.length > 1 && <span className="mb-2 block">Sabores: {item.flavors.join(" / ")}</span>}
                    {item.dough?.name && <span className="block">Massa: {item.dough.name}</span>}
                    {item.crust?.name && <span className="block">Borda: {item.crust.name} {item.crust.price ? `+ ${money(item.crust.price)}` : ""}</span>}
                    {item.additions.length > 0 && <span className="block">Adicionais: {item.additions.map((addition) => addition.name).join(", ")}</span>}
                    {item.notes && <span className="block">Obs.: {item.notes}</span>}
                    <button
                      type="button"
                      onClick={() => update(index, { confirmed: false })}
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-black text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
                    >
                      <Pencil className="h-3 w-3" />
                      Editar item
                    </button>
                  </div>
                ) : (
                  <>
                {isPizza && maxFlavors > 1 && (
                  <div className="mt-3 rounded-xl border border-slate-100 p-3 text-sm">
                    <span className="mb-2 block font-bold">Sabores da pizza</span>
                    <select
                      className="field-light h-10 py-1 text-sm"
                      value={item.flavorCount ?? 1}
                      onChange={(event) => {
                        const count = Number(event.target.value);
                        const nextFlavors = [product?.name ?? item.name];
                        update(index, {
                          flavorCount: count,
                          flavors: nextFlavors,
                        price: highestFlavorPrice(nextFlavors, item.variantName, products, variants, item.price),
                        });
                      }}
                    >
                      {Array.from({ length: maxFlavors }, (_, flavorIndex) => flavorIndex + 1).map((count) => (
                        <option key={count} value={count}>{count} sabor{count > 1 ? "es" : ""}</option>
                      ))}
                    </select>
                    <div className="mt-2 grid gap-2">
                      {flavorOptions.map((flavor) => {
                        const selected = item.flavors.includes(flavor.name) ?? false;
                        const limit = Number(item.flavorCount ?? 1);
                        return (
                          <label key={flavor.id} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
                            <span>{flavor.name}</span>
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={!selected && (item.flavors.length ?? 0) >= limit}
                              onChange={(event) => {
                                const current = (item.flavors ?? []).filter((name) => name !== flavor.name);
                        const next = event.target.checked ? [...current, flavor.name].slice(0, limit) : current;
                                const pricedFlavors = next.length ? next : [product?.name ?? item.name];
                                update(index, {
                                  flavors: pricedFlavors,
                        price: highestFlavorPrice(pricedFlavors, item.variantName, products, variants, item.price),
                                });
                              }}
                            />
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">Selecionados: {(item.flavors ?? []).join(" / ")}</p>
                  </div>
                )}

                {!!productVariants.length && (
                  <label className="mt-3 block text-sm">
                    <span className="mb-1 block font-bold">Tamanho</span>
                    <select className="field-light h-10 py-1 text-sm" value={item.variantId ?? ""} onChange={(event) => {
                      const selected = productVariants.find((variant) => variant.id === event.target.value);
                      if (selected) update(index, {
                        variantId: selected.id,
                        variantName: selected.name,
                        price: isPizza ? highestFlavorPrice(item.flavors, selected.name, products, variants, Number(selected.price)) : Number(selected.price),
                      });
                    }}>
                      {productVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name} - {money(variant.price)}</option>)}
                    </select>
                  </label>
                )}

                {!!dough.length && (
                  <label className="mt-3 block text-sm">
                    <span className="mb-1 block font-bold">Massa</span>
                    <select className="field-light h-10 py-1 text-sm" value={item.dough?.name ?? ""} onChange={(event) => {
                      const selected = dough.find((option) => option.name === event.target.value);
                      update(index, { dough: selected ? { name: selected.name, price: Number(selected.additional_price) } : null });
                    }}>
                      <option value="">Selecione a massa</option>
                      {dough.map((option) => <option key={option.id} value={option.name}>{option.name}{Number(option.additional_price) ? ` + ${money(option.additional_price)}` : ""}</option>)}
                    </select>
                  </label>
                )}

                {!!crusts.length && (
                  <label className="mt-3 block text-sm">
                    <span className="mb-1 block font-bold">Borda</span>
                    <select className="field-light h-10 py-1 text-sm" value={item.crust?.name ?? ""} onChange={(event) => {
                      const selected = crusts.find((option) => option.name === event.target.value);
                      update(index, { crust: selected ? { name: selected.name, price: Number(selected.additional_price) } : null });
                    }}>
                      <option value="">Sem borda</option>
                      {crusts.map((option) => <option key={option.id} value={option.name}>{option.name}{Number(option.additional_price) ? ` + ${money(option.additional_price)}` : ""}</option>)}
                    </select>
                  </label>
                )}

                {!!additions.length && (
                  <div className="mt-3 grid gap-2 text-sm">
                    <span className="font-bold">Adicionais</span>
                    {additions.map((addition) => (
                      <label key={addition.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1">
                        <span><input type="checkbox" checked={item.additions.some((selected) => selected.name === addition.name)} onChange={(event) => {
                          const current = item.additions.filter((selected) => selected.name !== addition.name);
                          update(index, { additions: event.target.checked ? [...current, { name: addition.name, price: Number(addition.additional_price) }] : current });
                        }} /> {addition.name}</span>
                        <strong>{money(addition.additional_price)}</strong>
                      </label>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => update(index, { confirmed: true })}
                  disabled={flavorSelectionInvalid}
                  className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Confirmar item
                </button>
                  </>
                )}
              </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            <div className="flex justify-between"><span>Entrega</span><strong>{money(deliveryFee)}</strong></div>
            <div className="flex justify-between"><span>Desconto</span><strong>{money(discount)}</strong></div>
            <div className="flex justify-between text-lg font-black"><span>Total</span><span>{money(total)}</span></div>
          </div>
          {hasOpenItems && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-bold text-amber-800">Confirme os itens em aberto antes de finalizar.</p>}
          <div className="mt-4 grid gap-2">
            <button name="intent" value="finish" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 transition hover:border-[#E50914] hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" disabled={!cart.length || hasOpenItems}>
              {mode === "edit" ? "Salvar alterações" : "Finalizar"}
            </button>
            <button name="intent" value="print" className="btn-primary w-full" disabled={!cart.length || hasOpenItems}>
              <Printer className="h-4 w-4" />
              {mode === "edit" ? "Salvar e imprimir" : "Finalizar e imprimir"}
            </button>
          </div>
        </aside>
      </div>

      {draft && draftProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-8">
          <button type="button" onClick={() => setDraft(null)} className="absolute right-6 top-4 text-white">
            <X className="h-10 w-10" />
          </button>
          <div className="grid max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl md:grid-cols-[310px_1fr]">
            <div className="space-y-5 p-5">
              <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                {draftProduct.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draftProduct.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center font-bold text-slate-400">Sem foto</div>
                )}
              </div>
              <div>
                <h2 className="text-3xl font-black text-[#E50914]">{draftProduct.name}</h2>
                <p className="mt-3 text-sm leading-5 text-slate-600">{draftProduct.description || "Produto disponível para pedido."}</p>
              </div>
            </div>

            <div className="flex max-h-[88vh] flex-col border-l border-slate-100">
              <div className="flex-1 overflow-y-auto">
                {(() => {
                  const isPizza = isPizzaProduct(draftProduct);
                  const productVariants = variants.filter((variant) => variant.product_id === draft.id && variant.active);
                  const dough = isPizza ? groupOptions(options, draft.id, "Tipos de Massas", pizzaOptions) : [];
                  const crusts = isPizza ? groupOptions(options, draft.id, "Bordas", pizzaOptions) : [];
                  const additions = groupOptions(options, draft.id, "Adicionais", pizzaOptions);
                  const maxFlavors = isPizza ? Math.min(4, Math.max(1, Number(maxPizzaFlavors ?? 1))) : 1;
                  const flavors = isPizza ? flavorChoices(draftProduct, products) : [];
                  return (
                    <>
                      {isPizza && maxFlavors > 1 && (
                        <section className="border-b border-slate-100 p-5">
                          <h3 className="font-black">Sabores</h3>
                          <p className="text-sm text-slate-500">Escolha se esta pizza terá 1, 2, 3 ou {maxFlavors} sabores.</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {Array.from({ length: maxFlavors }, (_, flavorIndex) => flavorIndex + 1).map((count) => (
                              <button
                                key={count}
                                type="button"
                                onClick={() => {
                                  const nextFlavors = [draftProduct.name];
                                  setDraft({
                                    ...draft,
                                    flavorCount: count,
                                    flavors: nextFlavors,
                                    price: highestFlavorPrice(nextFlavors, draft.variantName, products, variants, draft.price),
                                  });
                                }}
                                    className={Number(draft.flavorCount ?? 1) === count ? "rounded-full bg-[#E50914] px-4 py-2 text-sm font-black text-white" : "rounded-full border border-slate-200 px-4 py-2 text-sm font-bold"}
                              >
                                {count} sabor{count > 1 ? "es" : ""}
                              </button>
                            ))}
                          </div>
                          <div className="mt-4 divide-y divide-slate-100">
                            {flavors.map((flavor) => {
                              const selected = draft.flavors.includes(flavor.name) ?? false;
                              const limit = Number(draft.flavorCount ?? 1);
                              return (
                                <label key={flavor.id} className="flex cursor-pointer items-center justify-between gap-4 py-3">
                                  <span>{flavor.name}</span>
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(event) => {
                                      const current = (draft.flavors ?? []).filter((name) => name !== flavor.name);
                                      const next = event.target.checked ? [...current, flavor.name].slice(0, limit) : current;
                                      const pricedFlavors = next.length ? next : [draftProduct.name];
                                      setDraft({
                                        ...draft,
                                        flavors: pricedFlavors,
                                        price: highestFlavorPrice(pricedFlavors, draft.variantName, products, variants, draft.price),
                                      });
                                    }}
                                    disabled={!selected && (draft.flavors.length ?? 0) >= limit}
                                  />
                                </label>
                              );
                            })}
                          </div>
                          <p className="mt-3 rounded bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                            Selecionados: {(draft.flavors ?? []).join(" / ")}
                          </p>
                        </section>
                      )}

                      {!!productVariants.length && (
                        <section className="border-b border-slate-100 p-5">
                          <h3 className="font-black">Tamanho</h3>
                          <p className="text-sm text-slate-500">Escolha uma opção.</p>
                          <div className="mt-4 divide-y divide-slate-100">
                            {productVariants.map((variant) => (
                              <label key={variant.id} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                                <span>
                                  <strong>{variant.name}</strong>
                                  <span className="block text-sm text-slate-500">{money(variant.price)}</span>
                                </span>
                                <input
                                  type="radio"
                                  checked={draft.variantId === variant.id}
                                  onChange={() => setDraft({
                                    ...draft,
                                    variantId: variant.id,
                                    variantName: variant.name,
                    price: isPizza ? highestFlavorPrice(draft.flavors, variant.name, products, variants, Number(variant.price)) : Number(variant.price),
                                  })}
                                />
                              </label>
                            ))}
                          </div>
                        </section>
                      )}

                      {!!dough.length && (
                        <section className="border-b border-slate-100 p-5">
                          <h3 className="font-black">Massas</h3>
                          <p className="text-sm text-slate-500">Escolha uma opção.</p>
                          <div className="mt-4 divide-y divide-slate-100">
                            {dough.map((option) => (
                              <label key={option.id} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                                <span>
                                  {option.name}
                                  {Number(option.additional_price) ? <strong className="block">+ {money(option.additional_price)}</strong> : null}
                                </span>
                                <input type="radio" checked={draft.dough?.name === option.name} onChange={() => setDraft({ ...draft, dough: { name: option.name, price: Number(option.additional_price) } })} />
                              </label>
                            ))}
                          </div>
                        </section>
                      )}

                      {!!crusts.length && (
                        <section className="border-b border-slate-100 p-5">
                          <h3 className="font-black">Bordas</h3>
                          <p className="text-sm text-slate-500">Escolha uma opção, se desejar.</p>
                          <div className="mt-4 divide-y divide-slate-100">
                            <label className="flex cursor-pointer items-center justify-between gap-4 py-4">
                              <span>Sem borda</span>
                              <input type="radio" checked={!draft.crust?.name} onChange={() => setDraft({ ...draft, crust: null })} />
                            </label>
                            {crusts.map((option) => (
                              <label key={option.id} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                                <span>
                                  {option.name}
                                  {Number(option.additional_price) ? <strong className="block">+ {money(option.additional_price)}</strong> : null}
                                </span>
                                <input type="radio" checked={draft.crust?.name === option.name} onChange={() => setDraft({ ...draft, crust: { name: option.name, price: Number(option.additional_price) } })} />
                              </label>
                            ))}
                          </div>
                        </section>
                      )}

                      {!!additions.length && (
                        <section className="border-b border-slate-100 p-5">
                          <h3 className="font-black">Adicionais</h3>
                          <p className="text-sm text-slate-500">Selecione quantos quiser.</p>
                          <div className="mt-4 divide-y divide-slate-100">
                            {additions.map((addition) => (
                              <label key={addition.id} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                                <span>
                                  {addition.name}
                                  {Number(addition.additional_price) ? <strong className="block">+ {money(addition.additional_price)}</strong> : null}
                                </span>
                                <input type="checkbox" checked={draft.additions.some((selected) => selected.name === addition.name)} onChange={(event) => {
                                  const current = draft.additions.filter((selected) => selected.name !== addition.name);
                                  setDraft({ ...draft, additions: event.target.checked ? [...current, { name: addition.name, price: Number(addition.additional_price) }] : current });
                                }} />
                              </label>
                            ))}
                          </div>
                        </section>
                      )}
                    </>
                  );
                })()}

                <section className="p-5">
                  <label className="block text-sm font-black uppercase tracking-wide text-slate-500">Observações do item</label>
                  <textarea
                    className="mt-2 min-h-20 w-full resize-none border-b border-slate-200 bg-white py-2 outline-none focus:border-[#E50914]"
                    maxLength={250}
                    value={draft.notes ?? ""}
                    onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                    placeholder="Ex.: sem cebola, caprichar no molho..."
                  />
                  <p className="text-right text-xs text-slate-400">{draft.notes.length ?? 0}/250</p>
                </section>
              </div>

              <div className="flex items-center gap-4 border-t border-slate-100 bg-white p-4">
                <button type="button" onClick={() => setDraft({ ...draft, quantity: Math.max(1, draft.quantity - 1) })} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
                  <Minus className="h-4 w-4" />
                </button>
                <strong className="text-lg">{draft.quantity}</strong>
                <button type="button" onClick={() => setDraft({ ...draft, quantity: draft.quantity + 1 })} className="grid h-10 w-10 place-items-center rounded-full bg-[#E50914] text-white">
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={confirmDraft}
                  disabled={isPizzaProduct(draftProduct) && Number(draft.flavorCount ?? 1) > 1 && (draft.flavors.length ?? 0) !== Number(draft.flavorCount ?? 1)}
                  className="ml-auto h-12 flex-1 rounded-lg bg-[#E50914] px-5 text-sm font-black uppercase text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Adicionar - {money(itemTotal(draft))}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
