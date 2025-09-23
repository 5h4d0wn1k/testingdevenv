import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import requestLogger from "@/lib/middleware/requestLogger";

export const GET = requestLogger(async (request) => {
  try {
    // Basic health check - could add DB check, etc.
    logger.info('Health check requested');

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    logger.logError('Health check failed', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
});