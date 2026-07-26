"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { DeliveryFeeRule } from "@/lib/types";

type EditableRule = {
  key: string;
  name: string;
  min_km: number;
  max_km: number | null;
  fee: number;
  free_delivery: boolean;
  active: boolean;
  removed?: boolean;
};

const radiusOptions = Array.from({ length: 29 }, (_, index) => index + 2);

function radiusLabel(km: number) {
  return `Até ${km} km`;
}

function radiusFromRule(rule: Pick<EditableRule, "name" | "max_km">) {
  const nameMatch = rule.name.match(/(\d+(?:[,.]\d+)?)/);
  const parsedNameKm = nameMatch ? Number(nameMatch[1].replace(",", ".")) : null;
  const km = Number(rule.max_km ?? parsedNameKm ?? 2);

  return radiusOptions.includes(km) ? km : 2;
}

function blankRule(index: number): EditableRule {
  return {
    key: `new-${Date.now()}-${index}`,
    name: radiusLabel(2),
    min_km: 0,
    max_km: 2,
    fee: 0,
    free_delivery: false,
    active: true,
  };
}

export function DeliveryFeeRulesEditor({ rules }: { rules: DeliveryFeeRule[] }) {
  const [rows, setRows] = useState<EditableRule[]>(() => (
    rules.length
      ? rules.map((rule) => ({
          key: rule.id,
          name: rule.name,
          min_km: Number(rule.min_km),
          max_km: rule.max_km === null ? null : Number(rule.max_km),
          fee: Number(rule.fee),
          free_delivery: rule.free_delivery,
          active: rule.active,
          removed: false,
        }))
      : [blankRule(0)]
  ));

  const visibleRows = rows.filter((row) => !row.removed);

  function updateRow(index: number, patch: Partial<EditableRule>) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  function removeRow(index: number) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, removed: true } : row));
  }

  const rowInput = "h-9 w-full rounded-lg border border-[#e7e4dd] bg-white px-3 text-sm text-[#1b1a17] outline-none transition focus:border-[#c5362e] focus:ring-2 focus:ring-[#c5362e]/12";
  const colLabel = "text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[#9c988f]";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#9c988f]">
          Cadastre faixas por distância. Escolha o alcance máximo, de Até 2 km até Até 30 km.
        </p>
        <button
          type="button"
          onClick={() => setRows((current) => [...current, blankRule(current.length)])}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e7e4dd] bg-white px-4 text-sm font-medium text-[#403d38] transition hover:border-[#c5362e] hover:text-[#c5362e]"
        >
          <Plus className="h-4 w-4" />
          Adicionar faixa
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e7e4dd] bg-white">
        <div className={`grid grid-cols-[minmax(180px,1fr)_110px_110px_120px_78px_78px_60px] gap-3 border-b border-[#efece6] bg-[#faf9f6] px-4 py-2 ${colLabel} max-lg:hidden`}>
          <span>Nome da faixa</span>
          <span>KM inicial</span>
          <span>KM final</span>
          <span>Taxa</span>
          <span>Grátis</span>
          <span>Ativa</span>
          <span className="text-right">Excluir</span>
        </div>

        <div className="divide-y divide-[#efece6]">
          {rows.map((row, index) => (
            <div key={row.key} className={row.removed ? "hidden" : "grid gap-2 px-4 py-2 transition hover:bg-[#faf9f6] lg:grid-cols-[minmax(180px,1fr)_110px_110px_120px_78px_78px_60px] lg:items-center"}>
              <input type="hidden" name="delivery_rule_remove" value={row.removed ? String(index) : ""} disabled={!row.removed} />
              <label className="space-y-1 lg:space-y-0">
                <span className={`${colLabel} lg:hidden`}>Nome da faixa</span>
                <input type="hidden" name="delivery_rule_name" value={radiusLabel(radiusFromRule(row))} />
                <select
                  className={rowInput}
                  value={radiusFromRule(row)}
                  onChange={(event) => {
                    const maxKm = Number(event.target.value);
                    updateRow(index, { name: radiusLabel(maxKm), min_km: 0, max_km: maxKm });
                  }}
                >
                  {radiusOptions.map((km) => (
                    <option key={km} value={km}>
                      {radiusLabel(km)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 lg:space-y-0">
                <span className={`${colLabel} lg:hidden`}>KM inicial</span>
                <input className={rowInput} name="delivery_rule_min_km" type="number" min="0" step="0.01" value={row.min_km} onChange={(event) => updateRow(index, { min_km: Number(event.target.value || 0) })} />
              </label>
              <label className="space-y-1 lg:space-y-0">
                <span className={`${colLabel} lg:hidden`}>KM final</span>
                <input className={rowInput} name="delivery_rule_max_km" type="number" min="0" step="0.01" value={row.max_km ?? ""} onChange={(event) => updateRow(index, { max_km: event.target.value ? Number(event.target.value) : null })} placeholder="Sem limite" />
              </label>
              <label className="space-y-1 lg:space-y-0">
                <span className={`${colLabel} lg:hidden`}>Taxa</span>
                <input className={rowInput} name="delivery_rule_fee" type="number" min="0" step="0.01" value={row.fee} onChange={(event) => updateRow(index, { fee: Number(event.target.value || 0) })} />
              </label>
              <label className="flex items-center gap-2 text-sm text-[#403d38] lg:justify-center">
                <input name="delivery_rule_free" type="checkbox" value={index} checked={row.free_delivery} onChange={(event) => updateRow(index, { free_delivery: event.target.checked })} className="accent-[#c5362e]" />
                <span className="lg:hidden">Grátis</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-[#403d38] lg:justify-center">
                <input name="delivery_rule_active" type="checkbox" value={index} checked={row.active} onChange={(event) => updateRow(index, { active: event.target.checked })} className="accent-[#c5362e]" />
                <span className="lg:hidden">Ativa</span>
              </label>
              <div className="flex lg:justify-end">
                <button type="button" onClick={() => removeRow(index)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e7e4dd] bg-white text-[#6d6a63] transition hover:border-[#c5362e] hover:text-[#c5362e]" aria-label="Excluir faixa" title="Excluir faixa">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {!visibleRows.length && <p className="p-5 text-sm text-[#9c988f]">Nenhuma faixa cadastrada. Clique em Adicionar faixa.</p>}
        </div>
      </div>
    </div>
  );
}
