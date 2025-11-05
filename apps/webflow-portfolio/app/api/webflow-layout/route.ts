import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET() {
  try {
    const response = await fetch('https://act.place', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract navigation
    const nav = $('nav').first();
    const navHtml = nav.length > 0 ? $.html(nav) : '';

    // Extract footer
    const footer = $('footer').first();
    const footerHtml = footer.length > 0 ? $.html(footer) : '';

    // Extract CSS links
    const cssLinks: string[] = [];
    $('link[rel="stylesheet"]').each((_, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        cssLinks.push(href);
      }
    });

    return NextResponse.json({
      nav: navHtml,
      footer: footerHtml,
      css: cssLinks,
    });
  } catch (error) {
    console.error('Error fetching Webflow layout:', error);
    return NextResponse.json(
      { error: 'Failed to fetch layout', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
