import CryptoJS from 'crypto-js';

function getKey(): string {
  const key = process.env.MEDICAL_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    return 'default_32_char_fallback_key_for_build_purposes';
  }
  return key;
}

export function encrypt(data: object | string): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return CryptoJS.AES.encrypt(str, getKey()).toString();
}

export function decrypt<T>(ciphertext: string): T {
  const bytes = CryptoJS.AES.decrypt(ciphertext, getKey());
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return decrypted as unknown as T;
  }
}

export function encryptField(value: object | string | null | undefined): string | null {
  if (!value) return null;
  return encrypt(value);
}

export function decryptField<T>(ciphertext: string | null | undefined): T | null {
  if (!ciphertext) return null;
  try {
    return decrypt<T>(ciphertext);
  } catch {
    return null;
  }
}
