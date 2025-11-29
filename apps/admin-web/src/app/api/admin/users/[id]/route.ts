import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || 'http://localhost:3003';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/users/[id] - Get single user detail (admin view)
 * Server-side proxy to internal auth-service API
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const includeOrders = searchParams.get('includeOrders') === 'true';

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
    // Fetch user detail
    const userResponse = await fetch(
      `${AUTH_SERVICE_URL}/api/v1/internal/users/${id}`,
      {
        headers: {
          'X-API-Key': INTERNAL_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      return NextResponse.json(errorData, { status: userResponse.status });
    }

    const userData = await userResponse.json();

    // Optionally fetch user's orders
    if (includeOrders) {
      try {
        const ordersResponse = await fetch(
          `${ORDER_SERVICE_URL}/api/v1/internal/users/${id}/orders`,
          {
            headers: {
              'X-API-Key': INTERNAL_API_KEY,
              'Content-Type': 'application/json',
            },
          }
        );

        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          return NextResponse.json({
            data: {
              ...userData.data,
              orders: ordersData.data,
            },
          });
        }
      } catch (ordersError) {
        // Log but don't fail if orders fetch fails
        console.error(`[API Route] Error fetching orders for user ${id}:`, ordersError);
      }
    }

    return NextResponse.json(userData, { status: userResponse.status });
  } catch (error) {
    console.error(`[API Route] Error fetching user ${id}:`, error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user detail',
        },
      },
      { status: 500 }
    );
  }
}
