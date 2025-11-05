import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import axios from 'axios';
import https from 'https';

export async function GET() {
  try {
    // Create axios instance with SSL support and complete browser headers
    const response = await axios.get('https://act.place', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // For development - bypasses SSL verification
      }),
      timeout: 10000, // 10 second timeout
    });

    const html = response.data;
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
