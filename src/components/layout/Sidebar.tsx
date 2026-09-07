"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shield, Key, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useVaultStore } from "@/hooks/useVault";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/vault", label: "Vault", icon: Key },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const clearKeys = useVaultStore((s) => s.clearKeys);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearKeys();
    router.push("/login");
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-800 p-6">
        <Shield className="h-6 w-6 text-emerald-500" />
        <span className="text-lg font-bold text-zinc-100">Lockwise</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-emerald-600/10 text-emerald-400"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-zinc-800 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
