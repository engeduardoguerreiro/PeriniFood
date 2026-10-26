// Formas de pagamento do pedido do site. Nada é cobrado online: "Pix agora" mostra
// ao cliente um código Pix (copia e cola + QR) gerado só a partir da chave da loja,
// e a loja confere o recebimento no banco; o resto é pago na entrega/retirada
// (cartão com o motoboy levando a maquininha). Sem dependências: roda no navegador,
// no servidor e nos testes (scripts/test-payments.mjs).

export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "random";

export type SitePayment = "pix_online" | "pix_delivery" | "cash" | "credit_card" | "debit_card";
// Detalhe gravado em orders.payment_detail (o enum payment_method continua "pix", "cash"…).
export type PaymentDetail = "pix_online" | "pix_entrega" | "maquininha" | "dinheiro";

export const SITE_PAYMENTS: SitePayment[] = ["pix_online", "pix_delivery", "cash", "credit_card", "debit_card"];
const DEFAULT_PAYMENTS: SitePayment[] = ["pix_delivery", "cash", "credit_card", "debit_card"];

export const sitePaymentLabels: Record<SitePayment, string> = {
  pix_online: "Pix agora",
  pix_delivery: "Pix na entrega",
  cash: "Dinheiro",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
};

// Texto curto sob cada opção no checkout (pickup: "retirada" no lugar de "entrega").
export function sitePaymentHint(value: SitePayment, pickup: boolean) {
  if (value === "pix_online") return "Código Pix gerado ao enviar o pedido";
  if (value === "pix_delivery" || value === "cash") return pickup ? "Pague no balcão, na retirada" : "Pague ao entregador";
  return pickup ? "Na maquininha, na retirada" : "O entregador leva a maquininha";
}

// payment_methods da loja → opções do site. "pix" antigo = Pix na entrega (como era).
// "Pix agora" só aparece se a loja tem chave Pix válida cadastrada.
export function sitePayments(methods: unknown, pixKey: string | null | undefined, keyType: PixKeyType | null | undefined): SitePayment[] {
  const list = Array.isArray(methods) && methods.length ? methods.map(String) : DEFAULT_PAYMENTS;
  const mapped = list.map((value) => (value === "pix" ? "pix_delivery" : value)).filter((value): value is SitePayment => SITE_PAYMENTS.includes(value as SitePayment));
  const unique = SITE_PAYMENTS.filter((value) => mapped.includes(value));
  return unique.filter((value) => value !== "pix_online" || Boolean(normalizePixKey(pixKey, keyType)));
}

export function orderPayment(value: SitePayment): { method: "pix" | "cash" | "credit_card" | "debit_card"; detail: PaymentDetail } {
  if (value === "pix_online") return { method: "pix", detail: "pix_online" };
  if (value === "pix_delivery") return { method: "pix", detail: "pix_entrega" };
  if (value === "cash") return { method: "cash", detail: "dinheiro" };
  return { method: value, detail: "maquininha" };
}

// Linha para comanda, painel e página do motoboy.
export function paymentDetailNote(detail: string | null | undefined, pickup = false) {
  if (detail === "pix_online") return "Pix pelo código do site: confira o recebimento no banco";
  if (detail === "pix_entrega") return pickup ? "Pix na retirada" : "Pix na entrega (cliente paga ao entregador)";
  if (detail === "maquininha") return pickup ? "Cartão na maquininha, na retirada" : "Levar a maquininha de cartão";
  return null;
}

export const pixKeyTypeLabels: Record<PixKeyType, string> = { cpf: "CPF", cnpj: "CNPJ", phone: "Celular", email: "E-mail", random: "Chave aleatória" };

export function pixKeyType(value: unknown): PixKeyType | null {
  return typeof value === "string" && value in pixKeyTypeLabels ? (value as PixKeyType) : null;
}

// Chave como o Banco Central espera dentro do código: CPF/CNPJ só dígitos,
// celular +55DDDNÚMERO, e-mail minúsculo, aleatória (EVP) minúscula. O tipo é
// escolhido pela loja: 11 dígitos podem ser CPF ou celular, e adivinhar errado
// mandaria o Pix para outra chave.
export function normalizePixKey(raw: string | null | undefined, type: PixKeyType | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value || !type) return null;
  const digits = value.replace(/\D/g, "");
  switch (type) {
    case "cpf":
      return digits.length === 11 && validCpf(digits) ? digits : null;
    case "cnpj":
      return digits.length === 14 && validCnpj(digits) ? digits : null;
    case "phone": {
      const national = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
      return national.length === 10 || national.length === 11 ? `+55${national}` : null;
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 77 ? value.toLowerCase() : null;
    case "random":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : null;
  }
}

function validCpf(cpf: string) {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
}

function validCnpj(cnpj: string) {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const check = (length: number) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, i) => total + Number(cnpj[i]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === Number(cnpj[12]) && check(13) === Number(cnpj[13]);
}

// Nome e cidade no código: sem acento, maiúsculas, só caracteres aceitos, no limite do padrão.
function emvText(value: string, max: number) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 .\-]/g, " ").replace(/\s+/g, " ").trim().toUpperCase().slice(0, max).trim();
}

function field(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

// CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no campo 63 do BR Code.
export function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// "Pix copia e cola" estático com valor (padrão EMV do Banco Central). O txid
// identifica o pedido no extrato quando o banco o mostra.
export function pixBrCode({ key, keyType, name, city, amount, txid }: { key: string; keyType: PixKeyType; name: string; city: string; amount: number; txid?: string }) {
  const pixKey = normalizePixKey(key, keyType);
  if (!pixKey) throw new Error("Chave Pix inválida.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor inválido.");
  const reference = (txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const payload = [
    field("00", "01"),
    field("26", field("00", "br.gov.bcb.pix") + field("01", pixKey)),
    field("52", "0000"),
    field("53", "986"),
    field("54", amount.toFixed(2)),
    field("58", "BR"),
    field("59", emvText(name, 25) || "LOJA"),
    field("60", emvText(city, 15) || "BRASIL"),
    field("62", field("05", reference)),
  ].join("") + "6304";
  return payload + crc16(payload);
}
