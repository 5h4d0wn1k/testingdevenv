import prisma from './prisma';

// Define permissions
export const PERMISSIONS = {
  // Order permissions
  ORDER_CREATE: 'order:create',
  ORDER_READ: 'order:read',
  ORDER_UPDATE: 'order:update',
  ORDER_DELETE: 'order:delete',
  ORDER_READ_ALL: 'order:read_all',

  // Shipment permissions
  SHIPMENT_CREATE: 'shipment:create',
  SHIPMENT_READ: 'shipment:read',
  SHIPMENT_UPDATE: 'shipment:update',

  // Return permissions
  RETURN_CREATE: 'return:create',
  RETURN_READ: 'return:read',
  RETURN_UPDATE: 'return:update',

  // Refund permissions
  REFUND_CREATE: 'refund:create',
  REFUND_READ: 'refund:read',
  REFUND_UPDATE: 'refund:update',

  // Financial permissions
  FINANCIAL_READ: 'financial:read',
  PAYOUT_READ: 'payout:read',
  PAYOUT_CREATE: 'payout:create',
  STATEMENT_READ: 'statement:read',
  TAX_READ: 'tax:read',
  TAX_CREATE: 'tax:create',

  // Admin permissions
  ADMIN_READ_ALL: 'admin:read_all',
  ADMIN_UPDATE_ALL: 'admin:update_all'
};

// Role-based permissions mapping
const ROLE_PERMISSIONS = {
  USER: [
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.RETURN_CREATE,
    PERMISSIONS.RETURN_READ
  ],
  SELLER: [
    PERMISSIONS.ORDER_READ, // Can read their own orders
    PERMISSIONS.ORDER_UPDATE, // Can update order status
    PERMISSIONS.SHIPMENT_CREATE,
    PERMISSIONS.SHIPMENT_READ,
    PERMISSIONS.SHIPMENT_UPDATE,
    PERMISSIONS.RETURN_READ,
    PERMISSIONS.RETURN_UPDATE,
    PERMISSIONS.REFUND_READ,
    PERMISSIONS.REFUND_UPDATE,
    // Financial permissions
    PERMISSIONS.FINANCIAL_READ,
    PERMISSIONS.PAYOUT_READ,
    PERMISSIONS.PAYOUT_CREATE,
    PERMISSIONS.STATEMENT_READ,
    PERMISSIONS.TAX_READ,
    PERMISSIONS.TAX_CREATE
  ],
  ADMIN: [
    PERMISSIONS.ORDER_READ_ALL,
    PERMISSIONS.ORDER_UPDATE,
    PERMISSIONS.ADMIN_READ_ALL,
    PERMISSIONS.ADMIN_UPDATE_ALL,
    PERMISSIONS.SHIPMENT_READ,
    PERMISSIONS.RETURN_READ,
    PERMISSIONS.RETURN_UPDATE,
    PERMISSIONS.REFUND_READ,
    PERMISSIONS.REFUND_UPDATE
  ],
  STAFF: [
    PERMISSIONS.ORDER_READ_ALL,
    PERMISSIONS.ORDER_UPDATE,
    PERMISSIONS.ADMIN_READ_ALL,
    PERMISSIONS.SHIPMENT_READ,
    PERMISSIONS.RETURN_READ,
    PERMISSIONS.RETURN_UPDATE,
    PERMISSIONS.REFUND_READ,
    PERMISSIONS.REFUND_UPDATE
  ]
};

// Check if user has permission
export async function hasPermission(userId, permission, context = {}) {
  try {
    // Get user role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return false;
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] || [];

    // Check if user has the required permission
    if (!userPermissions.includes(permission)) {
      return false;
    }

    // Additional context-based checks
    return await checkContextPermission(userId, permission, context);
  } catch (error) {
    console.error('RBAC permission check error:', error);
    return false;
  }
}

// Context-specific permission checks
async function checkContextPermission(userId, permission, context) {
  const { orderId, storeId, resourceOwnerId } = context;

  switch (permission) {
    case PERMISSIONS.ORDER_READ:
    case PERMISSIONS.ORDER_UPDATE:
      if (orderId) {
        // Check if user owns the order or is the seller
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { userId: true, storeId: true }
        });

        if (!order) return false;

        // User owns the order
        if (order.userId === userId) return true;

        // Seller owns the store
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { store: true }
        });

        return user?.store?.id === order.storeId;
      }
      return true;

    case PERMISSIONS.SHIPMENT_CREATE:
    case PERMISSIONS.SHIPMENT_READ:
    case PERMISSIONS.SHIPMENT_UPDATE:
      if (orderId) {
        // Check if user is the seller for this order
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { storeId: true }
        });

        if (!order) return false;

        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { store: true }
        });

        return user?.store?.id === order.storeId;
      }
      return true;

    case PERMISSIONS.RETURN_READ:
    case PERMISSIONS.RETURN_UPDATE:
      if (orderId) {
        // Check if user owns the order or is the seller
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { userId: true, storeId: true }
        });

        if (!order) return false;

        if (order.userId === userId) return true;

        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { store: true }
        });

        return user?.store?.id === order.storeId;
      }
      return true;

    default:
      return true;
  }
}

// Middleware function for API routes
export function requirePermission(permission) {
  return async (request, context = {}) => {
    try {
      const { getAuth } = await import('@clerk/nextjs/server');
      const { userId } = getAuth(request);

      if (!userId) {
        return { error: 'Unauthorized', status: 401 };
      }

      const hasPerm = await hasPermission(userId, permission, context);
      if (!hasPerm) {
        return { error: 'Forbidden', status: 403 };
      }

      return { userId };
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return { error: 'Internal server error', status: 500 };
    }
  };
}

// Get user permissions
export async function getUserPermissions(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    return ROLE_PERMISSIONS[user?.role] || [];
  } catch (error) {
    console.error('Get user permissions error:', error);
    return [];
  }
}