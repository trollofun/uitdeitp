/**
 * API Route: Get Station Config for Kiosk
 *
 * GET /api/kiosk/station/[station_slug]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStationConfig } from '@/lib/kiosk/getStationConfig';

export async function GET(
  request: NextRequest,
  { params }: { params: { station_slug: string } }
) {
  try {
    const station = await getStationConfig(params.station_slug);

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found or kiosk disabled' },
        { status: 404 }
      );
    }

    return NextResponse.json(station);
  } catch (error) {
    console.error('Station config API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
