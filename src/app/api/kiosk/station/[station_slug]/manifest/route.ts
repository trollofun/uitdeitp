import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Dynamic Web App Manifest Generator
 *
 * Generates station-specific PWA manifest with custom branding
 * URL: /api/kiosk/station/{station-slug}/manifest
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { station_slug: string } }
) {
  const slug = params.station_slug;

  try {
    const supabase = createServerClient();

    // Fetch station configuration
    const { data: station, error } = await supabase
      .from('kiosk_stations')
      .select('id, slug, name, primary_color, logo_url, is_active')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !station) {
      return NextResponse.json(
        { error: 'Station not found or inactive' },
        { status: 404 }
      );
    }

    // Build manifest with station branding
    const manifest = {
      name: `uitdeITP Kiosk - ${station.name}`,
      short_name: 'uitdeITP Kiosk',
      description: `Înregistrare automată reminder ITP la ${station.name}`,
      start_url: `/kiosk/${slug}?source=pwa`,
      display: 'fullscreen', // Fullscreen for immersive kiosk experience
      background_color: '#ffffff',
      theme_color: station.primary_color || '#3B82F6',
      orientation: 'any', // Allow rotation but optimize for landscape
      scope: `/kiosk/${slug}/`,
      icons: [
        {
          src: station.logo_url || '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: station.logo_url || '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: station.logo_url || '/icons/apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png',
          purpose: 'any'
        }
      ],
      categories: ['business', 'productivity'],
      prefer_related_applications: false,
      related_applications: [],
      // PWA features
      display_override: ['fullscreen', 'standalone', 'minimal-ui'],
      // Shortcuts for quick actions (Android only)
      shortcuts: [
        {
          name: 'Înregistrare ITP',
          short_name: 'ITP',
          description: 'Adaugă reminder ITP rapid',
          url: `/kiosk/${slug}?action=register`,
          icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
        }
      ]
    };

    // Return manifest with proper headers
    return new NextResponse(JSON.stringify(manifest, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('[Manifest API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate manifest' },
      { status: 500 }
    );
  }
}
