"use client";

import { Shield, Smartphone } from "lucide-react";
import { useVaultStore } from "@/hooks/useVault";
import { MfaPanel } from "@/components/settings/MfaPanel";

export default function SettingsPage() {
  const entries = useVaultStore((s) => s.entries);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Configuración</h1>
        <p className="text-sm text-zinc-400">Gestiona tu cuenta y seguridad</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-zinc-100">Seguridad</h2>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  Cifrado E2EE
                </p>
                <p className="text-xs text-zinc-400">
                  Tus datos se cifran con AES-256-GCM
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
                Activo
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  Derivación de Key
                </p>
                <p className="text-xs text-zinc-400">
                  PBKDF2 con 600,000 iteraciones
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
                Activo
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  Entradas en Vault
                </p>
                <p className="text-xs text-zinc-400">
                  Total de contraseñas almacenadas
                </p>
              </div>
              <span className="text-sm font-medium text-zinc-100">
                {entries.length}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-zinc-100">
              Autenticación en Dos Pasos
            </h2>
          </div>
          <MfaPanel />
        </div>
      </div>
    </div>
  );
}
