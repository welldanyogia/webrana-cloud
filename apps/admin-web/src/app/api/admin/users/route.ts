import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

/**
 * GET /api/admin/users - List all users (admin view)
 * Server-side proxy to internal auth-service API
 */
export async function GET(request: NextRequest) {
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
    const searchParams = request.nextUrl.searchParams;

    const response = await fetch(
      `${AUTH_SERVICE_URL}/api/v1/internal/users?${searchParams.toString()}`,
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
    console.error('[API Route] Error fetching users:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch users',
        },
      },
      { status: 500 }
    );
  }
}
