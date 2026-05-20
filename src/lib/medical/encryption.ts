import CryptoJS from 'crypto-js';

const KEY = process.env.MEDICAL_ENCRYPTION_KEY!;

if (!KEY || KEY.length < 32) {
  throw new Error('MEDICAL_ENCRYPTION_KEY must be at least 32 characters');
}

export function encrypt(data: object | string): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return CryptoJS.AES.encrypt(str, KEY).toString();
}

export function decrypt<T>(ciphertext: string): T {
  const bytes = CryptoJS.AES.decrypt(ciphertext, KEY);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(decrypted) as T;
}

export function encryptField(value: object | null | undefined): string | null {
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
