"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const TabContext = createContext<string>("");

// Abas de configurações: mostra uma seção por vez para a página não ficar
// gigante. Os painéis inativos ficam apenas escondidos (hidden), então
// continuam no mesmo <form> e são salvos junto com os visíveis.
export function SettingsTabs({ tabs, children }: { tabs: { id: string; label: string }[]; children: ReactNode }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && tabs.some((tab) => tab.id === hash)) setActive(hash);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TabContext.Provider value={active}>
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#e7e4dd] bg-[#faf9f6] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={
              active === tab.id
                ? "shrink-0 rounded-lg bg-white px-3.5 py-1.5 text-xs font-medium text-[#1b1a17] shadow-[0_1px_2px_rgba(27,26,23,0.06)]"
                : "shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium text-[#9c988f] transition hover:text-[#403d38]"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{children}</div>
    </TabContext.Provider>
  );
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  const active = useContext(TabContext);
  return <div hidden={active !== id}>{children}</div>;
}
