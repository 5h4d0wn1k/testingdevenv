import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ORDER_ENCRYPTION_KEY || process.env.SMTP_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ORDER_ENCRYPTION_KEY or SMTP_ENCRYPTION_KEY environment variable is not set');
}

// Encrypt sensitive data
export function encrypt(text) {
  if (!text) return text;
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

// Decrypt sensitive data
export function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedText; // Return as-is if decryption fails
  }
}

// Encrypt sensitive fields in an object
export function encryptObject(obj, sensitiveFields = []) {
  if (!obj || typeof obj !== 'object') return obj;

  const encrypted = { ...obj };

  sensitiveFields.forEach(field => {
    if (encrypted[field]) {
      encrypted[field] = encrypt(encrypted[field]);
    }
  });

  return encrypted;
}

// Decrypt sensitive fields in an object
export function decryptObject(obj, sensitiveFields = []) {
  if (!obj || typeof obj !== 'object') return obj;

  const decrypted = { ...obj };

  sensitiveFields.forEach(field => {
    if (decrypted[field]) {
      decrypted[field] = decrypt(decrypted[field]);
    }
  });

  return decrypted;
}

// Sensitive fields for different entities
export const SENSITIVE_FIELDS = {
  ADDRESS: ['name', 'email', 'phone', 'street'],
  USER: ['name', 'email'],
  ORDER: ['notes'], // If orders have sensitive notes
  PAYMENT: ['cardNumber', 'cvv', 'expiryDate'], // For future payment data
  VENDOR_PROFILE: [
    'taxId',
    'bankName',
    'accountNumber',
    'routingNumber',
    'accountHolderName',
    'bankAddress'
  ]
};