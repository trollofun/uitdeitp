import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    const supabase = createServerClient();

    // Test database connection
    const { error: dbError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1)
      .single();

    const responseTime = Date.now() - startTime;

    if (dbError && dbError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine for health check
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          checks: {
            database: 'failed',
            error: dbError.message,
          },
          responseTime: `${responseTime}ms`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      checks: {
        database: 'ok',
        api: 'ok',
      },
      responseTime: `${responseTime}ms`,
      uptime: process.uptime(),
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        responseTime: `${responseTime}ms`,
      },
      { status: 503 }
    );
  }
}
