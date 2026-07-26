"use client";

import { useEffect } from "react";

// Impede que a rolagem do mouse altere o valor de inputs numéricos.
// Sem isso, passar a roda do mouse sobre um campo de preço focado
// incrementa/decrementa pelo "step" (ex.: 60,00 vira 59,99) sem o
// usuário perceber. Ao rolar, tiramos o foco: a página rola normal e
// o valor não muda.
export function NumberInputWheelGuard() {
  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      const el = document.activeElement as HTMLInputElement | null;
      if (el && el.tagName === "INPUT" && el.type === "number" && el === event.target) {
        el.blur();
      }
    };
    document.addEventListener("wheel", onWheel, { passive: true });
    return () => document.removeEventListener("wheel", onWheel);
  }, []);

  return null;
}
