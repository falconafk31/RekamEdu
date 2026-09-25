import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ============================================================================
// Enkripsi AES-256-GCM untuk API key AI milik Owner (tabel ai_models).
// - Kunci dibaca dari env ENCRYPTION_KEY: WAJIB 64 karakter hex (= 32 byte).
//   Contoh membuat:  openssl rand -hex 32
// - Format output: "iv:authTag:ciphertext" (masing-masing base64).
// - Key TIDAK PERNAH dikirim ke frontend; hanya dipakai di backend.
// ============================================================================

const IV_LENGTH_BYTES = 12; // ukuran IV yang direkomendasikan untuk GCM

// Mengambil & memvalidasi kunci enkripsi dari environment.
function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'ENCRYPTION_KEY tidak valid: harus 64 karakter hex (32 byte). ' +
        'Contoh membuatnya: openssl rand -hex 32',
    );
  }
  return Buffer.from(hex, 'hex');
}

// Mengenkripsi plaintext menjadi string "iv:authTag:ciphertext" (base64).
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

// Mendekripsi string "iv:authTag:ciphertext" (base64) kembali ke plaintext.
// Melempar bila format rusak atau autentikasi GCM gagal (key/isi salah).
export function decrypt(payload: string): string {
  const key = getKey();
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Format ciphertext tidak valid: harus "iv:authTag:ciphertext".');
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  if (iv.length !== IV_LENGTH_BYTES) {
    throw new Error('IV tidak valid untuk AES-256-GCM.');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}
