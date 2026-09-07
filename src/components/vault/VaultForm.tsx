"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { vaultEntrySchema } from "@/lib/validation";
import type { VaultEntryCreate, VaultEntryDecrypted, VaultCategory } from "@/types";

interface VaultFormProps {
  initialData?: VaultEntryDecrypted;
  onSubmit: (data: VaultEntryCreate) => Promise<void>;
  onCancel: () => void;
}

const categories: { value: VaultCategory; label: string }[] = [
  { value: "social", label: "Social" },
  { value: "email", label: "Email" },
  { value: "finance", label: "Finanzas" },
  { value: "shopping", label: "Compras" },
  { value: "work", label: "Trabajo" },
  { value: "other", label: "Otros" },
];

function generatePassword(length: number = 20): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => chars[b % chars.length])
    .join("");
}

export function VaultForm({ initialData, onSubmit, onCancel }: VaultFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [username, setUsername] = useState(initialData?.username || "");
  const [password, setPassword] = useState(initialData?.password || "");
  const [url, setUrl] = useState(initialData?.url || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [category, setCategory] = useState<VaultCategory>(
    initialData?.category || "other"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const parsed = vaultEntrySchema.safeParse({
      title,
      username,
      password,
      url: url || undefined,
      notes: notes || undefined,
      category,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setFormError(first?.message || "Datos inválidos");
      return;
    }

    setIsLoading(true);
    await onSubmit(parsed.data as VaultEntryCreate);
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="title"
        label="Título"
        placeholder="Mi cuenta"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <Input
        id="username"
        label="Usuario / Email"
        placeholder="usuario@ejemplo.com"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-300">
          Contraseña
        </label>
        <div className="flex gap-2">
          <PasswordInput
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1"
            required
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPassword(generatePassword())}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Input
        id="url"
        label="URL (opcional)"
        placeholder="https://ejemplo.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-300">
          Categoría
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                category === cat.value
                  ? "bg-emerald-600/20 text-emerald-400"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-300">
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales..."
          className="h-20 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {formError && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {formError}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? "Guardando..." : initialData ? "Guardar Cambios" : "Crear Entrada"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
