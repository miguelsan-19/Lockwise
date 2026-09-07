import type { SupabaseClient } from "@supabase/supabase-js";

export interface TotpEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

export async function getVerifiedTotpFactor(
  supabase: SupabaseClient
): Promise<{ id: string; friendlyName?: string } | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return null;
  const factor = data.totp?.[0];
  return factor ? { id: factor.id, friendlyName: factor.friendly_name } : null;
}

export async function verifyTotpCode(
  supabase: SupabaseClient,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const factor = await getVerifiedTotpFactor(supabase);
  if (!factor) {
    return { success: false, error: "Autenticador no configurado." };
  }
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code,
  });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function enrollTotp(
  supabase: SupabaseClient
): Promise<{ success: boolean; data?: TotpEnrollment; error?: string }> {
  // Limpiar factores TOTP a medias de intentos previos
  const { data: listData } = await supabase.auth.mfa.listFactors();
  const unverified = (listData?.all ?? []).filter(
    (f) =>
      (f as { type?: string }).type === "totp" &&
      (f as { status?: string }).status === "unverified"
  );
  for (const f of unverified) {
    await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Google Authenticator",
    issuer: "Lockwise",
  });

  if (error || !data) {
    return { success: false, error: error?.message };
  }

  return {
    success: true,
    data: {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    },
  };
}

export async function confirmEnrollment(
  supabase: SupabaseClient,
  factorId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function disableTotp(
  supabase: SupabaseClient,
  factorId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  // Unenroll requiere sesión AAL2: primero verificar un código vigente
  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });
  if (verifyError) {
    return { success: false, error: verifyError.message };
  }
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}