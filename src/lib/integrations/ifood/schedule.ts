import { formatStoreDateTime, formatStoreTime } from "@/lib/timezone";

// Pedido agendado do iFood (orderTiming SCHEDULED): o cliente escolheu uma janela
// de entrega (schedule.deliveryDateTimeStart/End) e o despacho só pode acontecer
// dentro dela. Despachar antes reprova a homologação e o iFood cancela o pedido.
export type IFoodSchedule = { start: Date; end: Date };

export function ifoodSchedule(order: unknown): IFoodSchedule | null {
  const raw = order && typeof order === "object" ? (order as Record<string, unknown>) : {};
  if (raw.orderTiming !== "SCHEDULED") return null;
  const schedule = raw.schedule && typeof raw.schedule === "object" ? (raw.schedule as Record<string, unknown>) : {};
  const start = new Date(String(schedule.deliveryDateTimeStart ?? ""));
  const end = new Date(String(schedule.deliveryDateTimeEnd ?? ""));
  if (Number.isNaN(start.getTime())) return null;
  return { start, end: Number.isNaN(end.getTime()) ? start : end };
}

export function dispatchBlocked(schedule: IFoodSchedule | null, now = new Date()) {
  return Boolean(schedule && now < schedule.start);
}

export function scheduleLabel(schedule: IFoodSchedule) {
  return `Agendado: entregar entre ${formatStoreDateTime(schedule.start)} e ${formatStoreTime(schedule.end)}`;
}
