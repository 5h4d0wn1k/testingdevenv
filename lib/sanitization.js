import DOMPurify from 'isomorphic-dompurify';

// Sanitization utilities for input data

// Sanitize string input - remove HTML tags and potentially dangerous characters
export function sanitizeString(str, options = {}) {
  if (!str || typeof str !== 'string') return str;

  const {
    allowHtml = false,
    maxLength = null,
    trim = true
  } = options;

  let sanitized = str;

  if (trim) {
    sanitized = sanitized.trim();
  }

  if (!allowHtml) {
    // Use DOMPurify to remove HTML tags
    sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });
  }

  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

// Sanitize email - basic email validation and sanitization
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return email;

  const sanitized = email.trim().toLowerCase();

  // Basic email regex for additional validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  return sanitized;
}

// Sanitize phone number - remove non-numeric characters except + and spaces
export function sanitizePhone(phone) {
  if (!phone || typeof phone !== 'string') return phone;

  // Remove all characters except digits, spaces, hyphens, parentheses, and +
  const sanitized = phone.replace(/[^\d\s\-\(\)\+]/g, '');

  // Ensure it starts with + or digit
  if (!/^[\+\d]/.test(sanitized)) {
    throw new Error('Invalid phone number format');
  }

  return sanitized;
}

// Sanitize address fields
export function sanitizeAddress(address) {
  if (!address || typeof address !== 'object') return address;

  const sanitized = { ...address };

  // Sanitize text fields
  const textFields = ['name', 'street', 'city', 'state', 'country'];
  textFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeString(sanitized[field], { maxLength: 255 });
    }
  });

  // Sanitize email
  if (sanitized.email) {
    sanitized.email = sanitizeEmail(sanitized.email);
  }

  // Sanitize phone
  if (sanitized.phone) {
    sanitized.phone = sanitizePhone(sanitized.phone);
  }

  // Sanitize zip code - allow alphanumeric and spaces/hyphens
  if (sanitized.zip) {
    sanitized.zip = sanitized.zip.replace(/[^\w\s\-]/g, '').substring(0, 20);
  }

  return sanitized;
}

// Sanitize order items
export function sanitizeOrderItems(items) {
  if (!Array.isArray(items)) return items;

  return items.map(item => ({
    id: sanitizeString(item.id, { maxLength: 100 }),
    quantity: Math.max(1, Math.min(1000, parseInt(item.quantity) || 1)), // Clamp between 1-1000
    name: sanitizeString(item.name, { maxLength: 255 })
  }));
}

// Sanitize coupon code
export function sanitizeCouponCode(code) {
  if (!code || typeof code !== 'string') return code;

  // Allow only alphanumeric characters, hyphens, and underscores
  return code.replace(/[^a-zA-Z0-9\-_]/g, '').toUpperCase().substring(0, 50);
}

// General object sanitizer
export function sanitizeObject(obj, schema) {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = { ...obj };

  Object.keys(schema).forEach(key => {
    const sanitizer = schema[key];
    if (typeof sanitizer === 'function' && sanitized[key] !== undefined) {
      try {
        sanitized[key] = sanitizer(sanitized[key]);
      } catch (error) {
        throw new Error(`Validation failed for ${key}: ${error.message}`);
      }
    }
  });

  return sanitized;
}

// Sanitization schemas for different entities
export const SANITIZATION_SCHEMAS = {
  ADDRESS: {
    name: (val) => sanitizeString(val, { maxLength: 100 }),
    email: sanitizeEmail,
    phone: sanitizePhone,
    street: (val) => sanitizeString(val, { maxLength: 255 }),
    city: (val) => sanitizeString(val, { maxLength: 100 }),
    state: (val) => sanitizeString(val, { maxLength: 100 }),
    zip: (val) => sanitizeString(val, { maxLength: 20 }),
    country: (val) => sanitizeString(val, { maxLength: 100 })
  },
  ORDER: {
    couponCode: sanitizeCouponCode,
    items: sanitizeOrderItems
  },
  STORE: {
    name: (val) => sanitizeString(val, { maxLength: 100 }),
    username: (val) => sanitizeString(val, { maxLength: 50 }),
    description: (val) => sanitizeString(val, { maxLength: 1000 }),
    email: sanitizeEmail,
    contact: sanitizePhone,
    address: (val) => sanitizeString(val, { maxLength: 255 })
  },
  USER_PROFILE: {
    name: (val) => sanitizeString(val, { maxLength: 100 }),
    phone: sanitizePhone,
    notificationPreferences: (val) => val // JSON, assume it's validated elsewhere
  },
  VENDOR_PROFILE: {
    businessName: (val) => sanitizeString(val, { maxLength: 100 }),
    taxId: (val) => sanitizeString(val, { maxLength: 50 }), // Tax IDs can be alphanumeric
    businessAddress: (val) => sanitizeString(val, { maxLength: 500 }),
    contactPerson: (val) => sanitizeString(val, { maxLength: 100 }),
    phone: sanitizePhone,
    website: (val) => sanitizeString(val, { maxLength: 255 }),
    description: (val) => sanitizeString(val, { maxLength: 1000 }),
    bankName: (val) => sanitizeString(val, { maxLength: 100 }),
    accountNumber: (val) => sanitizeString(val, { maxLength: 50 }), // Bank accounts can have various formats
    routingNumber: (val) => sanitizeString(val.replace(/[^\d]/g, ''), { maxLength: 20 }), // Only digits
    accountHolderName: (val) => sanitizeString(val, { maxLength: 100 }),
    bankAddress: (val) => sanitizeString(val, { maxLength: 500 }),
    logoUrl: (val) => sanitizeString(val, { maxLength: 500 }),
    bannerUrl: (val) => sanitizeString(val, { maxLength: 500 }),
    primaryColor: (val) => sanitizeString(val, { maxLength: 7 }), // Hex color codes
    secondaryColor: (val) => sanitizeString(val, { maxLength: 7 }),
    aboutPage: (val) => sanitizeString(val, { maxLength: 5000 }),
    customDomain: (val) => sanitizeString(val, { maxLength: 255 }),
    seoTitle: (val) => sanitizeString(val, { maxLength: 100 }),
    seoDescription: (val) => sanitizeString(val, { maxLength: 255 }),
    seoKeywords: (val) => sanitizeString(val, { maxLength: 500 })
  }
};