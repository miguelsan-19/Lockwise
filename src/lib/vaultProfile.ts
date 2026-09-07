import { createClient } from "@/lib/supabase/client";

export interface VaultProfile {
  master_salt: string | null;
  verifier_ciphertext: string | null;
  verifier_iv: string | null;
  verifier_auth_tag: string | null;
}

export async function getVaultProfile(userId: string): Promise<VaultProfile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("master_salt, verifier_ciphertext, verifier_iv, verifier_auth_tag")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as VaultProfile;
}

export async function getMasterSalt(userId: string): Promise<string | null> {
  const profile = await getVaultProfile(userId);
  return profile?.master_salt || null;
}

export async function saveMasterSalt(
  userId: string,
  salt: string
): Promise<string | null> {
  const supabase = createClient();

  const existing = await getMasterSalt(userId).catch(() => null);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, master_salt: salt })
    .select("master_salt")
    .maybeSingle();

  if (error) {
    console.error("Error saving master salt:", error.message);
    return null;
  }
  return data?.master_salt || salt;
}

export async function savePasswordVerifier(
  userId: string,
  verifier: {
    ciphertext: string;
    iv: string;
    authTag: string;
  }
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    verifier_ciphertext: verifier.ciphertext,
    verifier_iv: verifier.iv,
    verifier_auth_tag: verifier.authTag,
  });

  if (error) {
    console.error("Error saving verifier:", error.message);
  }
}

export async function getPasswordVerifier(userId: string): Promise<{
  ciphertext: string;
  iv: string;
  authTag: string;
} | null> {
  const profile = await getVaultProfile(userId);
  if (
    !profile ||
    !profile.verifier_ciphertext ||
    !profile.verifier_iv ||
    !profile.verifier_auth_tag
  ) {
    return null;
  }
  return {
    ciphertext: profile.verifier_ciphertext,
    iv: profile.verifier_iv,
    authTag: profile.verifier_auth_tag,
  };
}
