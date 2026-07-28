import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { AdminNav } from "@/components/admin-nav";
import { signOut } from "@/app/actions";

export const metadata = { title: "PeriniFood · Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1b1a17]">
      <header className="border-b border-[#e7e4dd] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#c5362e] text-white"><ShieldCheck size={16} /></span>
            <span className="text-sm font-semibold tracking-tight">
              PeriniFood <span className="text-[#9c988f]">·</span> <span className="text-[#c5362e]">Admin</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <AdminNav />
            <span className="hidden text-xs text-[#9c988f] sm:block">{email}</span>
            <form action={signOut}>
              <button className="rounded-lg border border-[#e7e4dd] px-3 py-1.5 text-xs font-medium text-[#6d6a63] transition hover:border-[#c5362e] hover:text-[#c5362e]">
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
