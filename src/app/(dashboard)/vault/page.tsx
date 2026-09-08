"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  deriveMasterKeys,
  verifyMasterPassword,
  encryptForVault,
  decryptFromVault,
} from "@/lib/crypto";
import { getMasterSalt, getPasswordVerifier } from "@/lib/masterSalt";
import { useVaultStore } from "@/hooks/useVault";
import { VaultList } from "@/components/vault/VaultList";
import { VaultSearch } from "@/components/vault/VaultSearch";
import { VaultForm } from "@/components/vault/VaultForm";
import { VaultDetail } from "@/components/vault/VaultDetail";
import { VerifyGateModal, type VerifyAction } from "@/components/vault/VerifyGateModal";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import type { VaultEntryDecrypted, VaultEntryCreate, VaultCategory } from "@/types";

const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 minutos
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 1 minuto de bloqueo tras agotar intentos

export default function VaultPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntryDecrypted | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(true);
  const [masterPasswordInput, setMasterPasswordInput] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  // Gate 2FA para revelar, editar y eliminar entradas
  const [gateTarget, setGateTarget] =
    useState<VaultEntryDecrypted | null>(null);
  const [gateAction, setGateAction] = useState<VerifyAction>("open-detail");
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] =
    useState<VaultEntryDecrypted | null>(null);

  const {
    entries,
    keys,
    setKeys,
    clearKeys,
    setEntries,
    removeEntry,
    filteredEntries,
  } = useVaultStore();

  const router = useRouter();
  const lastActivityRef = useRef(Date.now());

  // Auto-lock por inactividad
  useEffect(() => {
    const resetTimer = () => {
      lastActivityRef.current = Date.now();
    };
    const check = () => {
      if (keys && Date.now() - lastActivityRef.current > AUTO_LOCK_MS) {
        clearKeys();
        setRevealedIds(new Set());
        setMasterPasswordInput("");
        setUnlockError("");
        setIsUnlocking(true);
      }
    };
    window.addEventListener("click", resetTimer);
    window.addEventListener("keydown", resetTimer);
    const interval = setInterval(check, 30000);
    return () => {
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      clearInterval(interval);
    };
  }, [keys, clearKeys]);

  const loadEntries = useCallback(async () => {
    if (!keys) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("vault_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading entries:", error);
      return;
    }

    const decrypted: VaultEntryDecrypted[] = [];
    for (const entry of data) {
      try {
        const decryptedData = await decryptFromVault(
          keys.encryptionKey,
          entry.ciphertext,
          entry.iv,
          entry.auth_tag,
          user.id
        );
        const parsed = JSON.parse(decryptedData);

        let title = entry.enc_title || entry.title;
        let url = entry.enc_url ? await decryptFromVault(keys.encryptionKey, JSON.parse(entry.enc_url).ciphertext, JSON.parse(entry.enc_url).iv, JSON.parse(entry.enc_url).authTag, user.id) : entry.url;
        let category: VaultCategory | null = entry.enc_category
          ? (await decryptFromVault(
              keys.encryptionKey,
              JSON.parse(entry.enc_category).ciphertext,
              JSON.parse(entry.enc_category).iv,
              JSON.parse(entry.enc_category).authTag,
              user.id
            )) as VaultCategory
          : (entry.category as VaultCategory) || null;

        if (entry.enc_title) {
          const t = JSON.parse(entry.enc_title);
          title = await decryptFromVault(
            keys.encryptionKey,
            t.ciphertext,
            t.iv,
            t.authTag,
            user.id
          );
        }

        decrypted.push({
          id: entry.id,
          title,
          username: parsed.username,
          password: parsed.password,
          url,
          notes: parsed.notes,
          category,
          createdAt: new Date(entry.created_at),
          updatedAt: new Date(entry.updated_at),
        });
      } catch (e) {
        console.error("Error decrypting entry:", e);
      }
    }

    setEntries(decrypted);
  }, [keys, router, setEntries]);

  useEffect(() => {
    if (keys) {
      setIsUnlocking(false);
      loadEntries();
    } else {
      setIsUnlocking(true);
    }
  }, [keys, loadEntries]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError("");

    if (lockUntil && Date.now() < lockUntil) {
      const wait = Math.ceil((lockUntil - Date.now()) / 1000);
      setUnlockError(`Demasiados intentos. Espera ${wait}s.`);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const salt =
      localStorage.getItem(`lockwise_salt_${user.id}`) ||
      (await getMasterSalt(user.id));
    const verifier = await getPasswordVerifier(user.id);

    if (!salt || !verifier) {
      setUnlockError(
        "Configuración de seguridad incompleta. Inicia sesión de nuevo."
      );
      return;
    }

    try {
      const { encryptionKey, verifierKey } = await deriveMasterKeys(
        masterPasswordInput,
        salt
      );

      const valid = await verifyMasterPassword(
        verifierKey,
        verifier.ciphertext,
        verifier.iv,
        verifier.authTag
      );

      if (!valid) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockUntil(Date.now() + LOCKOUT_MS);
          setAttempts(0);
          setUnlockError("Demasiados intentos fallidos. Bloqueado por 1 minuto.");
        } else {
          setUnlockError(
            `Contraseña maestra incorrecta (${newAttempts}/${MAX_ATTEMPTS} intentos).`
          );
        }
        return;
      }

      // Éxito
      localStorage.setItem(`lockwise_salt_${user.id}`, salt);
      setAttempts(0);
      setLockUntil(null);
      setKeys({ encryptionKey, verifierKey, salt });
      setIsUnlocking(false);
    } catch {
      setUnlockError("Contraseña maestra incorrecta");
    }
  };

  const requestGate = useCallback(
    (entry: VaultEntryDecrypted, action: VerifyAction) => {
      setGateAction(action);
      setGateTarget(entry);
    },
    []
  );

  const handleHide = useCallback((id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleGateClose = useCallback(() => {
    setGateTarget(null);
  }, []);

  const handleDeleteEntry = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("vault_entries")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting entry:", error);
        return;
      }

      removeEntry(id);
      setRevealedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [removeEntry]
  );

  const handleGateSuccess = useCallback(async () => {
    if (!gateTarget) return;
    const entry = gateTarget;
    setGateTarget(null);

    if (gateAction === "open-detail") {
      setSelectedEntry(entry);
    } else if (gateAction === "reveal-toggle") {
      setRevealedIds((prev) => new Set(prev).add(entry.id));
    } else if (gateAction === "reveal-copy") {
      setRevealedIds((prev) => new Set(prev).add(entry.id));
      await navigator.clipboard.writeText(entry.password);
    } else if (gateAction === "edit") {
      setEditingEntry(entry);
    } else if (gateAction === "delete") {
      await handleDeleteEntry(entry.id);
      setSelectedEntry(null);
    }
  }, [gateTarget, gateAction, handleDeleteEntry]);

  const handleCreate = async (data: VaultEntryCreate) => {
    if (!keys) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const plaintext = JSON.stringify({
      username: data.username,
      password: data.password,
      notes: data.notes,
    });

    const encrypted = await encryptForVault(
      keys.encryptionKey,
      plaintext,
      user.id
    );

    const encTitle = await encryptForVault(
      keys.encryptionKey,
      data.title,
      user.id
    );
    const encUrl = data.url
      ? await encryptForVault(keys.encryptionKey, data.url, user.id)
      : null;
    const encCategory = data.category
      ? await encryptForVault(keys.encryptionKey, data.category, user.id)
      : null;

    const { error } = await supabase.from("vault_entries").insert({
      user_id: user.id,
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
      auth_tag: encrypted.authTag,
      enc_title: JSON.stringify(encTitle),
      enc_url: encUrl ? JSON.stringify(encUrl) : null,
      enc_category: encCategory ? JSON.stringify(encCategory) : null,
    });

    if (error) {
      console.error("Error creating entry:", error);
      return;
    }

    await loadEntries();
    setShowForm(false);
  };

  const handleEdit = async (data: VaultEntryCreate) => {
    if (!keys || !editingEntry) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const plaintext = JSON.stringify({
      username: data.username,
      password: data.password,
      notes: data.notes,
    });

    const encrypted = await encryptForVault(
      keys.encryptionKey,
      plaintext,
      user.id
    );
    const encTitle = await encryptForVault(
      keys.encryptionKey,
      data.title,
      user.id
    );
    const encUrl = data.url
      ? await encryptForVault(keys.encryptionKey, data.url, user.id)
      : null;
    const encCategory = data.category
      ? await encryptForVault(keys.encryptionKey, data.category, user.id)
      : null;

    const { error } = await supabase
      .from("vault_entries")
      .update({
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
        auth_tag: encrypted.authTag,
        enc_title: JSON.stringify(encTitle),
        enc_url: encUrl ? JSON.stringify(encUrl) : null,
        enc_category: encCategory ? JSON.stringify(encCategory) : null,
      })
      .eq("id", editingEntry.id);

    if (error) {
      console.error("Error updating entry:", error);
      return;
    }

    await loadEntries();
    setEditingEntry(null);
    setSelectedEntry((prev) =>
      prev && prev.id === editingEntry.id
        ? {
            ...editingEntry,
            title: data.title,
            username: data.username,
            password: data.password,
            url: data.url ?? null,
            notes: data.notes ?? null,
            category: data.category ?? null,
          }
        : prev
    );
  };

  if (isUnlocking) {
    return (
      <div className="flex h-full items-center justify-center">
        <form onSubmit={handleUnlock} className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-4 w-fit rounded-full bg-zinc-800 p-3">
              <Lock className="h-6 w-6 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100">
              Desbloquear Vault
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Ingresa tu contraseña maestra
            </p>
          </div>

          <PasswordInput
            id="masterUnlock"
            placeholder="Contraseña maestra"
            value={masterPasswordInput}
            onChange={(e) => setMasterPasswordInput(e.target.value)}
            required
            autoFocus
          />

          {unlockError && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {unlockError}
            </p>
          )}

          <Button type="submit" className="w-full">
            Desbloquear
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {selectedEntry ? "Detalles" : "Mi Vault"}
          </h1>
          <p className="text-sm text-zinc-400">
            {selectedEntry?.title ?? `${entries.length} entrada${entries.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {!selectedEntry && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Entrada
          </Button>
        )}
      </div>

      {selectedEntry ? (
        <VaultDetail
          entry={selectedEntry}
          revealed={revealedIds.has(selectedEntry.id)}
          onBack={() => {
            setSelectedEntry(null);
            setRevealedIds((prev) => {
              const next = new Set(prev);
              next.delete(selectedEntry.id);
              return next;
            });
          }}
          onRequestAction={requestGate}
          onHide={handleHide}
        />
      ) : (
        <>
          <VaultSearch />

          <VaultList
            entries={filteredEntries()}
            onRequestDetail={requestGate}
          />
        </>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nueva Entrada"
      >
        <VaultForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title="Editar Entrada"
      >
        {editingEntry && (
          <VaultForm
            initialData={editingEntry}
            onSubmit={handleEdit}
            onCancel={() => setEditingEntry(null)}
          />
        )}
      </Modal>

      <VerifyGateModal
        isOpen={!!gateTarget}
        action={gateAction}
        entryTitle={gateTarget?.title ?? ""}
        onSuccess={handleGateSuccess}
        onClose={handleGateClose}
      />
    </div>
  );
}
