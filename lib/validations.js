import { z } from 'zod';

// Supported currencies for validation
const supportedCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD'];

// Currency validation schema
export const currencySchema = z.string().refine(
  val => supportedCurrencies.includes(val),
  `Unsupported currency. Supported currencies: ${supportedCurrencies.join(', ')}`
);

// Address schema for POST /api/address
export const addressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip: z.string().min(1, 'Zip code is required'),
  country: z.string().min(1, 'Country is required'),
  phone: z.string().min(1, 'Phone is required'),
});

// Approve store schema for POST /api/admin/approve-store
export const approveStoreSchema = z.object({
  storeId: z.string().min(1, 'Store ID is required'),
  status: z.enum(['approved', 'rejected'], 'Status must be approved or rejected'),
});

// Commission schema for POST /api/admin/commissions
export const commissionSchema = z.object({
  storeId: z.string().min(1, 'Store ID is required'),
  rate: z.number().min(0).max(100, 'Rate must be between 0 and 100'),
});

// Commission rate schema for POST /api/admin/stores/[id]
export const commissionRateSchema = z.object({
  rate: z.number().min(0).max(100, 'Rate must be between 0 and 100'),
});

// Coupon schema for POST /api/admin/coupon
export const couponSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  description: z.string().min(1, 'Description is required'),
  discount: z.number().min(0).max(100, 'Discount must be between 0 and 100'),
  forNewUser: z.boolean(),
  forMember: z.boolean().optional(),
  isPublic: z.boolean(),
  expiresAt: z.string().datetime('Invalid date'),
});

// Payout status query for GET /api/admin/payouts
export const payoutStatusQuerySchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'FAILED']).optional(),
});

// Payout create schema for POST /api/admin/payouts/create
export const payoutCreateSchema = z.object({
  storeId: z.string().optional(),
});

// Platform settings schema for PUT/PATCH /api/admin/settings
export const platformSettingsSchema = z.object({
   siteName: z.string().optional(),
   logoUrl: z.string().optional(),
   faviconUrl: z.string().optional(),
   defaultLanguage: z.string().optional(),
   supportedLanguages: z.array(z.string()).optional(),
   maintenanceEnabled: z.boolean().optional(),
   maintenanceMessage: z.string().optional(),
   primaryColor: z.string().optional(),
   facebookUrl: z.string().optional(),
   twitterUrl: z.string().optional(),
   instagramUrl: z.string().optional(),
   linkedinUrl: z.string().url('Invalid LinkedIn URL').optional(),
   youtubeUrl: z.string().url('Invalid YouTube URL').optional(),
   tiktokUrl: z.string().url('Invalid TikTok URL').optional(),
   baseCurrency: currencySchema.optional(),
   exchangeRates: z.any().optional(),
   analyticsEnabled: z.boolean().optional(),
   googleAnalyticsId: z.string().regex(/^G-[A-Z0-9]{10}$|^UA-\d{4,10}-\d{1,2}$/, 'Invalid Google Analytics ID').optional().or(z.literal('')),
   facebookPixelId: z.string().regex(/^\d{15,16}$/, 'Invalid Facebook Pixel ID').optional().or(z.literal('')),
   smtpHost: z.string().optional(),
   smtpPort: z.number().int().min(1).max(65535, 'Port must be between 1 and 65535').optional(),
   smtpUser: z.string().optional(),
   smtpPassword: z.string().optional(),
   smtpSecure: z.boolean().optional(),
   fromEmail: z.string().email('Invalid email').optional(),
   fromName: z.string().optional(),
   emailNotificationsEnabled: z.boolean().optional(),
   newUserNotifications: z.boolean().optional(),
   orderNotifications: z.boolean().optional(),
   commissionNotifications: z.boolean().optional(),
   payoutNotifications: z.boolean().optional(),
   systemNotifications: z.boolean().optional(),
   metaTitle: z.string().max(60, 'Meta title must be 60 characters or less').optional(),
   metaDescription: z.string().max(160, 'Meta description must be 160 characters or less').optional(),
   metaKeywords: z.string().max(255, 'Meta keywords must be 255 characters or less').optional(),
   ogTitle: z.string().max(60, 'Open Graph title must be 60 characters or less').optional(),
   ogDescription: z.string().max(160, 'Open Graph description must be 160 characters or less').optional(),
   ogImageUrl: z.string().url('Invalid URL for Open Graph image').optional(),
   // Platform configuration
   taxRates: z.any().optional(),
   shippingZones: z.any().optional(),
   paymentMethods: z.any().optional(),
   stripePublishableKey: z.string().optional(),
   stripeSecretKey: z.string().optional(),
   imageKitPublicKey: z.string().optional(),
   imageKitPrivateKey: z.string().optional(),
   imageKitUrlEndpoint: z.string().optional(),
   // Content
   homepageBanner: z.string().optional(),
   promotionalBanners: z.any().optional(),
   policyPages: z.any().optional(),
   // Commission settings
   globalCommissionRate: z.number().min(0).max(100).optional(),
   categoryCommissionRates: z.record(z.string(), z.number().min(0).max(100)).optional(),
});

// Toggle store schema for POST /api/admin/toggle-store
export const toggleStoreSchema = z.object({
  storeId: z.string().min(1, 'Store ID is required'),
});

// Cart schema for POST /api/cart
export const cartSchema = z.any(); // JSON object, validate structure if needed

// Coupon verify schema for POST /api/coupon
export const couponVerifySchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

// Order schema for POST /api/orders
export const orderSchema = z.object({
  addressId: z.string().min(1, 'Address ID is required'),
  items: z.array(z.object({
    id: z.string().min(1, 'Product ID is required'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  })).min(1, 'At least one item is required'),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(['COD', 'STRIPE'], 'Invalid payment method'),
});

// Rating schema for POST /api/rating
export const ratingSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  review: z.string().min(1, 'Review is required'),
});

// Store data query for GET /api/store/data
export const storeDataQuerySchema = z.object({
  username: z.string().min(1, 'Username is required'),
});

// AI schema for POST /api/store/ai
export const aiSchema = z.object({
  base64Image: z.string().min(1, 'Base64 image is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
});

// Store create schema for POST /api/store/create (form data)
export const storeCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(1, 'Username is required'),
  description: z.string().min(1, 'Description is required'),
  email: z.string().email('Invalid email'),
  contact: z.string().min(1, 'Contact is required'),
  address: z.string().min(1, 'Address is required'),
  // image is file, validated separately
});

// Store order update schema for POST /api/store/orders
export const storeOrderUpdateSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  status: z.enum(['ORDER_PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED'], 'Invalid status'),
});

// Product schema for POST /api/store/product (form data)
export const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  mrp: z.number().min(0, 'MRP must be positive'),
  price: z.number().min(0, 'Price must be positive'),
  category: z.string().min(1, 'Category is required'),
  // images are files, validated separately
});

// Stock toggle schema for POST /api/store/stock-toggle
export const stockToggleSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

// Bulk upload schema for POST /api/store/product/bulk-upload
export const bulkUploadSchema = z.object({
  // CSV file validation handled separately
});

// Product status update schema for PATCH /api/store/product/[id]/status
export const productStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'FLAGGED', 'OUT_OF_STOCK', 'DRAFT', 'ARCHIVED', 'DELETED'], 'Invalid status'),
});

// Product stock update schema for PATCH /api/store/product/[id]/stock
export const productStockSchema = z.object({
  stock: z.number().min(0, 'Stock must be non-negative'),
});

// Bulk status update schema for POST /api/store/product/bulk-status
export const bulkStatusSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1, 'At least one product ID required'),
  status: z.enum(['ACTIVE', 'FLAGGED', 'OUT_OF_STOCK', 'DRAFT', 'ARCHIVED', 'DELETED'], 'Invalid status'),
});

// Bulk stock update schema for POST /api/store/product/bulk-stock
export const bulkStockSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1, 'At least one product ID required'),
  stockChange: z.number().int('Stock change must be an integer'),
});

// Enhanced product schema with new fields
export const enhancedProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  mrp: z.number().min(0, 'MRP must be positive'),
  price: z.number().min(0, 'Price must be positive'),
  basePrice: z.number().min(0, 'Base price must be positive').optional(),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
  sku: z.string().optional(),
  stock: z.number().min(0, 'Stock must be non-negative').optional(),
  reservedStock: z.number().min(0, 'Reserved stock must be non-negative').optional(),
  lowStockThreshold: z.number().min(0, 'Low stock threshold must be non-negative').optional(),
  costPrice: z.number().min(0, 'Cost price must be positive').optional(),
  weight: z.number().min(0, 'Weight must be positive').optional(),
  dimensions: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    height: z.number().min(0),
    unit: z.string()
  }).optional(),
  seoTitle: z.string().max(60, 'SEO title must be 60 characters or less').optional(),
  seoDescription: z.string().max(160, 'SEO description must be 160 characters or less').optional(),
  seoKeywords: z.array(z.string()).optional(),
  isDigital: z.boolean().optional(),
  digitalFileUrl: z.string().url().optional(),
  hasVariants: z.boolean().optional(),
  promotionType: z.enum(['none', 'percentage', 'fixed', 'buy_x_get_y', 'bundle', 'quantity_discount', 'flash_deal']).optional(),
  promotionValue: z.number().min(0).optional(),
  promotionStart: z.string().datetime().optional().or(z.literal('')),
  promotionEnd: z.string().datetime().optional().or(z.literal('')),
  scheduledPriceChanges: z.array(z.object({
    price: z.number().min(0),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional()
  })).optional(),
  // images and variants validated separately
});

// Upload schema for POST /api/upload (form data)
export const uploadSchema = z.object({
  // file and folder validated separately
});

// URL param schemas
export const idParamSchema = z.string().min(1, 'ID is required');

// Search query schema for GET /api/search
export const searchQuerySchema = z.object({
  q: z.string().optional(), // keyword search
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  rating: z.number().min(1).max(5).optional(),
  store: z.string().optional(), // store username
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(['price_asc', 'price_desc', 'rating', 'newest', 'popularity', 'relevance']).optional().default('newest'),
});

// Query param schemas
export const codeQuerySchema = z.object({
  code: z.string().min(1, 'Code is required'),
});