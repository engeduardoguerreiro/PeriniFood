import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "node:util";

const keyLength = 64;
const derive = promisify(scrypt);

export async function hashCustomerPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = ((await derive(password, salt, keyLength)) as Buffer).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export async function verifyCustomerPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash || password.length > 128) return false;
  const [method, salt, hash] = storedHash.split("$");
  if (method !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const candidate = (await derive(password, salt, keyLength)) as Buffer;
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
