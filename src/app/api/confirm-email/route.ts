import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const confirmSchema = z.object({
  userId: z.string().uuid("userId inválido"),
});

const CONFIRM_LIMIT = 20;
const CONFIRM_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const rl = checkRateLimit(`confirm:${ip}`, CONFIRM_LIMIT, CONFIRM_WINDOW_MS);

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta más tarde." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "userId inválido" }, { status: 400 });
    }

    const { userId } = parsed.data;
    const admin = createAdminClient();

    const { data: user, error: getUserError } =
      await admin.auth.admin.getUserById(userId);
    if (getUserError || !user.user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const { error } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (error) {
      console.error("Confirm error:", error.message);
      return NextResponse.json(
        { error: "Error confirmando email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ confirmed: true });
  } catch (err) {
    console.error("Confirm error:", err);
    return NextResponse.json(
      { error: "Error inesperado confirmando email" },
      { status: 500 }
    );
  }
}