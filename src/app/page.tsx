import Link from "next/link";
import { Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-2xl bg-emerald-500/10 p-4">
            <Shield className="h-12 w-12 text-emerald-500" />
          </div>
        </div>

        <h1 className="text-5xl font-bold text-zinc-100">Lockwise</h1>
        <p className="mt-4 max-w-md text-lg text-zinc-400">
          Gestor de contraseñas con cifrado extremo a extremo. Tus secretos
          nunca salen de tu dispositivo en claro.
        </p>

        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
          >
            Crear Cuenta
          </Link>
        </div>

        <div className="mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="font-semibold text-zinc-100">Cifrado E2EE</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Tus datos se cifran antes de salir de tu dispositivo
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="font-semibold text-zinc-100">Zero Knowledge</h3>
            <p className="mt-2 text-sm text-zinc-400">
              El servidor nunca ve tus contraseñas en claro
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="font-semibold text-zinc-100">Open Source</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Código abierto, auditable por la comunidad
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
