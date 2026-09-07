"use client";

import { Search } from "lucide-react";
import { useVaultStore } from "@/hooks/useVault";
import type { VaultCategory } from "@/types";

const categories: { value: VaultCategory | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "social", label: "Social" },
  { value: "email", label: "Email" },
  { value: "finance", label: "Finanzas" },
  { value: "shopping", label: "Compras" },
  { value: "work", label: "Trabajo" },
  { value: "other", label: "Otros" },
];

export function VaultSearch() {
  const searchQuery = useVaultStore((s) => s.searchQuery);
  const setSearchQuery = useVaultStore((s) => s.setSearchQuery);
  const selectedCategory = useVaultStore((s) => s.selectedCategory);
  const setSelectedCategory = useVaultStore((s) => s.setSelectedCategory);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar entradas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex gap-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === cat.value
                ? "bg-emerald-600/20 text-emerald-400"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
