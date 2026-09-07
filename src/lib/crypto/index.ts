const PBKDF2_ITERATIONS = 600000;
const SALT_LENGTH = 32;

export interface MasterKeyMaterial {
  encryptionKey: CryptoKey;
  verifierKey: CryptoKey;
  salt: string;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(
    (hex.match(/.{1,2}/g) || []).map((b) => parseInt(b, 16))
  );
  return bytes.buffer as ArrayBuffer;
}

function noHex(hex: string): boolean {
  return !/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0;
}

async function importMaterial(
  password: string,
  saltBuffer: ArrayBuffer,
  purpose: string
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt:
        purpose === ""
          ? saltBuffer
          : await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(
                bufferToHex(saltBuffer) + purpose
              )
            ),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function generateSalt(): Promise<string> {
  return bufferToHex(crypto.getRandomValues(new Uint8Array(SALT_LENGTH)).buffer);
}

export async function deriveMasterKeys(
  password: string,
  salt?: string
): Promise<MasterKeyMaterial> {
  const saltValue = salt && !noHex(salt) ? salt : await generateSalt();
  const saltBuffer = hexToBuffer(saltValue);

  const [encryptionKey, verifierKey] = await Promise.all([
    importMaterial(password, saltBuffer, "lockwise-vault-encryption"),
    importMaterial(password, saltBuffer, "lockwise-vault-verifier"),
  ]);

  return { encryptionKey, verifierKey, salt: saltValue };
}

export async function createPasswordVerifier(
  verifierKey: CryptoKey
): Promise<{ ciphertext: string; iv: string; authTag: string }> {
  const randomValue = crypto.getRandomValues(new Uint8Array(32));
  return encryptWithKey(verifierKey, bufferToHex(randomValue.buffer), "verifier");
}

export async function verifyMasterPassword(
  verifierKey: CryptoKey,
  verifierCiphertext: string,
  verifierIv: string,
  verifierAuthTag: string
): Promise<boolean> {
  try {
    await decryptWithKey(
      verifierKey,
      verifierCiphertext,
      verifierIv,
      verifierAuthTag,
      "verifier"
    );
    return true;
  } catch {
    return false;
  }
}

export async function encryptForVault(
  encryptionKey: CryptoKey,
  plaintext: string,
  userId: string
): Promise<{ ciphertext: string; iv: string; authTag: string }> {
  return encryptWithKey(encryptionKey, plaintext, `vault:${userId}`);
}

export async function decryptFromVault(
  encryptionKey: CryptoKey,
  ciphertext: string,
  iv: string,
  authTag: string,
  userId: string
): Promise<string> {
  return decryptWithKey(
    encryptionKey,
    ciphertext,
    iv,
    authTag,
    `vault:${userId}`
  );
}

async function encryptWithKey(
  key: CryptoKey,
  plaintext: string,
  aad: string
): Promise<{ ciphertext: string; iv: string; authTag: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aadBuffer = new TextEncoder().encode(aad);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: aadBuffer,
    },
    key,
    new TextEncoder().encode(plaintext)
  );

  const encryptedBuffer = new Uint8Array(encrypted);
  const authTag = encryptedBuffer.slice(-16);
  const ciphertext = encryptedBuffer.slice(0, -16);

  return {
    ciphertext: bufferToHex(ciphertext.buffer),
    iv: bufferToHex(iv.buffer),
    authTag: bufferToHex(authTag.buffer),
  };
}

async function decryptWithKey(
  key: CryptoKey,
  ciphertext: string,
  iv: string,
  authTag: string,
  aad: string
): Promise<string> {
  const aadBuffer = new TextEncoder().encode(aad);

  const combined = new Uint8Array([
    ...new Uint8Array(hexToBuffer(ciphertext)),
    ...new Uint8Array(hexToBuffer(authTag)),
  ]);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(hexToBuffer(iv)),
      additionalData: aadBuffer,
    },
    key,
    combined
  );

  return new TextDecoder().decode(decrypted);
}
