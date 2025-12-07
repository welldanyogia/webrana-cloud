import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3002';

/**
 * GET /api/admin/plans - List all plans
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
      `${CATALOG_SERVICE_URL}/api/v1/admin/catalog/plans`,
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
    console.error('[API Route] Error fetching plans:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch plans' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/plans - Create a new plan
 */
export async function POST(request: NextRequest) {
  if (!INTERNAL_API_KEY) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_API_KEY_NOT_CONFIGURED', message: 'Server configuration error' } },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(
      `${CATALOG_SERVICE_URL}/api/v1/admin/catalog/plans`,
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
    console.error('[API Route] Error creating plan:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create plan' } },
      { status: 500 }
    );
  }
}
