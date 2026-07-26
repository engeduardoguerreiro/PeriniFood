import { Inbox } from "lucide-react";

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#dcd8cf] bg-white p-10 text-center text-[#403d38]">
      <Inbox className="mx-auto mb-3 h-10 w-10 text-[#b0aaa0]" />
      <h3 className="font-bold text-[#0F1720]">{title}</h3>
      <p className="mt-1 text-sm">{text}</p>
    </div>
  );
}
