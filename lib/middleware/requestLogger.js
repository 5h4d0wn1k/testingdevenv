import logger from '../logger.js';
import { randomUUID } from 'crypto';

const requestLogger = (handler) => {
  return async (request, context) => {
    const startTime = Date.now();
    const requestId = randomUUID();
    const method = request.method;
    const url = request.url;

    // Extract userId if available (assuming from Clerk or similar)
    let userId = null;
    try {
      const { auth } = require('@clerk/nextjs');
      const { userId: uid } = auth();
      userId = uid;
    } catch (e) {
      // Ignore if auth not available
    }

    logger.info('Request Start', {
      requestId,
      method,
      url,
      userId,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    try {
      const response = await handler(request, context);
      const duration = Date.now() - startTime;
      const statusCode = response.status || 200;

      logger.logRequest(method, url, statusCode, duration, userId, requestId);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.logError('Request Error', error, {
        requestId,
        method,
        url,
        userId,
        duration,
      });

      throw error;
    }
  };
};

export default requestLogger;