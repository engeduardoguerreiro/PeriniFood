const messages = {
  saved: "Alterações salvas com sucesso.",
  updated: "Status atualizado com sucesso.",
  deleted: "Registro excluído com sucesso.",
} as const;

export function ActionFeedback({ status, error }: { status: string; error: string }) {
  if (error) {
    return (
      <div className="rounded-xl border border-[#eeccc7] bg-[#f6ece9] px-4 py-3 text-sm font-medium text-[#c5362e]">
        Não foi possível concluir a ação: {error}
      </div>
    );
  }

  const message = messages[status as keyof typeof messages];
  if (!message) return null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
      {message}
    </div>
  );
}
