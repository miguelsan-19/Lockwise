"use client";

import { useEffect, useState } from "react";
import { Loader2, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { verifyTotpCode, getVerifiedTotpFactor } from "@/lib/mfa";
import { getMasterSalt, getPasswordVerifier } from "@/lib/masterSalt";
import { deriveMasterKeys, verifyMasterPassword } from "@/lib/crypto";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

interface RevealGateModalProps {
  isOpen: boolean;
  entryTitle: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function RevealGateModal({
  isOpen,
  entryTitle,
  onSuccess,
  onClose,
}: RevealGateModalProps) {
  const [mode, setMode] = useState<"checking" | "totp" | "password">(
    "checking"
  );
  const [code, setCode] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCode("");
      setMasterPassword("");
      setError("");
      setMode("checking");
      const supabase = createClient();
      getVerifiedTotpFactor(supabase).then((factor) => {
        setMode(factor ? "totp" : "password");
      });
    }
  }, [isOpen]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    if (mode === "totp") {
      if (code.length !== 6) {
        setError("Ingresa el código de 6 dígitos.");
        setBusy(false);
        return;
      }
      const supabase = createClient();
      const result = await verifyTotpCode(supabase, code);
      if (!result.success) {
        setError("Código inválido o expirado.");
        setBusy(false);
        return;
      }
    } else {
      if (!masterPassword) {
        setError("Ingresa tu contraseña maestra.");
        setBusy(false);
        return;
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Sesión no válida. Inicia sesión de nuevo.");
        setBusy(false);
        return;
      }

      const salt =
        localStorage.getItem(`lockwise_salt_${user.id}`) ||
        (await getMasterSalt(user.id));
      const verifier = await getPasswordVerifier(user.id);

      if (!salt || !verifier) {
        setError("Configuración de seguridad incompleta.");
        setBusy(false);
        return;
      }

      const { verifierKey } = await deriveMasterKeys(masterPassword, salt);
      const valid = await verifyMasterPassword(
        verifierKey,
        verifier.ciphertext,
        verifier.iv,
        verifier.authTag
      );

      if (!valid) {
        setError("Contraseña maestra incorrecta.");
        setBusy(false);
        return;
      }
    }

    setBusy(false);
    onSuccess();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ver contraseña">
      <form onSubmit={handleVerify} className="space-y-4">
        <p className="text-sm text-zinc-400">
          Para ver la contraseña de{" "}
          <span className="font-medium text-zinc-100">{entryTitle}</span>{" "}
          {mode === "totp"
            ? "ingresa el código de 6 dígitos de Google Authenticator."
            : "ingresa tu contraseña maestra."}
        </p>

        {mode === "totp" && (
          <Input
            id="revealTotpCode"
            label="Código de 6 dígitos"
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            autoFocus
          />
        )}

        {mode === "password" && (
          <PasswordInput
            id="revealMasterPassword"
            label="Contraseña maestra"
            placeholder="Tu contraseña maestra"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            autoFocus
          />
        )}

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={busy}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Ver contraseña
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}