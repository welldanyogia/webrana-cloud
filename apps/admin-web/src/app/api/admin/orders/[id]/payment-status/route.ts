import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || 'http://localhost:3003';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/orders/[id]/payment-status - Update order payment status
 * Server-side proxy to internal order-service API
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const body = await request.json();

    const response = await fetch(
      `${ORDER_SERVICE_URL}/api/v1/internal/orders/${id}/payment-status`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': INTERNAL_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`[API Route] Error updating payment status for ${id}:`, error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update payment status',
        },
      },
      { status: 500 }
    );
  }
}
