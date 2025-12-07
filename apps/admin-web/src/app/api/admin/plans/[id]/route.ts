import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3002';

/**
 * GET /api/admin/plans/:id - Get plan by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!INTERNAL_API_KEY) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_API_KEY_NOT_CONFIGURED', message: 'Server configuration error' } },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${CATALOG_SERVICE_URL}/api/v1/admin/catalog/plans/${id}`,
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
    console.error('[API Route] Error fetching plan:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch plan' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/plans/:id - Update plan
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!INTERNAL_API_KEY) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_API_KEY_NOT_CONFIGURED', message: 'Server configuration error' } },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(
      `${CATALOG_SERVICE_URL}/api/v1/admin/catalog/plans/${id}`,
      {
        method: 'PATCH',
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
    console.error('[API Route] Error updating plan:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update plan' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/plans/:id - Delete plan
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!INTERNAL_API_KEY) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_API_KEY_NOT_CONFIGURED', message: 'Server configuration error' } },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${CATALOG_SERVICE_URL}/api/v1/admin/catalog/plans/${id}`,
      {
        method: 'DELETE',
        headers: {
          'X-API-Key': INTERNAL_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Route] Error deleting plan:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete plan' } },
      { status: 500 }
    );
  }
}
