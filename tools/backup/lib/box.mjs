// ============================================================
//  تشفير النسخة الاحتياطية قبل ما تسيب السيرفر.
//  البيانات فيها أرقام موبايلات وهاشات باسورد، فمينفعش تتبعت
//  لتليجرام/درايف/إيميل على شكلها.
//
//  الصيغة: ICTBK1 + salt(16) + iv(12) + tag(16) + ciphertext
//  المفتاح: scrypt(passphrase, salt) → AES-256-GCM
// ============================================================
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const MAGIC = Buffer.from('ICTBK1\n', 'utf8');
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const KDF = { N: 1 << 15, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };

export function encrypt(plain, passphrase) {
  if (!passphrase) throw new Error('BACKUP_PASSPHRASE مطلوبة للتشفير.');
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = scryptSync(String(passphrase), salt, 32, KDF);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), body]);
}

export function decrypt(packed, passphrase) {
  if (!Buffer.isBuffer(packed) || packed.length < MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN) {
    throw new Error('الملف صغير جدًا أو مش نسخة مشفّرة.');
  }
  if (!packed.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('الملف ده مش نسخة احتياطية مشفّرة بصيغة ICT.');
  }
  let at = MAGIC.length;
  const salt = packed.subarray(at, (at += SALT_LEN));
  const iv = packed.subarray(at, (at += IV_LEN));
  const tag = packed.subarray(at, (at += TAG_LEN));
  const body = packed.subarray(at);

  const key = scryptSync(String(passphrase), salt, 32, KDF);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(body), decipher.final()]);
  } catch {
    throw new Error('فك التشفير فشل — كلمة السر غلط أو الملف اتعدّل.');
  }
}

export const isEncrypted = packed =>
  Buffer.isBuffer(packed) && packed.length > MAGIC.length && packed.subarray(0, MAGIC.length).equals(MAGIC);
