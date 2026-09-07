import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const registerSchema = z.object({
  email: z.string().email("Email inválido").max(200).trim().toLowerCase(),
  password: z
    .string()
    .min(12, "La contraseña maestra debe tener al menos 12 caracteres")
    .max(200, "La contraseña es demasiado larga"),
});

const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const rl = checkRateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);

  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Demasiados intentos. Espera ${Math.ceil(rl.retryAfterSeconds / 60)} min.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: first?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const admin = createAdminClient();

    // Crear usuario YA confirmado (sin enviar email de confirmación)
    // Esto evita el rate limit del proveedor de email.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      // No revelar si el email existe o no
      return NextResponse.json(
        { error: "No se pudo crear la cuenta." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { userId: data.user.id, email: data.user.email },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json(
      { error: "Error inesperado creando el usuario" },
      { status: 500 }
    );
  }
}