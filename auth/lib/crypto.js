import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCODING = 'hex';

/**
 * Derive encryption key from environment variable
 * The ENCRYPTION_KEY should be a 32-byte key (base64 encoded)
 * @returns {Buffer} Encryption key
 */
function getEncryptionKey() {
  const keyStr = process.env.ENCRYPTION_KEY;
  if (!keyStr) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  // Expect base64-encoded 32-byte key
  const key = Buffer.from(keyStr, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes');
  }
  return key;
}

/**
 * Encrypt a string using AES-256-GCM
 * @param {string} plaintext - The text to encrypt
 * @returns {Object} { encrypted: string, iv: string, authTag: string }
 */
export function encryptCredential(plaintext) {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(16); // 128-bit IV for GCM
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString(ENCODING),
      authTag: authTag.toString(ENCODING),
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt a string using AES-256-GCM
 * @param {string} encrypted - The encrypted text
 * @param {string} iv - The initialization vector (hex)
 * @param {string} authTag - The authentication tag (hex)
 * @returns {string} Decrypted plaintext
 */
export function decryptCredential(encrypted, iv, authTag) {
  try {
    const key = getEncryptionKey();
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, ENCODING)
    );

    decipher.setAuthTag(Buffer.from(authTag, ENCODING));

    let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypt sauna credentials object
 * @param {Object} credentials - { email, password }
 * @returns {Object} { encryptedEmail, ivEmail, authTagEmail, encryptedPassword, ivPassword, authTagPassword }
 */
export function encryptSaunaCredentials(credentials) {
  const emailEncrypted = encryptCredential(credentials.email);
  const passwordEncrypted = encryptCredential(credentials.password);

  return {
    encryptedEmail: emailEncrypted.encrypted,
    ivEmail: emailEncrypted.iv,
    authTagEmail: emailEncrypted.authTag,
    encryptedPassword: passwordEncrypted.encrypted,
    ivPassword: passwordEncrypted.iv,
    authTagPassword: passwordEncrypted.authTag,
  };
}

/**
 * Decrypt sauna credentials from database record
 * @param {Object} record - Database record with encrypted credentials
 * @returns {Object} { email, password }
 */
export function decryptSaunaCredentials(record) {
  const email = decryptCredential(
    record.encrypted_email,
    record.iv_email,
    record.auth_tag_email
  );
  const password = decryptCredential(
    record.encrypted_password,
    record.iv_password,
    record.auth_tag_password
  );

  return { email, password };
}
