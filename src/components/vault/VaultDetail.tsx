"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";
import type { VerifyAction } from "./VerifyGateModal";
import type { VaultEntryDecrypted } from "@/types";

interface VaultDetailProps {
  entry: VaultEntryDecrypted;
  revealed: boolean;
  onBack: () => void;
  onRequestAction: (
    entry: VaultEntryDecrypted,
    action: VerifyAction
  ) => void;
  onHide: (id: string) => void;
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

export function VaultDetail({
  entry,
  revealed,
  onBack,
  onRequestAction,
  onHide,
}: VaultDetailProps) {
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
      onRequestAction(entry, "reveal-toggle");
    }
  };

  const handleCopyPassword = () => {
    if (revealed) {
      copyToClipboard(entry.password, "password");
    } else {
      onRequestAction(entry, "reveal-copy");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">{entry.title}</h1>
            {entry.category && (
              <span
                className={`mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-medium ${
                  categoryColors[entry.category] || categoryColors.other
                }`}
              >
                {entry.category}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onRequestAction(entry, "edit")}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </button>
          <button
            onClick={() => onRequestAction(entry, "delete")}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">Usuario</p>
            <p className="mt-1 text-sm text-zinc-100">{entry.username}</p>
          </div>
          <button
            onClick={() => copyToClipboard(entry.username, "username")}
            className="text-zinc-500 hover:text-zinc-300"
          >
            <Copy className="h-4 w-4" />
          </button>
          {copied === "username" && (
            <span className="text-xs text-emerald-400">Copiado</span>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
          <div>
            <p className="text-xs text-zinc-500">Contraseña</p>
            <p className="mt-1 font-mono text-sm text-zinc-100">
              {revealed ? entry.password : "••••••••••••"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {copied === "password" && (
              <span className="text-xs text-emerald-400">Copiado</span>
            )}
            <button onClick={handleEye} className="text-zinc-500 hover:text-zinc-300">
              {revealed ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleCopyPassword}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {entry.url && isValidSafeUrl(entry.url) && (
          <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
            <div>
              <p className="text-xs text-zinc-500">URL</p>
              <p className="mt-1 text-sm text-zinc-100">{entry.url}</p>
            </div>
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-300"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        {entry.notes && (
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-xs text-zinc-500">Notas</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">
              {entry.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}