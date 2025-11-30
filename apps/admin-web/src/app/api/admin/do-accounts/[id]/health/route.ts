import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || 'http://localhost:3003';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/do-accounts/[id]/health - Health check for single DO account
 * Server-side proxy to internal order-service API
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;

    const response = await fetch(
      `${ORDER_SERVICE_URL}/api/v1/internal/do-accounts/${id}/health`,
      {
        headers: {
          'X-API-Key': INTERNAL_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Route] Error checking DO account health:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check DO account health',
        },
      },
      { status: 500 }
    );
  }
}
