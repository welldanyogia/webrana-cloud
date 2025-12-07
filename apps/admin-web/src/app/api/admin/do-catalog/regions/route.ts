import { NextResponse } from 'next/server';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';

/**
 * GET /api/admin/do-catalog/regions - Get all DO regions
 */
export async function GET() {
  if (!INTERNAL_API_KEY) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_API_KEY_NOT_CONFIGURED', message: 'Server configuration error' } },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${ORDER_SERVICE_URL}/api/v1/internal/do-accounts/catalog/regions`,
      {
        headers: {
          'X-API-Key': INTERNAL_API_KEY,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 300 },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Route] Error fetching DO regions:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch DO regions' } },
      { status: 500 }
    );
  }
}
