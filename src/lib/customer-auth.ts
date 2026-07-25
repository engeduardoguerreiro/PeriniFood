import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const keyLength = 64;

export function hashCustomerPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, keyLength).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyCustomerPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;
  const [method, salt, hash] = storedHash.split("$");
  if (method !== "scrypt" || !salt || !hash) return false;
  const candidate = Buffer.from(scryptSync(password, salt, keyLength).toString("hex"), "hex");
  const original = Buffer.from(hash, "hex");
  if (candidate.length !== original.length) return false;
  return timingSafeEqual(candidate, original);
}

export function safeCustomerProfile(customer: Record<string, unknown>) {
  return {
    id: String(customer.id ?? ""),
    name: String(customer.name ?? ""),
    phone: String(customer.phone ?? customer.whatsapp ?? ""),
    whatsapp: String(customer.whatsapp ?? customer.phone ?? ""),
    email: String(customer.email ?? ""),
    cpf: String(customer.cpf ?? ""),
    birthDate: String(customer.birth_date ?? ""),
    address: String(customer.address ?? ""),
    addressNumber: String(customer.address_number ?? ""),
    neighborhood: String(customer.neighborhood ?? ""),
    complement: String(customer.complement ?? ""),
    reference: String(customer.reference ?? ""),
    city: String(customer.city ?? ""),
    state: String(customer.state ?? ""),
    zipCode: String(customer.zip_code ?? ""),
  };
}
