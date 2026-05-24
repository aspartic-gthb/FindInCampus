import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const IV_LENGTH = 16;

/** Stable 32-byte key so messages survive server restarts in dev. */
function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || 'findincampus-dev-encryption-key';
  return crypto.createHash('sha256').update(raw).digest();
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
