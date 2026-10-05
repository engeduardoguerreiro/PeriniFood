// As funções rodam em UTC na Vercel (a região gru1 não muda o fuso do processo):
// "hoje", agrupamento por dia e horários exibidos precisam usar o fuso da loja.
export const STORE_TIME_ZONE = "America/Sao_Paulo";

type DateParts = { year: number; month: number; day: number };

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STORE_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: STORE_TIME_ZONE, dateStyle: "short", timeStyle: "short" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: STORE_TIME_ZONE, hour: "2-digit", minute: "2-digit" });

export function zonedDateParts(date: Date) {
  const parts = partsFormatter.formatToParts(date);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: pick("year"), month: pick("month"), day: pick("day"), hour: pick("hour"), minute: pick("minute"), second: pick("second") };
}

export function addDaysToDateParts(parts: DateParts, days: number): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

// Converte um horário "de parede" no fuso da loja para o instante UTC equivalente.
export function zonedLocalTimeToUtc(parts: DateParts & { hour?: number; minute?: number; second?: number }) {
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour ?? 0, parts.minute ?? 0, parts.second ?? 0);
  const rendered = zonedDateParts(new Date(utcGuess));
  const renderedAsUtc = Date.UTC(rendered.year, rendered.month - 1, rendered.day, rendered.hour, rendered.minute, rendered.second);
  return new Date(utcGuess - (renderedAsUtc - utcGuess));
}

export function keyFromParts(parts: DateParts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function partsFromKey(key: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
}

// "YYYY-MM-DD" do instante no fuso da loja.
export function storeDayKey(value: string | Date) {
  return dayKeyFormatter.format(typeof value === "string" ? new Date(value) : value);
}

// Intervalo [início, fim) em UTC do dia da loja que contém `now`.
export function storeDayRange(now = new Date()) {
  const { year, month, day } = zonedDateParts(now);
  const today = { year, month, day };
  return {
    start: zonedLocalTimeToUtc(today),
    end: zonedLocalTimeToUtc(addDaysToDateParts(today, 1)),
  };
}

export function formatStoreDateTime(value: string | Date) {
  return dateTimeFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function formatStoreTime(value: string | Date) {
  return timeFormatter.format(typeof value === "string" ? new Date(value) : value);
}
