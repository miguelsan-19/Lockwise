"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { deriveMasterKeys, createPasswordVerifier } from "@/lib/crypto";
import { saveMasterSalt, savePasswordVerifier } from "@/lib/masterSalt";
import { useVaultStore } from "@/hooks/useVault";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setKeys = useVaultStore((s) => s.setKeys);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLoading) return;

    if (masterPassword !== confirmMasterPassword) {
      setError("La contraseña maestra no coincide en ambos campos");
      return;
    }

    if (masterPassword.length < 12) {
      setError("La contraseña maestra debe tener al menos 12 caracteres");
      return;
    }

    setIsLoading(true);

    // Registro server-side: crea el usuario YA confirmado sin enviar
    // email de confirmación (evita el rate limit del proveedor de email)
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: masterPassword }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "Error al crear la cuenta");
      setIsLoading(false);
      return;
    }

    if (result.userId) {
      const userId = result.userId;

      // Iniciar sesión automáticamente para obtener el JWT (RLS)
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email,
        password: masterPassword,
      });

      // Generar salt y verifier
      const { encryptionKey, verifierKey, salt } = await deriveMasterKeys(
        masterPassword
      );
      const verifier = await createPasswordVerifier(verifierKey);

      // Recordar el email para el login futuro (solo contraseña maestra)
      localStorage.setItem("lockwise_registered_email", email);

      localStorage.setItem(`lockwise_salt_${userId}`, salt);
      localStorage.setItem(`lockwise_verifier_${userId}`, JSON.stringify(verifier));

      // Intentar subir al servidor (si hay sesión)
      try {
        await saveMasterSalt(userId, salt);
        await savePasswordVerifier(userId, verifier);
      } catch (err) {
        console.error("Error saving profile:", err);
      }

      setKeys({ encryptionKey, verifierKey, salt });
      router.push("/vault");
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-8 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-100">Lockwise</h1>
        <p className="mt-2 text-zinc-400">Crea tu vault seguro</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <PasswordInput
          id="masterPassword"
          label="Contraseña Maestra (mínimo 12 caracteres)"
          placeholder="••••••••••••"
          value={masterPassword}
          onChange={(e) => setMasterPassword(e.target.value)}
          required
        />

        <PasswordInput
          id="confirmMasterPassword"
          label="Confirmar Contraseña Maestra"
          placeholder="••••••••••••"
          value={confirmMasterPassword}
          onChange={(e) => setConfirmMasterPassword(e.target.value)}
          required
        />

        <p className="text-xs text-zinc-500">
          Solo necesitas el email una vez al crear tu cuenta. A partir de
          entonces, desbloquearás tu vault con tu contraseña maestra.
        </p>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-400">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-emerald-400 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
