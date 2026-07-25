export function maskSecret(value: string | null) {
  if (!value) return "";
  if (value.length <= 8) return `${value.slice(0, 2)}****${value.slice(-2)}`;
  return `${value.slice(0, 7)}****************${value.slice(-4)}`;
}

export function generateWhatsAppLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}text=${encodeURIComponent(message)}`;
}

export function sanitizeHeaders(headers: Headers) {
  const safe: Record<string, string> = {};
  headers.forEach((value, key) => {
    safe[key] = key.toLowerCase().includes("authorization") || key.toLowerCase().includes("secret") ? maskSecret(value) : value;
  });
  return safe;
}

export function isAdminRole(role: string | null) {
  return role === "owner" || role === "admin" || role === "manager";
}
