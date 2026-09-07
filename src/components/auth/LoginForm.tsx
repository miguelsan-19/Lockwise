"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { deriveMasterKeys, verifyMasterPassword } from "@/lib/crypto";
import { getMasterSalt, getPasswordVerifier } from "@/lib/masterSalt";
import { useVaultStore } from "@/hooks/useVault";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";

const REGISTERED_EMAIL_KEY = "lockwise_registered_email";

export function LoginForm() {
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const router = useRouter();

  // El email se recupera de localStorage (recordado al registrarse)
  const registeredEmail =
    typeof window !== "undefined"
      ? localStorage.getItem(REGISTERED_EMAIL_KEY)
      : null;

  const setKeys = useVaultStore((s) => s.setKeys);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("submitting");

    try {
      if (!registeredEmail) {
        setError(
          "No hay una cuenta configurada en este navegador. Regístrate primero."
        );
        setStatus("idle");
        return;
      }

      const supabase = createClient();

      // Autenticamos en Supabase usando la contraseña maestra como password
      // (la misma se usó al crear la cuenta)
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: registeredEmail,
          password: masterPassword,
        });

      if (authError) {
        setError("Contraseña maestra incorrecta.");
        setStatus("idle");
        return;
      }

      const userId = authData.user.id;

      // Recuperar salt y verifier
      let salt =
        localStorage.getItem(`lockwise_salt_${userId}`) ||
        (await getMasterSalt(userId));

      let verifier = await getPasswordVerifier(userId);

      if (!salt) {
        setError(
          "Configuración de cifrado no encontrada. Inicia sesión desde el navegador donde configuraste tu cuenta."
        );
        setStatus("idle");
        return;
      }

      const { encryptionKey, verifierKey } = await deriveMasterKeys(
        masterPassword,
        salt
      );

      if (!verifier) {
        // Sin verifier no podemos comprobar la maestra de forma segura.
        // NUNCA crear uno nuevo sin validar: eso permitiría entrar sin la maestra.
        setError(
          "Configuración de seguridad incompleta. Inicia sesión desde el navegador donde configuraste tu cuenta."
        );
        await supabase.auth.signOut();
        setStatus("idle");
        return;
      }

      const valid = await verifyMasterPassword(
        verifierKey,
        verifier.ciphertext,
        verifier.iv,
        verifier.authTag
      );
      if (!valid) {
        setError("Contraseña maestra incorrecta.");
        setStatus("idle");
        return;
      }

      // Persistimos salt para multi-dispositivo
      localStorage.setItem(`lockwise_salt_${userId}`, salt);
      if (!(await getMasterSalt(userId))) {
        const { saveMasterSalt } = await import("@/lib/masterSalt");
        await saveMasterSalt(userId, salt);
      }

      setKeys({ encryptionKey, verifierKey, salt });
      router.push("/vault");
    } catch (err) {
      console.error("Login error:", err);
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
      setStatus("idle");
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-8 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-100">Lockwise</h1>
        <p className="mt-2 text-zinc-400">
          Desbloquea tu vault con tu contraseña maestra
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordInput
          id="masterPassword"
          label="Contraseña Maestra"
          placeholder="••••••••"
          value={masterPassword}
          onChange={(e) => setMasterPassword(e.target.value)}
          required
          autoFocus
        />

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={status === "submitting"}>
          {status === "submitting" ? "Desbloqueando..." : "Desbloquear"}
        </Button>
      </form>
    </div>
  );
}

export function setRegisteredEmail(email: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(REGISTERED_EMAIL_KEY, email);
  }
}
