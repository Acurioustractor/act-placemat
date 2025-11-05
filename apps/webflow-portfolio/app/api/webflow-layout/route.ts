import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://act.place', {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // Extract nav and footer
    const navMatch = html.match(/<nav[^>]*>[\s\S]*?<\/nav>/i);
    const footerMatch = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/i);

    // Extract CSS links
    const cssLinks = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/gi)]
      .map(match => match[0]);

    return NextResponse.json({
      nav: navMatch ? navMatch[0] : '',
      footer: footerMatch ? footerMatch[0] : '',
      css: cssLinks,
    });
  } catch (error) {
    console.error('Error fetching Webflow layout:', error);
    return NextResponse.json(
      { error: 'Failed to fetch layout' },
      { status: 500 }
    );
  }
}
