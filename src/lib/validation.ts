import { z } from "zod";

export const vaultEntrySchema = z
  .object({
    title: z
      .string()
      .min(1, "El título es obligatorio")
      .max(200, "El título es demasiado largo")
      .trim(),
    username: z
      .string()
      .min(1, "El usuario es obligatorio")
      .max(200, "El usuario es demasiado largo")
      .trim(),
    password: z
      .string()
      .min(1, "La contraseña es obligatoria")
      .max(500, "La contraseña es demasiado larga"),
    url: z
      .string()
      .url("URL inválida")
      .refine((u) => {
        try {
          const p = new URL(u);
          return ["http:", "https:"].includes(p.protocol);
        } catch {
          return false;
        }
      }, "Solo se permiten URLs http/https")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    notes: z
      .string()
      .max(2000, "Las notas son demasiado largas")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    category: z
      .enum(["social", "email", "finance", "shopping", "work", "other"])
      .default("other"),
  })
  .refine((data) => data.password.length >= 1, {
    message: "La contraseña no puede estar vacía",
  });
