import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || 'http://localhost:3003';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/orders/[id] - Get single order detail (admin view)
 * Server-side proxy to internal order-service API
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

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
      `${ORDER_SERVICE_URL}/api/v1/internal/orders/${id}`,
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
    console.error(`[API Route] Error fetching order ${id}:`, error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch order detail',
        },
      },
      { status: 500 }
    );
  }
}
