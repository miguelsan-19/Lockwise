"use client";

import { ChevronRight } from "lucide-react";
import type { VerifyAction } from "./VerifyGateModal";
import type { VaultEntryDecrypted } from "@/types";

interface VaultItemProps {
  entry: VaultEntryDecrypted;
  onRequestDetail: (entry: VaultEntryDecrypted, action: VerifyAction) => void;
}

const categoryColors: Record<string, string> = {
  social: "bg-blue-500/10 text-blue-400",
  email: "bg-purple-500/10 text-purple-400",
  finance: "bg-green-500/10 text-green-400",
  shopping: "bg-orange-500/10 text-orange-400",
  work: "bg-yellow-500/10 text-yellow-400",
  other: "bg-zinc-500/10 text-zinc-400",
};

export function VaultItem({ entry, onRequestDetail }: VaultItemProps) {
  return (
    <button
      onClick={() => onRequestDetail(entry, "open-detail")}
      className="group w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left transition-all hover:border-zinc-700 hover:bg-zinc-800/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-100">{entry.title}</h3>
          {entry.category && (
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                categoryColors[entry.category] || categoryColors.other
              }`}
            >
              {entry.category}
            </span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
      </div>
    </button>
  );
}