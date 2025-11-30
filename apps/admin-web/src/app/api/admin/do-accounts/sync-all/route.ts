import { NextResponse } from 'next/server';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || 'http://localhost:3003';

/**
 * POST /api/admin/do-accounts/sync-all - Sync all DO accounts
 * Server-side proxy to internal order-service API
 */
export async function POST() {
  if (!INTERNAL_API_KEY) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_API_KEY_NOT_CONFIGURED',
          message: 'Server configuration error',
        },
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${ORDER_SERVICE_URL}/api/v1/internal/do-accounts/sync-all`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': INTERNAL_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Route] Error syncing all DO accounts:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync all DO accounts',
        },
      },
      { status: 500 }
    );
  }
}
