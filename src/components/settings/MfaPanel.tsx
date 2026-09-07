"use client";

import { useEffect, useState } from "react";
import { Smartphone, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getVerifiedTotpFactor,
  enrollTotp,
  confirmEnrollment,
  disableTotp,
  type TotpEnrollment,
} from "@/lib/mfa";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function MfaPanel() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = async () => {
    const supabase = createClient();
    const factor = await getVerifiedTotpFactor(supabase);
    setFactorId(factor?.id ?? null);
    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleEnroll = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    const result = await enrollTotp(supabase);
    if (!result.success || !result.data) {
      setError(result.error || "No se pudo configurar el autenticador.");
      setBusy(false);
      return;
    }
    setEnrollment(result.data);
    setBusy(false);
  };

  const handleConfirm = async () => {
    if (!enrollment) return;
    setBusy(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    const result = await confirmEnrollment(supabase, enrollment.factorId, code);
    if (!result.success) {
      setError(result.error || "Código inválido. Intenta de nuevo.");
      setBusy(false);
      return;
    }
    setEnrollment(null);
    setCode("");
    setBusy(false);
    await refresh();
    setMessage("Autenticador configurado correctamente.");
  };

  const handleCancelEnroll = async () => {
    if (!enrollment) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
    setEnrollment(null);
    setCode("");
    setBusy(false);
  };

  const handleDisable = async () => {
    if (!factorId) return;
    if (!code) {
      setError("Ingresa el código actual de tu autenticador.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    const result = await disableTotp(supabase, factorId, code);
    if (!result.success) {
      setError(result.error || "No se pudo desactivar el autenticador.");
      setBusy(false);
      return;
    }
    setCode("");
    setFactorId(null);
    setBusy(false);
    setMessage("Autenticador desactivado.");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-zinc-100">
              Google Authenticator
            </p>
            <p className="text-xs text-zinc-400">
              {factorId
                ? "Se pide el código para revelar cada contraseña"
                : "Añade una capa extra al revelar contraseñas"}
            </p>
          </div>
        </div>
        {factorId ? (
          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
            Activo
          </span>
        ) : (
          <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-500">
            Inactivo
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          {message}
        </p>
      )}

      {!factorId && !enrollment && (
        <Button onClick={handleEnroll} disabled={busy} className="w-full">
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Smartphone className="mr-2 h-4 w-4" />
          )}
          Configurar Google Authenticator
        </Button>
      )}

      {enrollment && (
        <div className="space-y-3 rounded-lg bg-zinc-800/50 p-4">
          <p className="text-sm font-medium text-zinc-100">
            Escanea este código con Google Authenticator
          </p>
          <div className="flex justify-center">
            <img
              src={`data:image/svg+xml;utf-8,${encodeURIComponent(
                enrollment.qrCode
              )}`}
              alt="Código QR de autenticación"
              className="h-48 w-48 rounded-lg bg-white p-2"
            />
          </div>
          <p className="text-center text-xs text-zinc-400">
            O ingresa manualmente:{" "}
            <span className="font-mono text-zinc-300">{enrollment.secret}</span>
          </p>
          <Input
            id="totpCode"
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
          <div className="flex gap-2">
            <Button onClick={handleConfirm} disabled={busy || code.length !== 6}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Verificar y activar
            </Button>
            <Button
              variant="secondary"
              onClick={handleCancelEnroll}
              disabled={busy}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {factorId && (
        <div className="space-y-2 rounded-lg bg-zinc-800/50 p-4">
          <p className="text-xs text-zinc-400">
            Para desactivar, ingresa el código actual de tu autenticador:
          </p>
          <Input
            id="totpDisableCode"
            label="Código de 6 dígitos"
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
          />
          <Button
            variant="danger"
            onClick={handleDisable}
            disabled={busy || code.length !== 6}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Desactivar autenticador
          </Button>
        </div>
      )}
    </div>
  );
}