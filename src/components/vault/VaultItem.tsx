"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff, ExternalLink, Trash2, Edit } from "lucide-react";
import type { VaultEntryDecrypted } from "@/types";

type RevealAction = "toggle" | "copy";

interface VaultItemProps {
  entry: VaultEntryDecrypted;
  revealed: boolean;
  onRequestReveal: (entry: VaultEntryDecrypted, action: RevealAction) => void;
  onHide: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (entry: VaultEntryDecrypted) => void;
}

const categoryColors: Record<string, string> = {
  social: "bg-blue-500/10 text-blue-400",
  email: "bg-purple-500/10 text-purple-400",
  finance: "bg-green-500/10 text-green-400",
  shopping: "bg-orange-500/10 text-orange-400",
  work: "bg-yellow-500/10 text-yellow-400",
  other: "bg-zinc-500/10 text-zinc-400",
};

function isValidSafeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function VaultItem({
  entry,
  revealed,
  onRequestReveal,
  onHide,
  onDelete,
  onEdit,
}: VaultItemProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleEye = () => {
    if (revealed) {
      onHide(entry.id);
    } else {
      onRequestReveal(entry, "toggle");
    }
  };

  const handleCopyPassword = () => {
    if (revealed) {
      copyToClipboard(entry.password, "password");
    } else {
      onRequestReveal(entry, "copy");
    }
  };

  return (
    <div className="group rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
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

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-16">Usuario:</span>
              <span className="text-sm text-zinc-300">{entry.username}</span>
              <button
                onClick={() => copyToClipboard(entry.username, "username")}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <Copy className="h-3 w-3" />
              </button>
              {copied === "username" && (
                <span className="text-xs text-emerald-400">Copiado</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-16">Clave:</span>
              <span className="text-sm text-zinc-300 font-mono">
                {revealed ? entry.password : "••••••••"}
              </span>
              <button onClick={handleEye} className="text-zinc-500 hover:text-zinc-300">
                {revealed ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </button>
              <button
                onClick={handleCopyPassword}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <Copy className="h-3 w-3" />
              </button>
              {copied === "password" && (
                <span className="text-xs text-emerald-400">Copiado</span>
              )}
            </div>

            {entry.url && isValidSafeUrl(entry.url) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-16">URL:</span>
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-emerald-400 hover:underline"
                >
                  {entry.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(entry)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}