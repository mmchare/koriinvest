import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.KORI_WALLET_ENCRYPTION_KEY;
  if (!raw) throw new Error("KORI_WALLET_ENCRYPTION_KEY missing");
  // Derive 32-byte key from arbitrary-length secret
  return createHash("sha256").update(raw).digest();
}

/** Encrypt a secret string → base64 payload (iv|tag|ciphertext). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}
