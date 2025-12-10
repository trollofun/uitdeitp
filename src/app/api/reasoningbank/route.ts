import { NextRequest, NextResponse } from 'next/server';
import { getReasoningBank } from '@/lib/reasoningbank/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const query = searchParams.get('query') || '';
    const domain = searchParams.get('domain') || undefined;
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0.7');
    const limit = parseInt(searchParams.get('limit') || '10');

    const rb = getReasoningBank();

    switch (action) {
      case 'search':
        const patterns = rb.queryPatterns(query, { domain, minConfidence, limit });
        return NextResponse.json({ success: true, data: patterns });

      case 'automotive':
        const automotivePatterns = rb.getAutomotivePatterns(query);
        return NextResponse.json({ success: true, data: automotivePatterns });

      case 'kiosk':
        const kioskPatterns = rb.getKioskPatterns();
        return NextResponse.json({ success: true, data: kioskPatterns });

      case 'notifications':
        const notificationPatterns = rb.getNotificationPatterns();
        return NextResponse.json({ success: true, data: notificationPatterns });

      case 'stats':
        const stats = rb.getStats();
        return NextResponse.json({ success: true, data: stats });

      case 'domains':
        const domainStats = rb.getStats();
        return NextResponse.json({ success: true, data: domainStats.domainCounts });

      case 'suggestions':
        const context = searchParams.get('context') || '';
        const suggestions = rb.getSuggestions(context, domain);
        return NextResponse.json({ success: true, data: suggestions });

      default:
        // Default to search
        const defaultPatterns = rb.queryPatterns(query, { domain, minConfidence, limit });
        return NextResponse.json({ success: true, data: defaultPatterns });
    }
  } catch (error) {
    console.error('ReasoningBank API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, pattern } = body;

    const rb = getReasoningBank();

    switch (action) {
      case 'add':
        if (!pattern) {
          return NextResponse.json(
            { success: false, error: 'Pattern data required' },
            { status: 400 }
          );
        }

        const newPattern = rb.addPattern({
          description: pattern.description,
          context: pattern.context,
          success_rate: pattern.success_rate || 0.7,
          confidence: pattern.confidence || 0.7,
          domain: pattern.domain,
          tags: pattern.tags,
          parent_id: pattern.parent_id
        });

        return NextResponse.json({ success: true, data: newPattern });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('ReasoningBank API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}