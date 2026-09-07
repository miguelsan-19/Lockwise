"use client";

import { VaultItem } from "./VaultItem";
import type { VaultEntryDecrypted } from "@/types";

type RevealAction = "toggle" | "copy";

interface VaultListProps {
  entries: VaultEntryDecrypted[];
  revealedIds: Set<string>;
  onRequestReveal: (entry: VaultEntryDecrypted, action: RevealAction) => void;
  onHide: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (entry: VaultEntryDecrypted) => void;
}

export function VaultList({
  entries,
  revealedIds,
  onRequestReveal,
  onHide,
  onDelete,
  onEdit,
}: VaultListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-zinc-800 p-4">
          <svg
            className="h-8 w-8 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-zinc-100">
          Vault vacío
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Agrega tu primera entrada para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {entries.map((entry) => (
        <VaultItem
          key={entry.id}
          entry={entry}
          revealed={revealedIds.has(entry.id)}
          onRequestReveal={onRequestReveal}
          onHide={onHide}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}