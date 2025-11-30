import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || 'http://localhost:3003';

/**
 * GET /api/admin/do-accounts - List all DO accounts
 * Server-side proxy to internal order-service API
 */
export async function GET() {
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
      `${ORDER_SERVICE_URL}/api/v1/internal/do-accounts`,
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
    console.error('[API Route] Error fetching DO accounts:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch DO accounts',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/do-accounts - Create a new DO account
 * Server-side proxy to internal order-service API
 */
export async function POST(request: NextRequest) {
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
      `${ORDER_SERVICE_URL}/api/v1/internal/do-accounts`,
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
    console.error('[API Route] Error creating DO account:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create DO account',
        },
      },
      { status: 500 }
    );
  }
}
