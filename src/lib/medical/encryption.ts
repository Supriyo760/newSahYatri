import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const keyStr = process.env.MEDICAL_ENCRYPTION_KEY;
  if (!keyStr || keyStr.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MEDICAL_ENCRYPTION_KEY must be at least 32 characters in production');
    }
    return Buffer.from('default_32_char_fallback_key_for', 'utf-8');
  }
  return Buffer.from(keyStr.slice(0, 32), 'utf-8');
}

export function encrypt(data: object | string): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(str, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt<T>(ciphertext: string): T {
  // If it doesn't look like our GCM format, fail securely.
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encryption format or legacy crypto-js data');
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
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
  } catch (err) {
    console.warn('Failed to decrypt field:', err);
    return null;
  }
}
