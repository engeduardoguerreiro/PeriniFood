const messages = {
  saved: "Alterações salvas com sucesso.",
  updated: "Status atualizado com sucesso.",
  deleted: "Registro excluído com sucesso.",
} as const;

export function ActionFeedback({ status, error }: { status: string; error: string }) {
  if (error) {
    return (
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
        Não foi possível concluir a ação: {error}
      </div>
    );
  }

  const message = messages[status as keyof typeof messages];
  if (!message) return null;

  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
      {message}
    </div>
  );
}
