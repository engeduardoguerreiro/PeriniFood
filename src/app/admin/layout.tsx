import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { AdminNav } from "@/components/admin-nav";
import { signOut } from "@/app/actions";

export const metadata = { title: "PeriniFood · Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-[#faf9f6] text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white"><ShieldCheck size={16} /></span>
            <span className="text-sm font-semibold tracking-tight">
              PeriniFood <span className="text-ink-faint">·</span> <span className="text-brand">Admin</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <AdminNav />
            <span className="hidden text-xs text-ink-faint sm:block">{email}</span>
            <form action={signOut}>
              <button className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
