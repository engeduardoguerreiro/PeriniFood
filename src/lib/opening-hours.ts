import type { Restaurant } from "@/lib/types";

export type OpeningHourDay = {
  active: boolean;
  open: string;
  close: string;
};

export type OpeningHours = Record<string, OpeningHourDay>;

export const openingHourDays = [
  ["monday", "Segunda-feira"],
  ["tuesday", "Terça-feira"],
  ["wednesday", "Quarta-feira"],
  ["thursday", "Quinta-feira"],
  ["friday", "Sexta-feira"],
  ["saturday", "Sábado"],
  ["sunday", "Domingo"],
] as const;

const weekdayMap: Record<string, string> = {
  sunday: "sunday",
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday",
};

const previousWeekday: Record<string, string> = {
  monday: "sunday",
  tuesday: "monday",
  wednesday: "tuesday",
  thursday: "wednesday",
  friday: "thursday",
  saturday: "friday",
  sunday: "saturday",
};

function minutesFromTime(value: string | undefined) {
  if (!value) return null;
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function currentSaoPauloParts(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "America/Sao_Paulo",
  }).format(date).toLowerCase();
  const parts = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return {
    weekday: weekdayMap[weekday] ?? "monday",
    minutes: hour * 60 + minute,
  };
}

export function hasOpeningHours(openingHours: Restaurant["opening_hours"]) {
  if (!openingHours || typeof openingHours !== "object") return false;
  return openingHourDays.some(([key]) => {
    const day = (openingHours as OpeningHours)[key];
    return Boolean(day?.active && day.open && day.close);
  });
}

export function isRestaurantOpen(restaurant: Pick<Restaurant, "is_open" | "opening_hours" | "manual_open_status">, date = new Date()) {
  if (!restaurant.is_open) return false;
  if (restaurant.manual_open_status === "open") return true;
  if (restaurant.manual_open_status === "closed") return false;
  if (!hasOpeningHours(restaurant.opening_hours)) return true;

  const openingHours = restaurant.opening_hours as OpeningHours;
  const current = currentSaoPauloParts(date);
  const shift = (key: string) => {
    const day = openingHours[key];
    if (!day?.active) return null;
    const open = minutesFromTime(day.open);
    const close = minutesFromTime(day.close);
    return open === null || close === null ? null : { open, close };
  };

  // Turno de hoje: se vira a meia-noite (18:00–02:00), hoje só vale a parte >= abertura.
  const today = shift(current.weekday);
  if (today && (today.open <= today.close
    ? current.minutes >= today.open && current.minutes <= today.close
    : current.minutes >= today.open)) return true;

  // Madrugada: continua aberto se o turno de ONTEM virou a meia-noite e ainda não fechou.
  const yesterday = shift(previousWeekday[current.weekday] ?? "sunday");
  return Boolean(yesterday && yesterday.open > yesterday.close && current.minutes <= yesterday.close);
}

export function currentOpeningLabel(restaurant: Pick<Restaurant, "opening_hours">) {
  if (!hasOpeningHours(restaurant.opening_hours)) return null;
  const openingHours = restaurant.opening_hours as OpeningHours;
  const current = currentSaoPauloParts();
  const day = openingHours[current.weekday];

  if (!day?.active || !day.open || !day.close) return "Fechado hoje";
  return `Hoje: ${day.open} às ${day.close}`;
}
